import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getGameBySlug } from "@/lib/games-service";

// GET - Fetch all game submissions (for reviewers/admins)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getGFWLDatabase();
    const submissionsCollection = db.collection("gameSubmissions");

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const gameSlug = searchParams.get("gameSlug");

    // Build query
    const query: Record<string, unknown> = {};

    // Regular users can only see their own submissions
    // Reviewers and admins can see all submissions
    if (session.user.role === "user") {
      query.submittedBy = session.user.id;
    }

    // Filter by status if provided
    if (status && status !== "all") {
      query.status = status;
    }

    // Filter by game slug if provided
    if (gameSlug) {
      query.gameSlug = gameSlug;
    }

    // Fetch submissions
    const submissions = await submissionsCollection
      .find(query)
      .sort({ submittedAt: -1 })
      .toArray();

    // Transform submissions and include current game data for comparison
    const transformedSubmissions = await Promise.all(
      submissions.map(async (doc) => {
        // Get current game data to compare
        const currentGame = await getGameBySlug(doc.gameSlug);
        
        return {
          id: doc._id.toString(),
          gameSlug: doc.gameSlug,
          gameTitle: doc.gameTitle,
          submittedBy: doc.submittedBy,
          submittedByName: doc.submittedByName,
          submittedAt: doc.submittedAt,
          status: doc.status,
          reviewedBy: doc.reviewedBy,
          reviewedByName: doc.reviewedByName,
          reviewedAt: doc.reviewedAt,
          reviewNotes: doc.reviewNotes,
          proposedData: doc.proposedData,
          submitterNotes: doc.submitterNotes,
          currentGameData: currentGame || null, // Include current game for comparison
        };
      })
    );

    return NextResponse.json(transformedSubmissions);
  } catch (error) {
    console.error("Error fetching game submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch game submissions" },
      { status: 500 }
    );
  }
}

// POST - Create a new game submission
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is allowed to submit
    if (
      session.user.status === "suspended" ||
      session.user.status === "blocked" ||
      session.user.status === "restricted"
    ) {
      return NextResponse.json(
        { error: "Your account is not permitted to submit content" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      gameSlug,
      gameTitle,
      submittedBy,
      submittedByName,
      proposedData,
      submitterNotes,
    } = body;

    // Validate required fields
    if (!gameSlug || !gameTitle || !submittedBy || !submittedByName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate that at least some data was provided
    if (
      !proposedData ||
      Object.keys(proposedData).filter((key) => proposedData[key]).length === 0
    ) {
      return NextResponse.json(
        { error: "Please provide at least one field of game data" },
        { status: 400 }
      );
    }

    // Validate submittedBy is a valid ObjectId
    if (!submittedBy || !ObjectId.isValid(submittedBy)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const db = await getGFWLDatabase();
    const submissionsCollection = db.collection("gameSubmissions");
    const usersCollection = db.collection("users");

    // Create submission
    const submission = {
      gameSlug,
      gameTitle,
      submittedBy,
      submittedByName,
      submittedAt: new Date(),
      status: "pending",
      proposedData,
      submitterNotes,
    };

    const result = await submissionsCollection.insertOne(submission);

    // Update user's submission count
    await usersCollection.updateOne(
      { _id: new ObjectId(submittedBy) },
      { $inc: { submissionsCount: 1 } }
    );

    return NextResponse.json({
      success: true,
      submissionId: result.insertedId.toString(),
    });
  } catch (error) {
    console.error("Error creating game submission:", error);
    return NextResponse.json(
      { error: "Failed to create game submission" },
      { status: 500 }
    );
  }
}

