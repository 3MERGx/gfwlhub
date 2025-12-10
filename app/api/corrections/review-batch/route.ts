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
import { notifyCorrectionsReviewedBatch } from "@/lib/discord-webhook";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { validateCSRFToken } from "@/lib/csrf";
import { ObjectId } from "mongodb";

// POST - Batch review multiple corrections
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
    
    const { reviews } = body;

    // Validate reviews array
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return NextResponse.json(
        { error: "Reviews array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Process all reviews
    const processedCorrections: Array<{
      id: string;
      gameTitle: string;
      gameSlug: string;
      field: string;
      submittedByName: string;
      status: "approved" | "rejected" | "modified";
      reviewedByName: string;
      reviewNotes?: string;
      finalValue?: unknown;
    }> = [];

    const db = await getGFWLDatabase();
    const correctionsCollection = db.collection("corrections");

    // Get all corrections first to check for shared webhook message IDs
    interface ReviewRequest {
      correctionId: string;
      status: string;
      reviewNotes?: string;
      finalValue?: unknown;
    }
    
    const correctionIds = reviews
      .map((r: ReviewRequest) => sanitizeString(String(r.correctionId || ""), 50))
      .filter(Boolean);
    const allCorrections = await correctionsCollection
      .find({ _id: { $in: correctionIds.map((id: string) => new ObjectId(id)) } })
      .toArray();

    // Check if corrections share the same webhook (batched together)
    // If they have the same discordMessageIds, they were batched in submission
    let sharedMessageIds: (string | null)[] | null = null;
    if (allCorrections.length > 0) {
      const firstMessageIds = allCorrections[0].discordMessageIds as string[] | undefined;
      if (firstMessageIds && Array.isArray(firstMessageIds) && firstMessageIds.length > 0) {
        // Check if all corrections have the same message IDs (batched together)
        const allShareSameIds = allCorrections.every((c) => {
          const cIds = c.discordMessageIds as string[] | undefined;
          if (!cIds || !Array.isArray(cIds) || cIds.length !== firstMessageIds.length) {
            return false;
          }
          return cIds.every((id: string, idx: number) => id === firstMessageIds[idx]);
        });
        
        if (allShareSameIds) {
          sharedMessageIds = firstMessageIds.filter((id): id is string => typeof id === "string" && id.length > 0);
        }
      }
    }

    // Process each review
    for (const review of reviews as ReviewRequest[]) {
      const { correctionId, status, reviewNotes, finalValue } = review;

      // Sanitize and validate inputs
      const sanitizedCorrectionId = sanitizeString(String(correctionId || ""), 50);
      const sanitizedStatus = sanitizeString(String(status || ""), 50);
      const sanitizedReviewNotes = reviewNotes ? sanitizeString(String(reviewNotes), 2000) : undefined;

      // Validate required fields
      if (!sanitizedCorrectionId || !sanitizedStatus) {
        safeLog.warn(`Skipping review with missing fields: ${JSON.stringify(review)}`);
        continue;
      }

      // Validate status
      if (!["approved", "rejected", "modified"].includes(sanitizedStatus)) {
        safeLog.warn(`Skipping review with invalid status: ${sanitizedStatus}`);
        continue;
      }

      // Get the correction
      const correction = await getCorrectionById(sanitizedCorrectionId);
      if (!correction) {
        safeLog.warn(`Correction not found: ${sanitizedCorrectionId}`);
        continue;
      }

      // Check if already reviewed
      if (correction.status !== "pending") {
        safeLog.warn(`Correction already reviewed: ${sanitizedCorrectionId}`);
        continue;
      }

      // Prevent self-approval abuse
      const adminEmails =
        process.env.DEVELOPER_EMAILS?.split(",").map((email) => email.trim()) || [];
      const isDeveloper = user.email && adminEmails.includes(user.email);
      
      if (correction.submittedBy === user.id && !isDeveloper) {
        safeLog.warn(`Self-approval prevented: ${sanitizedCorrectionId}`);
        continue;
      }

      // Sanitize finalValue if it's a string
      let sanitizedFinalValue: string | number | boolean | string[] | null | undefined = undefined;
      if (finalValue !== undefined && finalValue !== null) {
        if (typeof finalValue === "string") {
          sanitizedFinalValue = sanitizeString(finalValue, 5000);
        } else if (typeof finalValue === "number" || typeof finalValue === "boolean") {
          sanitizedFinalValue = finalValue;
        } else if (Array.isArray(finalValue)) {
          sanitizedFinalValue = finalValue.map((item) => 
            typeof item === "string" ? sanitizeString(item, 500) : item
          ) as string[];
        }
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
          safeLog.error("Failed to log reviewer action:", error);
        });
      }

      // Get updated correction for Discord notification
      const updatedCorrection = await getCorrectionById(sanitizedCorrectionId);
      if (updatedCorrection) {
        processedCorrections.push({
          id: updatedCorrection.id,
          gameTitle: updatedCorrection.gameTitle,
          gameSlug: updatedCorrection.gameSlug,
          field: updatedCorrection.field,
          submittedByName: updatedCorrection.submittedByName,
          status: updatedCorrection.status as "approved" | "rejected" | "modified",
          reviewedByName: updatedCorrection.reviewedByName || user.name,
          reviewNotes: updatedCorrection.reviewNotes,
          finalValue: updatedCorrection.finalValue,
        });
      }

      // If approved or modified, apply the change to the game
      if (sanitizedStatus === "approved" || sanitizedStatus === "modified") {
        const valueToApply =
          sanitizedStatus === "modified" ? sanitizedFinalValue : correction.newValue;

        try {
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

          // Build update operation
          const isClearing = 
            valueToApply === null || 
            valueToApply === "" || 
            (Array.isArray(valueToApply) && valueToApply.length === 0);

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
            updateOperation.$unset = { [correction.field]: "" };
          } else {
            updateOperation.$set[correction.field] = valueToApply;
          }

          await gamesCollection.updateOne(
            { _id: new ObjectId(correction.gameId) },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            updateOperation as any
          );

          // Create audit log
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
          }).catch((error) => {
            safeLog.error("Failed to create audit log:", error);
          });
        } catch (error) {
          safeLog.error(`Failed to apply correction ${sanitizedCorrectionId} to game:`, error);
        }
      }

      // Update user stats
      if (sanitizedStatus === "approved") {
        const usersCollection = db.collection("users");
        if (ObjectId.isValid(correction.submittedBy)) {
          await usersCollection.updateOne(
            { _id: new ObjectId(correction.submittedBy) },
            { $inc: { approvedCount: 1 } }
          );
        }
      } else if (sanitizedStatus === "rejected") {
        const usersCollection = db.collection("users");
        if (ObjectId.isValid(correction.submittedBy)) {
          await usersCollection.updateOne(
            { _id: new ObjectId(correction.submittedBy) },
            { $inc: { rejectedCount: 1 } }
          );
        }
      }
    }

    // Send batch Discord notification (non-blocking)
    if (processedCorrections.length > 0) {
      notifyCorrectionsReviewedBatch(processedCorrections, sharedMessageIds).catch((error) => {
        safeLog.error("Failed to send Discord notification:", error);
      });
    }

    // Revalidate paths
    revalidatePath("/dashboard/submissions");
    revalidatePath("/");

    return NextResponse.json({ 
      success: true, 
      processed: processedCorrections.length,
      total: reviews.length 
    });
  } catch (error) {
    safeLog.error("Error batch reviewing corrections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

