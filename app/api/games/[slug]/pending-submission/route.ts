import { NextRequest, NextResponse } from "next/server";
import { getGFWLDatabase } from "@/lib/mongodb";

// GET - Check if there's a pending submission for a game
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const db = await getGFWLDatabase();
    const submissionsCollection = db.collection("gameSubmissions");

    // Check for pending submissions for this game
    const pendingSubmission = await submissionsCollection.findOne({
      gameSlug: slug,
      status: "pending",
    });

    if (pendingSubmission) {
      return NextResponse.json({
        hasPendingSubmission: true,
        submittedByName: pendingSubmission.submittedByName,
        submittedAt: pendingSubmission.submittedAt,
        proposedData: pendingSubmission.proposedData,
      });
    }

    return NextResponse.json({
      hasPendingSubmission: false,
    });
  } catch (error) {
    console.error("Error checking pending submission:", error);
    return NextResponse.json(
      { error: "Failed to check pending submission" },
      { status: 500 }
    );
  }
}

