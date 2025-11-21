import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";

// POST - Publish/enable a game (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // Only admins can publish games
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Check if game has minimum required fields
    const hasRequiredFields = 
      game.title && 
      game.releaseDate && 
      game.developer && 
      game.publisher;

    if (!hasRequiredFields) {
      return NextResponse.json(
        { error: "Game does not have the minimum required fields to be published" },
        { status: 400 }
      );
    }

    // Update game to set featureEnabled to true
    await gamesCollection.updateOne(
      { slug },
      {
        $set: {
          featureEnabled: true,
          publishedAt: new Date(),
          publishedBy: session.user.id,
        },
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error publishing game:", error);
    return NextResponse.json(
      { error: "Failed to publish game" },
      { status: 500 }
    );
  }
}

