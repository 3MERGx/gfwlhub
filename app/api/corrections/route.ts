import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  createCorrection,
  getPendingCorrections,
  getAllCorrections,
  canSubmitCorrections,
  getUserByEmail,
} from "@/lib/crowdsource-service-mongodb";

// POST - Submit a new correction
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

    // Check if user can submit corrections
    if (!canSubmitCorrections(user)) {
      return NextResponse.json(
        { 
          error: "Your account is suspended or blocked",
          userStatus: user.status,
          userId: user.id 
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      gameId,
      gameSlug,
      gameTitle,
      field,
      oldValue,
      newValue,
      reason,
    } = body;

    // Validate required fields
    if (
      !gameId ||
      !gameSlug ||
      !gameTitle ||
      !field ||
      reason === undefined ||
      reason === null ||
      reason.trim() === ""
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate newValue based on field type
    // Required fields (title, status, activationType) cannot be null/empty
    const requiredFields = ["title", "status", "activationType"];
    if (requiredFields.includes(field)) {
      if (newValue === undefined || newValue === null || newValue === "") {
        return NextResponse.json(
          { error: `Field "${field}" is required and cannot be cleared` },
          { status: 400 }
        );
      }
    }
    // For optional fields, null is allowed (to clear the field)
    // but newValue must be explicitly provided (not undefined)
    else if (newValue === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create correction
    const correction = await createCorrection({
      gameId,
      gameSlug,
      gameTitle,
      submittedBy: user.id,
      submittedByName: user.name,
      field,
      oldValue: oldValue === undefined ? null : oldValue,
      newValue,
      reason,
    });

    return NextResponse.json({ correction }, { status: 201 });
  } catch (error) {
    console.error("Error submitting correction:", error);
    return NextResponse.json(
      { error: "Failed to submit correction" },
      { status: 500 }
    );
  }
}

// GET - Fetch corrections (with optional filters)
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const gameSlug = searchParams.get("gameSlug");
    const userId = searchParams.get("userId");

    // Only reviewers and admins can see all corrections
    // Regular users can only see their own
    if (user.role === "user") {
      // Fetch user's own corrections
      const { getCorrectionsByUser } = await import(
        "@/lib/crowdsource-service-mongodb"
      );
      const corrections = await getCorrectionsByUser(user.id);
      return NextResponse.json({ corrections });
    }

    // For reviewers and admins, handle filtering
    if (status === "pending") {
      const corrections = await getPendingCorrections();
      return NextResponse.json({ corrections });
    }

    if (gameSlug) {
      const { getCorrectionsByGame } = await import(
        "@/lib/crowdsource-service-mongodb"
      );
      const corrections = await getCorrectionsByGame(gameSlug);
      return NextResponse.json({ corrections });
    }

    if (userId) {
      const { getCorrectionsByUser } = await import(
        "@/lib/crowdsource-service-mongodb"
      );
      const corrections = await getCorrectionsByUser(userId);
      return NextResponse.json({ corrections });
    }

    // Return all corrections by default for reviewers/admins (for stats and full view)
    const corrections = await getAllCorrections();
    return NextResponse.json({ corrections });
  } catch (error) {
    console.error("Error fetching corrections:", error);
    return NextResponse.json(
      { error: "Failed to fetch corrections" },
      { status: 500 }
    );
  }
}

