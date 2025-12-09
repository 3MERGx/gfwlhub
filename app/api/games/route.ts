import { NextResponse } from "next/server";
import { getGFWLDatabase } from "@/lib/mongodb";
import { safeLog, rateLimiters, getClientIdentifier } from "@/lib/security";

// Use shorter cache time to ensure new games appear quickly
export const revalidate = 300; // Revalidate every 5 minutes

// Force dynamic rendering since we use request.headers for rate limiting
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(request);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const db = await getGFWLDatabase();
    const gamesCollection = db.collection("Games");
    
    const games = await gamesCollection.find({}).toArray();
    
    // Convert MongoDB documents to our Game format
    const formattedGames = games.map((game) => ({
      ...game,
      id: game._id.toString(),
    }));
    
    return NextResponse.json(
      formattedGames,
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    safeLog.error("Error fetching games:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

