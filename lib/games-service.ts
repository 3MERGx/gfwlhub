import { getGFWLDatabase } from "./mongodb";
import { Game, games as staticGames } from "@/data/games";
import { sanitizeString } from "@/lib/security";

function overlayStaticDefaults(mongoGame: Game): Game {
  const staticGame = staticGames.find((game) => game.slug === mongoGame.slug);
  if (!staticGame) {
    return mongoGame;
  }

  const merged: Game = { ...mongoGame };
  for (const [key, value] of Object.entries(staticGame) as [keyof Game, Game[keyof Game]][]) {
    if (key === "id" || value === undefined) {
      continue;
    }
    if (merged[key] === undefined || merged[key] === null) {
      (merged[key] as Game[keyof Game]) = value;
    }
  }
  return merged;
}

export async function getAllGames(): Promise<Game[]> {
  const db = await getGFWLDatabase();
  const gamesCollection = db.collection("Games");
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const games: any[] = await gamesCollection.find({}).toArray();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return games.map((game: any) => {
    const { _id, ...rest } = game;
    return overlayStaticDefaults({
      ...rest,
      id: _id.toString(),
    } as Game);
  });
}

export async function getGameBySlug(slug: string): Promise<Game | null> {
  const sanitizedSlug = sanitizeString(slug, 200);
  if (!sanitizedSlug) {
    return null;
  }

  const db = await getGFWLDatabase();
  const gamesCollection = db.collection("Games");
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const game: any = await gamesCollection.findOne({ slug: sanitizedSlug });
  
  if (!game) {
    return null;
  }
  
  const { _id, ...rest } = game;
  return overlayStaticDefaults({
    ...rest,
    id: _id.toString(),
  } as Game);
}

