import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getAllGames } from "@/lib/games-service";
import { getGFWLDatabase } from "@/lib/mongodb";
import { safeLog, rateLimiters, getClientIdentifier } from "@/lib/security";

// GET - Fetch all games with management data (admin only)
export async function GET(request: Request) {
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

    // Only admins can access this endpoint
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all games from the games service
    const games = await getAllGames();

    // Get submission counts from MongoDB
    const db = await getGFWLDatabase();
    const submissionsCollection = db.collection("gameSubmissions");

    // Count pending submissions per game
    const submissionCounts = await submissionsCollection
      .aggregate([
        { $match: { status: "pending" } },
        { $group: { _id: "$gameSlug", count: { $sum: 1 } } },
      ])
      .toArray();

    // Create a map of game slug to submission count
    const countsMap = new Map(
      submissionCounts.map((item) => [item._id, item.count])
    );

    // Add submission counts to games
    const gamesWithCounts = games.map((game) => ({
      slug: game.slug,
      title: game.title,
      status: game.status,
      activationType: game.activationType,
      featureEnabled: game.featureEnabled || false,
      submissionCount: countsMap.get(game.slug) || 0,
      // Include fields needed for minimum check
      description: game.description,
      releaseDate: game.releaseDate,
      developer: game.developer,
      publisher: game.publisher,
      genres: game.genres,
      platforms: game.platforms,
      imageUrl: game.imageUrl,
    }));

    // Sort by title
    gamesWithCounts.sort((a, b) => a.title.localeCompare(b.title));

    return NextResponse.json(
      gamesWithCounts,
      {
        headers: {
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    safeLog.error("Error fetching games for management:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

