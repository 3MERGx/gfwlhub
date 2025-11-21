/**
 * Migrate Playability Status to MongoDB
 *
 * This script updates MongoDB game documents with playability status fields
 * from data/games.ts. Only updates games that have playability fields defined.
 * Run with: npx tsx scripts/migrate-playability-status.ts
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

async function migratePlayabilityStatus() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("🔗 Connecting to MongoDB...");
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("GFWL");
    const gamesCollection = db.collection("Games");
    console.log(`📦 Using database: GFWL, collection: Games`);

    // Filter games that have playability fields
    const gamesWithPlayability = games.filter(
      (game) =>
        game.playabilityStatus ||
        game.communityAlternativeName ||
        game.remasteredName
    );

    console.log(
      `\n📊 Found ${gamesWithPlayability.length} games with playability status fields`
    );

    if (gamesWithPlayability.length === 0) {
      console.log("ℹ️  No games with playability fields found. Exiting.");
      return;
    }

    let updated = 0;
    let notFound = 0;
    let errors = 0;

    for (const game of gamesWithPlayability) {
      try {
        // Build update object with only playability fields
        const updateFields: {
          playabilityStatus?: string;
          communityAlternativeName?: string;
          remasteredName?: string;
          remasteredPlatform?: string;
          updatedAt: Date;
        } = {
          updatedAt: new Date(),
        };

        if (game.playabilityStatus) {
          updateFields.playabilityStatus = game.playabilityStatus;
        }

        if (game.communityAlternativeName) {
          updateFields.communityAlternativeName = game.communityAlternativeName;
        }

        if (game.remasteredName) {
          updateFields.remasteredName = game.remasteredName;
          if (game.remasteredPlatform) {
            updateFields.remasteredPlatform = game.remasteredPlatform;
          }
        }

        // Update the document by slug
        const result = await gamesCollection.updateOne(
          { slug: game.slug },
          {
            $set: updateFields,
          }
        );

        if (result.matchedCount === 0) {
          notFound++;
          console.log(
            `  ⚠️  Not found in MongoDB: ${game.title} (slug: ${game.slug})`
          );
        } else if (result.modifiedCount > 0) {
          updated++;
          console.log(`  ✅ Updated: ${game.title}`);
          if (game.playabilityStatus) {
            console.log(`     └─ Playability Status: ${game.playabilityStatus}`);
          }
          if (game.communityAlternativeName) {
            console.log(
              `     └─ Community Alternative: ${game.communityAlternativeName}`
            );
          }
          if (game.remasteredName) {
            console.log(
              `     └─ Remastered Version: ${game.remasteredName}${game.remasteredPlatform ? ` on ${game.remasteredPlatform}` : ""}`
            );
          }
        } else {
          console.log(`  ⏭️  No changes needed: ${game.title}`);
        }
      } catch (error) {
        errors++;
        console.error(`  ❌ Error updating ${game.title}:`, error);
      }
    }

    console.log("\n📈 Migration Summary:");
    console.log(`  ✅ Updated: ${updated} games`);
    console.log(`  ⚠️  Not found: ${notFound} games`);
    console.log(`  ❌ Errors: ${errors} games`);
    console.log(
      `  📊 Total games in collection: ${await gamesCollection.countDocuments()}`
    );

    console.log("\n🎉 Migration completed successfully!");
  } catch (error) {
    console.error("\n❌ Error during migration:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run the migration
migratePlayabilityStatus().catch(console.error);

