import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { notifyGameSubmissionReviewed } from "@/lib/discord-webhook";

// PATCH - Review a game submission (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // Only reviewers and admins can review submissions
    if (
      !session ||
      (session.user.role !== "reviewer" && session.user.role !== "admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, reviewNotes } = body;

    // Validate status
    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const db = await getGFWLDatabase();
    const submissionsCollection = db.collection("gameSubmissions");
    const usersCollection = db.collection("users");
    const gamesCollection = db.collection("Games"); // Use capital G to match games-service

    // Get submission
    const submission = await submissionsCollection.findOne({
      _id: new ObjectId(id),
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
      process.env.DEVELOPER_EMAILS?.split(",").map((email) => email.trim()) || [];
    const isDeveloper = session.user.email && adminEmails.includes(session.user.email);
    
    if (submission.submittedBy === session.user.id && !isDeveloper) {
      return NextResponse.json(
        { 
          error: "You cannot review your own submissions. This prevents abuse of the approval system." 
        },
        { status: 403 }
      );
    }

    // Update submission
    await submissionsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          reviewedBy: session.user.id,
          reviewedByName: session.user.name || "Unknown",
          reviewedAt: new Date(),
          reviewNotes: reviewNotes || undefined,
        },
      }
    );

    // If approved, update user's approved count
    if (status === "approved") {
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
      const existingGame = await gamesCollection.findOne({ slug: submission.gameSlug });
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
        if (submission.submittedBy && ObjectId.isValid(submission.submittedBy)) {
          const submitter = await usersCollection.findOne({
            _id: new ObjectId(submission.submittedBy),
          });
          submitterName = submitter?.name || submission.submittedByName || "Unknown";
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
          notes: reviewNotes,
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
    if (status === "rejected") {
      // Validate submittedBy is a valid ObjectId before using it
      if (submission.submittedBy && ObjectId.isValid(submission.submittedBy)) {
        await usersCollection.updateOne(
          { _id: new ObjectId(submission.submittedBy) },
          { $inc: { rejectedCount: 1 } }
        );
      } else {
        console.warn(
          `Invalid submittedBy for submission ${id}: ${submission.submittedBy}`
        );
      }
    }

    // Send Discord notification (non-blocking)
    notifyGameSubmissionReviewed({
      id,
      gameTitle: submission.gameTitle,
      gameSlug: submission.gameSlug,
      submittedByName: submission.submittedByName,
      status: status as "approved" | "rejected",
      reviewedByName: session.user.name || "Unknown",
      reviewNotes: reviewNotes || undefined,
    }).catch((error) => {
      console.error("Failed to send Discord notification:", error);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error reviewing game submission:", error);
    return NextResponse.json(
      { error: "Failed to review submission" },
      { status: 500 }
    );
  }
}

