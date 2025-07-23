#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Configuration
const DOWNLOADS_DIR = path.join(__dirname, "../public/downloads");
const ALLOWED_EXTENSIONS = [".7z", ".zip", ".exe", ".msi"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

function validateFile(filePath) {
  const stats = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();

  // Check file size
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max: 10MB)`
    );
  }

  // Check file extension
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Invalid file type: ${ext} (allowed: ${ALLOWED_EXTENSIONS.join(", ")})`
    );
  }

  console.log(
    `✅ File validated: ${path.basename(filePath)} (${(
      stats.size / 1024
    ).toFixed(1)}KB)`
  );
  return true;
}

function updateFile(sourcePath, targetFileName) {
  const targetPath = path.join(DOWNLOADS_DIR, targetFileName);

  try {
    // Validate source file
    validateFile(sourcePath);

    // Copy file to downloads directory
    fs.copyFileSync(sourcePath, targetPath);

    console.log(`✅ File updated: ${targetFileName}`);
    console.log(`📁 Location: ${targetPath}`);
    console.log(`🌐 URL: /downloads/${targetFileName}`);

    return true;
  } catch (error) {
    console.error(`❌ Error updating file: ${error.message}`);
    return false;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.log(
      "Usage: node scripts/update-download.js <source-file> <target-filename>"
    );
    console.log(
      "Example: node scripts/update-download.js ./new-keygen.exe GFWL Keygen.exe"
    );
    console.log("\n📋 PR Workflow:");
    console.log("1. Create a new branch: git checkout -b update-keygen");
    console.log("2. Run this script to update the file");
    console.log(
      "3. Commit: git add public/downloads/ && git commit -m 'Update keygen'"
    );
    console.log("4. Push: git push origin update-keygen");
    console.log("5. Create PR on GitHub for review");
    process.exit(1);
  }

  const [sourcePath, targetFileName] = args;

  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ Source file not found: ${sourcePath}`);
    process.exit(1);
  }

  if (updateFile(sourcePath, targetFileName)) {
    console.log("\n🎉 File updated successfully!");
    console.log("\n📋 Next steps for PR workflow:");
    console.log("1. Create a new branch:");
    console.log("   git checkout -b update-keygen");
    console.log("2. Add the file:");
    console.log("   git add public/downloads/" + targetFileName);
    console.log("3. Commit with descriptive message:");
    console.log('   git commit -m "Update GFWL Keygen"');
    console.log("4. Push the branch:");
    console.log("   git push origin HEAD");
    console.log("5. Create Pull Request on GitHub");
    console.log("6. Wait for review and approval");
    console.log(
      "\n⚠️  File will only go live after PR is merged to main branch"
    );
  } else {
    process.exit(1);
  }
}

module.exports = { updateFile, validateFile };
