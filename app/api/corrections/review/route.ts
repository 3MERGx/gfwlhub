import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  reviewCorrection,
  getCorrectionById,
  canReviewCorrections,
  getUserByEmail,
  createAuditLog,
} from "@/lib/crowdsource-service-mongodb";
import { getGFWLDatabase } from "@/lib/mongodb";
import { CorrectionStatus } from "@/types/crowdsource";
import { notifyCorrectionReviewed } from "@/lib/discord-webhook";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { validateCSRFToken } from "@/lib/csrf";

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
          // Use $unset to remove the field
          updateOperation.$unset = {
            [correction.field]: "",
          };
        } else {
          // Use $set to update the field
          updateOperation.$set[correction.field] = valueToApply;
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

        // Create audit log entry
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
          // Include submitter information
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

    // Revalidate paths
    revalidatePath("/dashboard/submissions");
    revalidatePath(`/games/${correction.gameSlug}`);
    revalidatePath("/");

    return NextResponse.json({ success: true });
  } catch (error) {
    safeLog.error("Error reviewing correction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

