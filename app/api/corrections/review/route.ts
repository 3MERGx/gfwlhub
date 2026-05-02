import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  reviewCorrection,
  getCorrectionById,
  canReviewCorrections,
  getUserByEmail,
  createAuditLog,
  logReviewerAction,
} from "@/lib/crowdsource-service-mongodb";
import { getGFWLDatabase } from "@/lib/mongodb";
import { CorrectionStatus } from "@/types/crowdsource";
import { notifyCorrectionReviewed } from "@/lib/discord-webhook";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { revalidateGameDerivedPaths } from "@/lib/revalidate-game-derived-paths";
import { triggerPusherEvent, PUSHER_EVENTS } from "@/lib/pusher-server";
import { validateCSRFToken } from "@/lib/csrf";
import { validateDownloadLinkMatchesVirusTotalGui } from "@/lib/virustotal-download-consistency";

// POST - Review a correction (approve, reject, or modify)
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const session = await getServerSession(authOptions);
    const identifier = getClientIdentifier(request, session?.user?.id);
    if (!rateLimiters.admin.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await getUserByEmail(session.user.email!);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user can review corrections
    if (!canReviewCorrections(user)) {
      return NextResponse.json(
        { error: "You do not have permission to review corrections" },
        { status: 403 }
      );
    }

    // CSRF protection
    const body = await request.json();
    const csrfToken = request.headers.get("X-CSRF-Token") || body._csrf;
    if (!(await validateCSRFToken(csrfToken))) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 }
      );
    }
    
    // Remove CSRF token from body if present
    delete body._csrf;
    
    const { correctionId, status, reviewNotes, finalValue } = body;

    // Sanitize and validate inputs
    const sanitizedCorrectionId = sanitizeString(String(correctionId || ""), 50);
    const sanitizedStatus = sanitizeString(String(status || ""), 50);
    const sanitizedReviewNotes = reviewNotes ? sanitizeString(String(reviewNotes), 2000) : undefined;

    // Validate required fields
    if (!sanitizedCorrectionId || !sanitizedStatus) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate status
    if (!["approved", "rejected", "modified"].includes(sanitizedStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get the correction
    const correction = await getCorrectionById(sanitizedCorrectionId);
    if (!correction) {
      return NextResponse.json(
        { error: "Correction not found" },
        { status: 404 }
      );
    }

    // Check if already reviewed
    if (correction.status !== "pending") {
      return NextResponse.json(
        { error: "Correction has already been reviewed" },
        { status: 400 }
      );
    }

    // Prevent self-approval abuse: reviewers cannot approve their own submissions
    // Exception: Developers (from DEVELOPER_EMAIL env var) can approve their own submissions
    const adminEmails =
      process.env.DEVELOPER_EMAILS?.split(",").map((email) => email.trim()) || [];
    const isDeveloper = user.email && adminEmails.includes(user.email);
    
    if (correction.submittedBy === user.id && !isDeveloper) {
      return NextResponse.json(
        { 
          error: "You cannot review your own submissions. This prevents abuse of the approval system." 
        },
        { status: 403 }
      );
    }

    // Sanitize finalValue if it's a string
    let sanitizedFinalValue = finalValue;
    if (typeof finalValue === "string") {
      sanitizedFinalValue = sanitizeString(finalValue, 5000);
    } else if (Array.isArray(finalValue)) {
      sanitizedFinalValue = finalValue.map((item) => 
        typeof item === "string" ? sanitizeString(item, 500) : item
      );
    }

    // Review the correction
    await reviewCorrection(
      sanitizedCorrectionId,
      user.id,
      user.name,
      sanitizedStatus as CorrectionStatus,
      sanitizedReviewNotes,
      sanitizedFinalValue
    );

    // Log reviewer action (only for approve/reject, not modified)
    if (sanitizedStatus === "approved" || sanitizedStatus === "rejected") {
      await logReviewerAction(
        user.id,
        user.name,
        sanitizedCorrectionId,
        sanitizedStatus === "approved" ? "approve" : "reject"
      ).catch((error) => {
        // Non-blocking - log error but don't fail the request
        safeLog.error("Failed to log reviewer action:", error);
      });
    }

    // Get updated correction for Discord notification
    const updatedCorrection = await getCorrectionById(sanitizedCorrectionId);

    // Send Discord notification (non-blocking)
    if (updatedCorrection) {
      notifyCorrectionReviewed({
        id: updatedCorrection.id,
        gameTitle: updatedCorrection.gameTitle,
        gameSlug: updatedCorrection.gameSlug,
        field: updatedCorrection.field,
        submittedByName: updatedCorrection.submittedByName,
        status: updatedCorrection.status as "approved" | "rejected" | "modified",
        reviewedByName: updatedCorrection.reviewedByName || user.name,
        reviewNotes: updatedCorrection.reviewNotes,
        finalValue: updatedCorrection.finalValue,
      }).catch((error) => {
        safeLog.error("Failed to send Discord notification:", error);
      });
    }

    // If approved or modified, apply the change to the game
    if (sanitizedStatus === "approved" || sanitizedStatus === "modified") {
      const valueToApply =
        sanitizedStatus === "modified" ? sanitizedFinalValue : correction.newValue;

      try {
        const db = await getGFWLDatabase();
        const gamesCollection = db.collection("Games");

        // Generate update ID (timestamp-based)
        const updateId = `${Date.now()}-${correction.id}`;
        
        // Create update history entry
        const updateHistoryEntry = {
          updateId,
          timestamp: new Date(),
          submitter: {
            id: correction.submittedBy,
            name: correction.submittedByName,
          },
          reviewer: {
            id: user.id,
            name: user.name,
          },
          field: correction.field,
          updateType: "correction" as const,
          notes: sanitizedReviewNotes || (valueToApply === null || valueToApply === "" ? "Field cleared" : undefined),
        };

        // Build update operation - use $unset if clearing, $set if setting
        // Check if we're clearing the field (null, empty string, or empty array)
        const isClearing = 
          valueToApply === null || 
          valueToApply === "" || 
          (Array.isArray(valueToApply) && valueToApply.length === 0);

        // Build the update operation with proper MongoDB types
        const updateOperation: {
          $set: Record<string, unknown>;
          $push: { updateHistory: typeof updateHistoryEntry };
          $unset?: Record<string, string>;
        } = {
          $set: {
            updatedAt: new Date(),
          },
          $push: {
            updateHistory: updateHistoryEntry,
          },
        };

        if (isClearing) {
          updateOperation.$unset = {
            [correction.field]: "",
            ...(correction.field === "downloadLink"
              ? { virusTotalUrl: "" }
              : {}),
          };
        } else {
          updateOperation.$set[correction.field] = valueToApply;
        }

        let effectiveAutoVt = correction.autoVirusTotalUrl;
        if (
          correction.field === "downloadLink" &&
          !isClearing &&
          typeof valueToApply === "string"
        ) {
          const appliedTrim = valueToApply.trim();
          if (/^https?:\/\//i.test(appliedTrim)) {
            const apiKey = process.env.VIRUSTOTAL_API_KEY;
            const submittedTrim = String(correction.newValue ?? "").trim();
            const mustRefreshVt =
              sanitizedStatus === "modified" && appliedTrim !== submittedTrim;
            if (apiKey && (mustRefreshVt || !effectiveAutoVt)) {
              const vtIdentifier = getClientIdentifier(
                request,
                session.user.id
              );
              if (!rateLimiters.virusTotal.isAllowed(vtIdentifier)) {
                return NextResponse.json(
                  {
                    error:
                      "Too many VirusTotal scans in a short period. Try again in a minute.",
                  },
                  { status: 429 }
                );
              }
              const { resolveVirusTotalGuiUrlForDownloadLink } = await import(
                "@/lib/virustotal-resolve-download-scan"
              );
              const resolved = await resolveVirusTotalGuiUrlForDownloadLink(
                appliedTrim,
                apiKey
              );
              if (!resolved.ok) {
                return NextResponse.json(
                  { error: resolved.error },
                  { status: 422 }
                );
              }
              effectiveAutoVt = resolved.guiUrl;
            }
          }
        }

        if (
          correction.field === "downloadLink" &&
          !isClearing &&
          effectiveAutoVt
        ) {
          updateOperation.$set.virusTotalUrl = effectiveAutoVt;
        }

        const existingGame = await gamesCollection.findOne({
          slug: correction.gameSlug,
        });
        if (!existingGame) {
          return NextResponse.json({ error: "Game not found" }, { status: 404 });
        }

        let mergedDownload = existingGame.downloadLink as string | undefined;
        let mergedVt = existingGame.virusTotalUrl as string | undefined;
        if (correction.field === "downloadLink") {
          mergedDownload = isClearing
            ? undefined
            : typeof valueToApply === "string"
              ? valueToApply
              : String(valueToApply ?? "");
          if (!isClearing && effectiveAutoVt) {
            mergedVt = effectiveAutoVt;
          }
        }
        if (correction.field === "virusTotalUrl") {
          mergedVt = isClearing
            ? undefined
            : typeof valueToApply === "string"
              ? valueToApply
              : String(valueToApply ?? "");
        }

        const vtConsistency = validateDownloadLinkMatchesVirusTotalGui(
          mergedDownload,
          mergedVt
        );
        if (!vtConsistency.ok) {
          return NextResponse.json(
            { error: vtConsistency.message },
            { status: 400 }
          );
        }
        if ("warning" in vtConsistency && vtConsistency.warning) {
          safeLog.warn(
            `[VT consistency] ${correction.gameSlug}: ${vtConsistency.warning}`
          );
        }

        // Update the game document with field change and update history
        const updateResult = await gamesCollection.updateOne(
          { slug: correction.gameSlug },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          updateOperation as any
        );

        if (updateResult.matchedCount === 0) {
          return NextResponse.json(
            { error: "Game not found" },
            { status: 404 }
          );
        }

        // Create audit log entry (applied)
        await createAuditLog({
          gameId: correction.gameId,
          gameSlug: correction.gameSlug,
          gameTitle: correction.gameTitle,
          field: correction.field,
          oldValue: correction.oldValue,
          newValue: valueToApply,
          changedBy: user.id,
          changedByName: user.name,
          changedByRole: user.role,
          correctionId: correction.id,
          notes: sanitizedReviewNotes,
          submittedBy: correction.submittedBy,
          submittedByName: correction.submittedByName,
        });
      } catch (error) {
        safeLog.error("Error applying correction to game:", error);
        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 }
        );
      }
    } else if (sanitizedStatus === "rejected") {
      // Log rejected correction to audit log
      await createAuditLog({
        gameId: correction.gameId,
        gameSlug: correction.gameSlug,
        gameTitle: correction.gameTitle,
        field: correction.field,
        oldValue: correction.newValue,
        newValue: null,
        changedBy: user.id,
        changedByName: user.name,
        changedByRole: user.role,
        correctionId: correction.id,
        notes: sanitizedReviewNotes
          ? `Rejected. ${sanitizedReviewNotes}`
          : "Rejected.",
        outcome: "rejected",
        submittedBy: correction.submittedBy,
        submittedByName: correction.submittedByName,
      }).catch((error) => {
        safeLog.error("Failed to create audit log for rejected correction:", error);
      });
    }

    // Revalidate paths
    revalidatePath("/dashboard/submissions");
    if (sanitizedStatus === "approved" || sanitizedStatus === "modified") {
      revalidateGameDerivedPaths(correction.gameSlug);
    }

    triggerPusherEvent(PUSHER_EVENTS.SUBMISSIONS_UPDATED);
    triggerPusherEvent(PUSHER_EVENTS.GAME_UPDATED, { slug: correction.gameSlug });

    return NextResponse.json({ success: true });
  } catch (error) {
    safeLog.error("Error reviewing correction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

