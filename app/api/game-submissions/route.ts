import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getGameBySlug } from "@/lib/games-service";
import { notifyGameSubmissionSubmitted } from "@/lib/discord-webhook";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { revalidatePath } from "next/cache";

// GET - Fetch all game submissions (for reviewers/admins)
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const session = await getServerSession(authOptions);
    const identifier = getClientIdentifier(request, session?.user?.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getGFWLDatabase();
    const submissionsCollection = db.collection("gameSubmissions");

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = sanitizeString(searchParams.get("status") || "", 50);
    const gameSlug = sanitizeString(searchParams.get("gameSlug") || "", 200);

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

    const usersCollection = db.collection("users");

    // Transform submissions and include current game data for comparison
    const transformedSubmissions = await Promise.all(
      submissions.map(async (doc) => {
        // Get current game data to compare
        const currentGame = await getGameBySlug(doc.gameSlug);
        
        // Get published by user name if game is published
        let publishedByName = null;
        if (currentGame?.publishedBy && ObjectId.isValid(currentGame.publishedBy)) {
          const publisher = await usersCollection.findOne({
            _id: new ObjectId(currentGame.publishedBy),
          });
          publishedByName = publisher?.name || null;
        }
        
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
          publishedByName: publishedByName,
          publishedAt: currentGame?.publishedAt || null,
        };
      })
    );

    return NextResponse.json(
      transformedSubmissions,
      {
        headers: {
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    safeLog.error("Error fetching game submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new game submission
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const session = await getServerSession(authOptions);
    const identifier = getClientIdentifier(request, session?.user?.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

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

    // Sanitize and validate inputs
    const sanitizedGameSlug = sanitizeString(String(gameSlug || ""), 200);
    const sanitizedGameTitle = sanitizeString(String(gameTitle || ""), 500);
    const sanitizedSubmittedBy = sanitizeString(String(submittedBy || ""), 50);
    const sanitizedSubmittedByName = sanitizeString(String(submittedByName || ""), 200);
    const sanitizedSubmitterNotes = submitterNotes ? sanitizeString(String(submitterNotes), 2000) : undefined;

    // Validate required fields
    if (!sanitizedGameSlug || !sanitizedGameTitle || !sanitizedSubmittedBy || !sanitizedSubmittedByName) {
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
    if (!sanitizedSubmittedBy || !ObjectId.isValid(sanitizedSubmittedBy)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    // Sanitize proposedData
    const sanitizedProposedData: Record<string, unknown> = {};
    if (proposedData && typeof proposedData === "object") {
      for (const [key, value] of Object.entries(proposedData)) {
        if (typeof value === "string") {
          sanitizedProposedData[sanitizeString(key, 100)] = sanitizeString(value, 5000);
        } else if (Array.isArray(value)) {
          sanitizedProposedData[sanitizeString(key, 100)] = value.map((item) => 
            typeof item === "string" ? sanitizeString(item, 500) : item
          );
        } else {
          sanitizedProposedData[sanitizeString(key, 100)] = value;
        }
      }
    }

    const db = await getGFWLDatabase();
    const submissionsCollection = db.collection("gameSubmissions");
    const usersCollection = db.collection("users");

    // Create submission
    const submission = {
      gameSlug: sanitizedGameSlug,
      gameTitle: sanitizedGameTitle,
      submittedBy: sanitizedSubmittedBy,
      submittedByName: sanitizedSubmittedByName,
      submittedAt: new Date(),
      status: "pending",
      proposedData: sanitizedProposedData,
      submitterNotes: sanitizedSubmitterNotes,
    };

    const result = await submissionsCollection.insertOne(submission);

    // Update user's submission count
    await usersCollection.updateOne(
      { _id: new ObjectId(sanitizedSubmittedBy) },
      { $inc: { submissionsCount: 1 } }
    );

    const submissionId = result.insertedId.toString();

    // Send Discord notification (non-blocking)
    notifyGameSubmissionSubmitted({
      id: submissionId,
      gameTitle: sanitizedGameTitle,
      gameSlug: sanitizedGameSlug,
      submittedByName: sanitizedSubmittedByName,
      proposedData: sanitizedProposedData,
      submitterNotes: sanitizedSubmitterNotes,
    }).catch((error) => {
      safeLog.error("Failed to send Discord notification:", error);
    });

    // Revalidate paths
    revalidatePath("/dashboard/game-submissions");
    revalidatePath(`/games/${sanitizedGameSlug}`);
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      submissionId,
    });
  } catch (error) {
    safeLog.error("Error creating game submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

