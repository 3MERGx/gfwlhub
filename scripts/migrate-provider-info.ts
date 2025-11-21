/**
 * Migration script to convert separate provider fields to providerInfo object
 * 
 * Run with: npx tsx scripts/migrate-provider-info.ts
 */

import { MongoClient, ObjectId } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI environment variable is required");
  process.exit(1);
}

async function migrate() {
  const client = new MongoClient(MONGODB_URI as string);

  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("GFWL");
    const usersCollection = db.collection("users");

    // Find all users with old provider structure
    const users = await usersCollection
      .find({
        $or: [
          { provider: { $exists: true } },
          { providerAccountId: { $exists: true } },
          { providerType: { $exists: true } },
        ],
      })
      .toArray();

    console.log(`📊 Found ${users.length} users to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const user of users) {
      // Skip if already migrated
      if (user.providerInfo) {
        skipped++;
        continue;
      }

      // Create providerInfo object from old fields
      const providerInfo: any = {};
      
      if (user.provider) {
        providerInfo.provider = user.provider;
      }
      if (user.providerAccountId) {
        providerInfo.providerAccountId = user.providerAccountId;
      }
      if (user.providerType) {
        providerInfo.type = user.providerType;
      }

      // Only update if we have provider info
      if (Object.keys(providerInfo).length > 0) {
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: { providerInfo },
            $unset: {
              provider: "",
              providerAccountId: "",
              providerType: "",
            },
          }
        );
        migrated++;
        console.log(`✅ Migrated user: ${user.email || user.name || user._id}`);
      } else {
        skipped++;
      }
    }

    console.log(`\n📈 Migration complete:`);
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("✅ Disconnected from MongoDB");
  }
}

migrate();

