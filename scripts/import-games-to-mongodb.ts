/**
 * Import Games to MongoDB
 *
 * This script imports all game data from data/games.ts into MongoDB
 * Run with: npx tsx scripts/import-games-to-mongodb.ts
 */

import { MongoClient } from "mongodb";
import { games } from "../data/games";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  console.error("❌ Error: MONGODB_URI not found in environment variables");
  console.error("Please add MONGODB_URI to your .env.local file");
  process.exit(1);
}

async function importGames() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("🔗 Connecting to MongoDB...");
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("GFWL");
    const gamesCollection = db.collection("Games");
    console.log(`📦 Using database: GFWL, collection: Games`);

    // Check if collection already has data
    const existingCount = await gamesCollection.countDocuments();

    if (existingCount > 0) {
      console.log(
        `\n⚠️  Warning: Games collection already has ${existingCount} documents`
      );
      console.log("Do you want to:");
      console.log("1. Skip import (keep existing data)");
      console.log("2. Clear and re-import (DELETE existing data)");
      console.log("3. Update existing + add new");

      // For this script, we'll default to option 3 (upsert)
      console.log("\n📝 Using option 3: Update existing + add new");
    }

    console.log(`\n📊 Importing ${games.length} games...`);

    let imported = 0;
    let updated = 0;
    let skipped = 0;

    for (const game of games) {
      try {
        // Use slug as unique identifier
        const result = await gamesCollection.updateOne(
          { slug: game.slug },
          {
            $set: {
              ...game,
              updatedAt: new Date(),
            },
            $setOnInsert: {
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );

        if (result.upsertedCount > 0) {
          imported++;
          console.log(`  ✅ Imported: ${game.title}`);
        } else if (result.modifiedCount > 0) {
          updated++;
          console.log(`  🔄 Updated: ${game.title}`);
        } else {
          skipped++;
          console.log(`  ⏭️  Skipped (no changes): ${game.title}`);
        }
      } catch (error) {
        console.error(`  ❌ Error importing ${game.title}:`, error);
      }
    }

    console.log("\n📈 Import Summary:");
    console.log(`  ✅ Imported: ${imported} new games`);
    console.log(`  🔄 Updated: ${updated} existing games`);
    console.log(`  ⏭️  Skipped: ${skipped} unchanged games`);
    console.log(
      `  📊 Total in collection: ${await gamesCollection.countDocuments()}`
    );

    // Create indexes for better performance
    console.log("\n🔧 Creating indexes...");
    await gamesCollection.createIndex({ slug: 1 }, { unique: true });
    await gamesCollection.createIndex({ title: 1 });
    await gamesCollection.createIndex({ activationType: 1 });
    await gamesCollection.createIndex({ status: 1 });
    await gamesCollection.createIndex({ featureEnabled: 1 });
    console.log("✅ Indexes created");

    console.log("\n🎉 Import completed successfully!");
  } catch (error) {
    console.error("\n❌ Error during import:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the import
importGames().catch(console.error);
