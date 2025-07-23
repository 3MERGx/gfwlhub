# Setup Guide for Repository Owner

## Quick Setup Steps

### 1. Add Collaborator (One-time setup)

1. Go to your GitHub repository
2. **Settings** → **Collaborators and teams**
3. **Add people** → Enter their GitHub username
4. **Select "Write" access** (not "Admin")
5. They'll receive an email invitation

### 2. Optional: Set Up Branch Protection (Recommended)

1. **Settings** → **Branches**
2. **Add rule** for `main` branch
3. Enable:
   - ✅ **Require a pull request before merging**
   - ✅ **Require approvals** (set to 1)
   - ✅ **Dismiss stale PR approvals when new commits are pushed**
4. **Create**

### 3. Share Instructions

Send them the `COLLABORATOR_WORKFLOW.md` file - it contains everything they need to know.

## Workflow Summary

### What They Do:

1. **Clone repo** → `git clone https://github.com/yourusername/gfwlhub.git`
2. **Create branch** → `git checkout -b update-keygen-v0.6`
3. **Update file** → Use the script or manually copy
4. **Commit & push** → `git add`, `git commit`, `git push`
5. **Create PR** → On GitHub, create Pull Request
6. **Wait for review** → You review and approve

### What You Do:

1. **Get notified** → GitHub notifies you of new PR
2. **Review changes** → Check file and commit message
3. **Approve & merge** → Click "Merge pull request"
4. **Auto-deploy** → Vercel deploys automatically

## Benefits

✅ **Security** - You control what goes live  
✅ **Audit trail** - All changes tracked in Git  
✅ **Easy rollback** - Can revert any change  
✅ **No Vercel access** - They only have GitHub access  
✅ **File validation** - Script checks size and format

## Monitoring

- **PR notifications** - You'll get emails for new PRs
- **Vercel dashboard** - Monitor deployments and bandwidth
- **GitHub activity** - See all changes in repository

## File Management

- **Location**: `public/downloads/` directory
- **Size limit**: 10MB per file
- **Formats**: .exe, .7z, .zip, .msi
- **Naming**: Use descriptive names like `GFWL_Keygen_Beta_0.6.exe`

## Troubleshooting

### If they can't push:

- Check they have "Write" access (not "Read")
- Make sure they're on a new branch (not main)

### If PR doesn't show:

- They need to push their branch first
- Check the branch exists on GitHub

### If file doesn't deploy:

- Check Vercel deployment logs
- Verify the file is in `public/downloads/`
