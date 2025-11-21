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

// POST - Review a correction (approve, reject, or modify)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

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

    const body = await request.json();
    const { correctionId, status, reviewNotes, finalValue } = body;

    // Validate required fields
    if (!correctionId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate status
    if (!["approved", "rejected", "modified"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Get the correction
    const correction = await getCorrectionById(correctionId);
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

    // Review the correction
    await reviewCorrection(
      correctionId,
      user.id,
      user.name,
      status as CorrectionStatus,
      reviewNotes,
      finalValue
    );

    // If approved or modified, apply the change to the game
    if (status === "approved" || status === "modified") {
      const valueToApply =
        status === "modified" ? finalValue : correction.newValue;

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
          notes: reviewNotes || (valueToApply === null || valueToApply === "" ? "Field cleared" : undefined),
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
          notes: reviewNotes,
          // Include submitter information
          submittedBy: correction.submittedBy,
          submittedByName: correction.submittedByName,
        });
      } catch (error) {
        console.error("Error applying correction to game:", error);
        return NextResponse.json(
          { error: "Failed to apply correction to game" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reviewing correction:", error);
    return NextResponse.json(
      { error: "Failed to review correction" },
      { status: 500 }
    );
  }
}

