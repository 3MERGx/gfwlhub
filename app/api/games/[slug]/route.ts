import { NextResponse } from "next/server";
import { getGFWLDatabase } from "@/lib/mongodb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const db = await getGFWLDatabase();
    const gamesCollection = db.collection("Games");
    
    const game = await gamesCollection.findOne({ slug });
    
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
    
    return NextResponse.json(formattedGame);
  } catch (error) {
    console.error("Error fetching game:", error);
    return NextResponse.json(
      { error: "Failed to fetch game" },
      { status: 500 }
    );
  }
}

