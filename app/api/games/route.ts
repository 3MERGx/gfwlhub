import { NextResponse } from "next/server";
import { getGFWLDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const db = await getGFWLDatabase();
    const gamesCollection = db.collection("Games");
    
    const games = await gamesCollection.find({}).toArray();
    
    // Convert MongoDB documents to our Game format
    const formattedGames = games.map((game) => ({
      ...game,
      id: game._id.toString(),
    }));
    
    return NextResponse.json(formattedGames);
  } catch (error) {
    console.error("Error fetching games:", error);
    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    );
  }
}

