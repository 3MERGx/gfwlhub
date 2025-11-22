/**
 * Import FAQs to MongoDB
 *
 * This script imports all FAQ data from the current FAQ page into MongoDB
 * Run with: npx tsx scripts/import-faqs-to-mongodb.ts
 */

import { MongoClient } from "mongodb";
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

// Current FAQs from the page (converted to plain text/HTML)
const faqItems = [
  {
    question: "I'm having issues with the GFWL Keygen. Where can I get help?",
    answer: `<p>→ Please join the <a href="https://discord.gg/PR75T8xMWS" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">GFWL Hub Discord</a> and ask for assistance there. We will try to help you troubleshoot any issues you encounter with the keygen.</p>`,
    order: 1,
  },
  {
    question: "DirectX Installation",
    answer: `<p>→ Download the DirectX Installer <a href="https://www.microsoft.com/en-us/download/details.aspx?id=35" class="text-blue-500">here</a></p>`,
    order: 2,
  },
  {
    question: 'When will games marked as "Testing" work?',
    answer: `<p>→ When kind folks confirm they have working CD-KEY + PCID pairs for that specific game. If you can help — contact me below.</p>`,
    order: 3,
  },
  {
    question: "What is PCID and how does GFWL activation work?",
    answer: `<p>→ PCID is a unique ID for your computer that GFWL uses to check if a CD key has already been activated on that system. If the combination of your PCID + CD key was previously activated, the game will launch normally. But if it wasn't — GFWL tries to activate it online. And since the servers are now offline, new activations no longer work. That's why using an already activated PCID helps bypass the issue.</p>`,
    order: 4,
  },
  {
    question:
      "If I already have a working GFWL game installed, do I still need to use the fix? What happens if I reinstall Windows or upgrade hardware later?",
    answer: `<p>→ If the game is already working and you can log into your GFWL profile — you're fine for now. But the moment you reinstall Windows, change hardware, or move to a new system, GFWL will try to activate again — and fail, because the activation servers are gone. That's why it's critical to back up your current PCID and CD-Key while everything is still working. The tool in the guide lets you use old pre-activated combos — but only if you've saved them in time. Think of it as "immunizing" your game before it breaks.</p>`,
    order: 5,
  },
  {
    question:
      "Why do I have to keep entering the key, will it be easier someday?",
    answer: `<p>→ Yes, a better solution is being worked on by BlackAnt02.</p><p>For now, this is the best we've got.</p>`,
    order: 6,
  },
  {
    question: "How long will GFWL last?",
    answer: `<p>→ No one knows. Could be a week. Could be 10 years. Use it while it's up.</p>`,
    order: 7,
  },
];

async function importFAQs() {
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log("🔗 Connecting to MongoDB...");
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const db = client.db("GFWL");
    const faqsCollection = db.collection("faqs");
    console.log(`📦 Using database: GFWL, collection: faqs`);

    // Check if collection already has data
    const existingCount = await faqsCollection.countDocuments();

    if (existingCount > 0) {
      console.log(
        `\n⚠️  Warning: FAQs collection already has ${existingCount} documents`
      );
      console.log("This script will add new FAQs but won't delete existing ones.");
      console.log("If you want to replace all FAQs, delete the collection first.\n");
    }

    console.log(`\n📝 Importing ${faqItems.length} FAQs...`);

    let imported = 0;
    let skipped = 0;

    for (const faq of faqItems) {
      // Check if FAQ with same question already exists
      const existing = await faqsCollection.findOne({
        question: faq.question,
      });

      if (existing) {
        console.log(`⏭️  Skipping: "${faq.question}" (already exists)`);
        skipped++;
        continue;
      }

      const faqDoc = {
        question: faq.question,
        answer: faq.answer,
        order: faq.order,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "import-script",
        createdByName: "Import Script",
      };

      await faqsCollection.insertOne(faqDoc);
      console.log(`✅ Imported: "${faq.question}"`);
      imported++;
    }

    console.log(`\n✨ Import complete!`);
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📊 Total in database: ${await faqsCollection.countDocuments()}`);
  } catch (error) {
    console.error("❌ Error importing FAQs:", error);
    process.exit(1);
  } finally {
    await client.close();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

importFAQs();

