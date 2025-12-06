import { NextResponse } from "next/server";
import { getGFWLDatabase } from "@/lib/mongodb";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(request);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { slug } = await params;
    const sanitizedSlug = sanitizeString(String(slug || ""), 200);
    
    if (!sanitizedSlug) {
      return NextResponse.json(
        { error: "Invalid game slug" },
        { status: 400 }
      );
    }

    const db = await getGFWLDatabase();
    const gamesCollection = db.collection("Games");
    
    const game = await gamesCollection.findOne({ slug: sanitizedSlug });
    
    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }
    
    // Convert MongoDB document to our Game format
    const formattedGame = {
      ...game,
      id: game._id.toString(),
    };
    
    return NextResponse.json(
      formattedGame,
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    safeLog.error("Error fetching game:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

