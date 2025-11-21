import { NextRequest, NextResponse } from "next/server";
import { getGFWLDatabase } from "@/lib/mongodb";

// GET - Get game status (check if it has required fields and is ready to publish)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const db = await getGFWLDatabase();
    const gamesCollection = db.collection("Games");

    // Get the game
    const game = await gamesCollection.findOne({ slug });

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

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error fetching game status:", error);
    return NextResponse.json(
      { error: "Failed to fetch game status" },
      { status: 500 }
    );
  }
}

