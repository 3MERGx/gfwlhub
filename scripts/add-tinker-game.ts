/**
 * Script to add Tinker game to the Games collection
 * Run with: npx tsx --env-file=.env.local scripts/add-tinker-game.ts
 * OR: node -r dotenv/config scripts/add-tinker-game.js (after compiling)
 */

// Use require to load dotenv synchronously before any imports
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Now import other modules after env vars are loaded
import { getGFWLDatabase } from "../lib/mongodb";
import { safeLog } from "../lib/security";

async function addTinkerGame() {
  try {
    const db = await getGFWLDatabase();
    const gamesCollection = db.collection("Games");

    // Check if game already exists
    const existingGame = await gamesCollection.findOne({ slug: "tinker" });
    if (existingGame) {
      safeLog.info("Tinker game already exists in the database");
      return;
    }

    // Create the game document
    const game = {
      title: "Tinker",
      slug: "tinker",
      activationType: "Legacy (Per-Title)",
      status: "supported",
      description:
        "Tinker is a puzzle video game where players control a robot through various mazes and obstacle courses. The game was originally released as part of Windows Ultimate Extras on September 23, 2008 exclusively for owners of the Ultimate edition of Windows Vista. An expanded Games for Windows - LIVE version was later made available for free on the Games for Windows Marketplace on December 15, 2009, featuring 160 levels including the tutorial and 15 Achievements worth 200G.",
      releaseDate: "September 23, 2008",
      developer: "Fuel Industries",
      publisher: "Microsoft",
      genres: ["Puzzle"],
      platforms: ["Windows"],
      wikiLink: "https://www.pcgamingwiki.com/wiki/Tinker",
      featureEnabled: false,
      readyToPublish: false,
    };

    // Insert the game
    const result = await gamesCollection.insertOne(game);
    safeLog.info(`Successfully added Tinker game with ID: ${result.insertedId}`);
    console.log("✅ Tinker game added successfully!");
  } catch (error) {
    safeLog.error("Error adding Tinker game:", error);
    console.error("❌ Failed to add Tinker game:", error);
    process.exit(1);
  }
}

// Run the script
addTinkerGame()
  .then(() => {
    console.log("Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

