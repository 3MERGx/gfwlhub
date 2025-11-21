import { getGFWLDatabase } from "./mongodb";
import { Game } from "@/data/games";

export async function getAllGames(): Promise<Game[]> {
  const db = await getGFWLDatabase();
  const gamesCollection = db.collection("Games");
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const games: any[] = await gamesCollection.find({}).toArray();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return games.map((game: any) => {
    const { _id, ...rest } = game;
    return {
      ...rest,
      id: _id.toString(),
    } as Game;
  });
}

export async function getGameBySlug(slug: string): Promise<Game | null> {
  const db = await getGFWLDatabase();
  const gamesCollection = db.collection("Games");
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const game: any = await gamesCollection.findOne({ slug });
  
  if (!game) {
    return null;
  }
  
  const { _id, ...rest } = game;
  return {
    ...rest,
    id: _id.toString(),
  } as Game;
}

