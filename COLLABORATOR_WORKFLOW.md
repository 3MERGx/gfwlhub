# File Update Workflow for GFWL Hub

## Overview

This repository uses a **Pull Request (PR) workflow** for file updates. This ensures:

- ✅ **Security** - All changes are reviewed before going live
- ✅ **Control** - You maintain full control over what gets deployed
- ✅ **Audit trail** - All changes are tracked in Git history
- ✅ **Rollback capability** - Easy to revert any changes

## For Repository Owner (You)

### Setting Up Collaborator Access

1. **Go to your GitHub repository**
2. **Settings** → **Collaborators and teams**
3. **Add people** → Enter their GitHub username
4. **Select "Write" access** (not "Admin")
5. **They'll receive an email invitation**

### Review Process

1. **They create a PR** → You get notified
2. **Review the changes** → Check the file and commit message
3. **Approve and merge** → File goes live on Vercel
4. **Vercel auto-deploys** → Changes are live in ~2 minutes

## For Collaborators (File Updaters)

### Prerequisites

- GitHub account
- Write access to this repository
- Git installed on your computer

### Step-by-Step Workflow

#### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/gfwlhub.git
cd gfwlhub
```

#### 2. Create a New Branch

```bash
git checkout -b update-keygen-v0.6
```

#### 3. Update the File

```bash
# Use the helper script (recommended)
node scripts/update-download.js ./your-new-file.exe GFWL_Keygen_Beta_0.6.exe

# Or manually copy the file
cp your-new-file.exe public/downloads/GFWL_Keygen_Beta_0.6.exe
```

#### 4. Commit Your Changes

```bash
git add public/downloads/GFWL_Keygen_Beta_0.6.exe
git commit -m "Update GFWL Keygen to Beta 0.6"
```

#### 5. Push Your Branch

```bash
git push origin update-keygen-v0.6
```

#### 6. Create Pull Request

1. Go to: `https://github.com/yourusername/gfwlhub/pulls`
2. Click **"New Pull Request"**
3. Select: `update-keygen-v0.6` → `main`
4. Add description:

   ```
   Update GFWL Keygen to Beta 0.6

   Changes:
   - Updated keygen to version 0.6
   - File size: XXX KB
   - Tested with [specific games if applicable]
   ```

5. Click **"Create Pull Request"**

#### 7. Wait for Review

- Repository owner will review your PR
- They may request changes or approve
- Once approved and merged, file goes live

## File Requirements

- **Size**: Maximum 10MB
- **Formats**: .exe, .7z, .zip, .msi
- **Location**: `public/downloads/` directory
- **Naming**: Use descriptive names like `GFWL_Keygen_Beta_0.6.exe`

## Troubleshooting

### File Too Large

- Compress the file or use a different format
- Maximum size: 10MB

### Invalid File Type

- Only .exe, .7z, .zip, .msi files allowed
- Contact repository owner if you need other formats

### Push Rejected

- Make sure you're on a new branch (not main)
- Check that you have write access to the repository

### PR Not Showing

- Make sure you pushed your branch: `git push origin your-branch-name`
- Check that the branch exists on GitHub

## Security Notes

- **Never push directly to main** - Always use PRs
- **Wait for approval** - Files only go live after PR is merged
- **Keep files secure** - Don't share files outside the repository
- **Use descriptive commit messages** - Help with review process

## Support

If you encounter issues:

1. Check this guide first
2. Contact the repository owner
3. Check GitHub's PR documentation
