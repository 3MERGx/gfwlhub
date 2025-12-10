import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { notifyGameSubmissionReviewed } from "@/lib/discord-webhook";
import {
  safeLog,
  sanitizeString,
  rateLimiters,
  getClientIdentifier,
} from "@/lib/security";
import { revalidatePath } from "next/cache";
import { validateCSRFToken } from "@/lib/csrf";

// PATCH - Review a game submission (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Only reviewers and admins can review submissions
    if (
      !session ||
      (session.user.role !== "reviewer" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const { id } = await params;
    const { status, reviewNotes } = body;

    // Sanitize and validate inputs
    const sanitizedId = sanitizeString(String(id || ""), 50);
    const sanitizedStatus = sanitizeString(String(status || ""), 50);
    const sanitizedReviewNotes = reviewNotes
      ? sanitizeString(String(reviewNotes), 2000)
      : undefined;

    // Validate status
    if (
      !sanitizedStatus ||
      !["approved", "rejected"].includes(sanitizedStatus)
    ) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Validate ID is a valid ObjectId
    if (!sanitizedId || !ObjectId.isValid(sanitizedId)) {
      return NextResponse.json(
        { error: "Invalid submission ID" },
        { status: 400 }
      );
    }

    const db = await getGFWLDatabase();
    const submissionsCollection = db.collection("gameSubmissions");
    const usersCollection = db.collection("users");
    const gamesCollection = db.collection("Games"); // Use capital G to match games-service

    // Get submission
    const submission = await submissionsCollection.findOne({
      _id: new ObjectId(sanitizedId),
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Prevent self-approval abuse: reviewers cannot approve their own submissions
    // Exception: Developers (from DEVELOPER_EMAIL env var) can approve their own submissions
    const adminEmails =
      process.env.DEVELOPER_EMAILS?.split(",").map((email) => email.trim()) ||
      [];
    const isDeveloper =
      session.user.email && adminEmails.includes(session.user.email);

    if (submission.submittedBy === session.user.id && !isDeveloper) {
      return NextResponse.json(
        {
          error:
            "You cannot review your own submissions. This prevents abuse of the approval system.",
        },
        { status: 403 }
      );
    }

    // Update submission
    await submissionsCollection.updateOne(
      { _id: new ObjectId(sanitizedId) },
      {
        $set: {
          status: sanitizedStatus,
          reviewedBy: session.user.id,
          reviewedByName: session.user.name || "Unknown",
          reviewedAt: new Date(),
          reviewNotes: sanitizedReviewNotes || undefined,
        },
      }
    );

    // If approved, mark other pending submissions for the same game as "superseded"
    // This is a neutral status - it doesn't affect user stats (no rejected count increase)
    // but also doesn't give credit (no approved count increase). It's fair to all parties.
    if (sanitizedStatus === "approved") {
      // Find other pending submissions for the same game
      const otherPendingSubmissions = await submissionsCollection
        .find({
          gameSlug: submission.gameSlug,
          status: "pending",
          _id: { $ne: new ObjectId(sanitizedId) },
        })
        .toArray();

      // Mark them as superseded (neutral status - doesn't affect user stats)
      if (otherPendingSubmissions.length > 0) {
        const otherIds = otherPendingSubmissions.map((s) => s._id);
        await submissionsCollection.updateMany(
          { _id: { $in: otherIds } },
          {
            $set: {
              status: "superseded",
              reviewedBy: session.user.id,
              reviewedByName: session.user.name || "Unknown",
              reviewedAt: new Date(),
              reviewNotes: `Automatically superseded because another submission for ${submission.gameTitle} was approved.`,
            },
          }
        );
        // Note: We intentionally do NOT increment rejectedCount for superseded submissions
        // This is fair - the user isn't being punished, but they also don't get credit
      }
    }

    // If approved, update user's approved count
    if (sanitizedStatus === "approved") {
      // Validate submittedBy is a valid ObjectId before using it
      if (submission.submittedBy && ObjectId.isValid(submission.submittedBy)) {
        await usersCollection.updateOne(
          { _id: new ObjectId(submission.submittedBy) },
          { $inc: { approvedCount: 1 } }
        );
      } else {
        console.warn(
          `Invalid submittedBy for submission ${id}: ${submission.submittedBy}`
        );
      }

      // Update game data in MongoDB if approved
      const proposedData = submission.proposedData;
      const updateData: Record<string, unknown> = {};

      // Map proposed data to game fields
      Object.keys(proposedData).forEach((key) => {
        if (proposedData[key]) {
          updateData[key] = proposedData[key];
        }
      });

      // Check if game has minimum required fields to be published
      // Get existing game data
      const existingGame = await gamesCollection.findOne({
        slug: submission.gameSlug,
      });
      const mergedData = { ...existingGame, ...updateData };
      const hasRequiredFields =
        mergedData.title &&
        mergedData.releaseDate &&
        mergedData.developer &&
        mergedData.publisher;

      // Set readyToPublish flag if game has minimum required fields
      if (hasRequiredFields) {
        updateData.readyToPublish = true;
      }

      if (Object.keys(updateData).length > 0) {
        // Generate update ID (timestamp-based)
        const updateId = `${Date.now()}-${id}`;

        // Get list of fields being updated
        const updatedFields = Object.keys(updateData).filter(
          (key) => key !== "updatedAt"
        );

        // Get submitter info
        let submitterName = "Unknown";
        if (
          submission.submittedBy &&
          ObjectId.isValid(submission.submittedBy)
        ) {
          const submitter = await usersCollection.findOne({
            _id: new ObjectId(submission.submittedBy),
          });
          submitterName =
            submitter?.name || submission.submittedByName || "Unknown";
        } else {
          submitterName = submission.submittedByName || "Unknown";
        }

        // Create update history entry
        const updateHistoryEntry = {
          updateId,
          timestamp: new Date(),
          submitter: {
            id: submission.submittedBy || "",
            name: submitterName,
          },
          reviewer: {
            id: session.user.id,
            name: session.user.name || "Unknown",
          },
          fields: updatedFields,
          updateType: "gameSubmission" as const,
          notes: sanitizedReviewNotes,
        };

        updateData.updatedAt = new Date();
        await gamesCollection.updateOne(
          { slug: submission.gameSlug },
          {
            $set: updateData,
            $push: {
              updateHistory: updateHistoryEntry,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          },
          { upsert: true } // Create if doesn't exist
        );
      }
    }

    // If rejected, update user's rejected count
    if (sanitizedStatus === "rejected") {
      // Validate submittedBy is a valid ObjectId before using it
      if (submission.submittedBy && ObjectId.isValid(submission.submittedBy)) {
        await usersCollection.updateOne(
          { _id: new ObjectId(submission.submittedBy) },
          { $inc: { rejectedCount: 1 } }
        );
      } else {
        safeLog.warn(
          `Invalid submittedBy for submission ${sanitizedId}: ${submission.submittedBy}`
        );
      }
    }

    // Send Discord notification (non-blocking)
    // Update existing webhook messages if message IDs exist, otherwise create new messages
    // Support both old format (single message ID) and new format (array of message IDs)
    let discordMessageIds: string[] | null = null;
    
    // Check for new format (array of message IDs)
    if (submission.discordMessageIds && Array.isArray(submission.discordMessageIds)) {
      // Filter out null/undefined values and ensure we have valid strings
      const validIds = submission.discordMessageIds.filter(
        (id): id is string => typeof id === "string" && id.length > 0
      );
      if (validIds.length > 0) {
        discordMessageIds = validIds;
      }
    }
    
    // Fallback to old format (single message ID)
    if (!discordMessageIds && submission.discordMessageId && typeof submission.discordMessageId === "string") {
      discordMessageIds = [submission.discordMessageId];
    }

    notifyGameSubmissionReviewed(
      {
        id: sanitizedId,
        gameTitle: submission.gameTitle,
        gameSlug: submission.gameSlug,
        submittedByName: submission.submittedByName,
        status: sanitizedStatus as "approved" | "rejected",
        reviewedByName: session.user.name || "Unknown",
        reviewNotes: sanitizedReviewNotes || undefined,
      },
      discordMessageIds
    ).catch((error) => {
      safeLog.error("Failed to send Discord notification:", error);
    });

    // Revalidate paths
    revalidatePath("/dashboard/game-submissions");
    revalidatePath(`/games/${submission.gameSlug}`);
    revalidatePath("/");

    return NextResponse.json({ success: true });
  } catch (error) {
    safeLog.error("Error reviewing game submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
