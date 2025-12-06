import { NextRequest, NextResponse } from "next/server";
import { getGFWLDatabase } from "@/lib/mongodb";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";

// GET - Get game status (check if it has required fields and is ready to publish)
export async function GET(
  request: NextRequest,
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

    // Get the game
    const game = await gamesCollection.findOne({ slug: sanitizedSlug });

    if (!game) {
      return NextResponse.json(
        { error: "Game not found" },
        { status: 404 }
      );
    }

    // Check individual required fields
    const requiredFields = {
      title: !!game.title,
      releaseDate: !!game.releaseDate,
      developer: !!game.developer,
      publisher: !!game.publisher,
    };

    // Check if game has all minimum required fields
    const hasRequiredFields = 
      requiredFields.title && 
      requiredFields.releaseDate && 
      requiredFields.developer && 
      requiredFields.publisher;

    const status = {
      hasRequiredFields,
      requiredFields,
      readyToPublish: game.readyToPublish || false,
      featureEnabled: game.featureEnabled || false,
    };

    return NextResponse.json(
      status,
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    safeLog.error("Error fetching game status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

