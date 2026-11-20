import { NextRequest, NextResponse } from "next/server";
import {
  reviewCorrection,
  getCorrectionById,
  createAuditLog,
  logReviewerAction,
} from "@/lib/crowdsource-service-mongodb";
import { requireReviewer } from "@/lib/api-auth";
import { getGFWLDatabase } from "@/lib/mongodb";
import { CorrectionStatus } from "@/types/crowdsource";
import { isCorrectionField } from "@/lib/mongo-sanitize";
import { notifyCorrectionReviewed } from "@/lib/discord-webhook";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { revalidateGameDerivedPaths } from "@/lib/revalidate-game-derived-paths";
import { triggerPusherEvent, PUSHER_EVENTS } from "@/lib/pusher-server";
import { validateCSRFToken } from "@/lib/csrf";
import { prepareDownloadVirusTotalForCorrection } from "@/lib/apply-download-correction";
import { sanitizeReviewFinalValue } from "@/lib/request-validation";

// POST - Review a correction (approve, reject, or modify)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireReviewer();
    if (!auth.ok) return auth.response;
    const { session, user } = auth;

    const identifier = getClientIdentifier(request, user.id);
    if (!rateLimiters.admin.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
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

    const sanitizedFinalResult = sanitizeReviewFinalValue(finalValue);
    if (!sanitizedFinalResult.ok) {
      return NextResponse.json(
        { error: "Invalid finalValue type" },
        { status: 400 }
      );
    }
    const sanitizedFinalValue = sanitizedFinalResult.value;

    // Apply game changes BEFORE marking the correction reviewed.
    // Otherwise a later validation failure leaves the queue empty with no game update.
    if (sanitizedStatus === "approved" || sanitizedStatus === "modified") {
      const valueToApply =
        sanitizedStatus === "modified"
          ? sanitizedFinalValue
          : correction.newValue;

      try {
        if (!isCorrectionField(correction.field)) {
          return NextResponse.json(
            { error: "Invalid correction field" },
            { status: 400 }
          );
        }

        const db = await getGFWLDatabase();
        const gamesCollection = db.collection("Games");
        const existingGame = await gamesCollection.findOne({
          slug: correction.gameSlug,
        });
        if (!existingGame) {
          return NextResponse.json(
            { error: "Game not found" },
            { status: 404 }
          );
        }

        const isClearing =
          valueToApply === null ||
          valueToApply === "" ||
          (Array.isArray(valueToApply) && valueToApply.length === 0);

        const prepared = await prepareDownloadVirusTotalForCorrection({
          correction,
          valueToApply,
          isClearing,
          status: sanitizedStatus,
          request,
          reviewerId: user.id,
          existingGame: existingGame as Record<string, unknown>,
        });
        if (!prepared.ok) {
          return NextResponse.json(
            { error: prepared.error },
            { status: prepared.status }
          );
        }

        const updateId = `${Date.now()}-${correction.id}`;
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
          notes:
            sanitizedReviewNotes ||
            (isClearing ? "Field cleared" : undefined),
        };

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
            ...(prepared.downloadVtField
              ? { [prepared.downloadVtField]: "" }
              : {}),
          };
        } else {
          updateOperation.$set[correction.field] = valueToApply;
          if (prepared.downloadVtField && prepared.effectiveAutoVt) {
            updateOperation.$set[prepared.downloadVtField] =
              prepared.effectiveAutoVt;
          }
        }

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
    }

    // Mark reviewed only after a successful game apply (or for rejects)
    await reviewCorrection(
      sanitizedCorrectionId,
      user.id,
      user.name,
      sanitizedStatus as CorrectionStatus,
      sanitizedReviewNotes,
      sanitizedFinalValue
    );

    if (sanitizedStatus === "approved" || sanitizedStatus === "rejected") {
      await logReviewerAction(
        user.id,
        user.name,
        sanitizedCorrectionId,
        sanitizedStatus === "approved" ? "approve" : "reject"
      ).catch((error) => {
        safeLog.error("Failed to log reviewer action:", error);
      });
    }

    const updatedCorrection = await getCorrectionById(sanitizedCorrectionId);
    if (updatedCorrection) {
      notifyCorrectionReviewed({
        id: updatedCorrection.id,
        gameTitle: updatedCorrection.gameTitle,
        gameSlug: updatedCorrection.gameSlug,
        field: updatedCorrection.field,
        submittedByName: updatedCorrection.submittedByName,
        status: updatedCorrection.status as
          | "approved"
          | "rejected"
          | "modified",
        reviewedByName: updatedCorrection.reviewedByName || user.name,
        reviewNotes: updatedCorrection.reviewNotes,
        finalValue: updatedCorrection.finalValue,
      }).catch((error) => {
        safeLog.error("Failed to send Discord notification:", error);
      });
    }

    if (sanitizedStatus === "rejected") {
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
        safeLog.error(
          "Failed to create audit log for rejected correction:",
          error
        );
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

