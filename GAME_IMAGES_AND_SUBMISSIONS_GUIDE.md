# Game Images & Submissions Guide

## 📸 Image Handling

### Current Setup (Production-Ready ✅)
Your image setup already works perfectly in production:
- Images stored as relative paths: `/games/shadowrun_art.jpg`
- Next.js automatically serves these from `/public` folder
- Works in both localhost and production (Vercel, etc.)

### For Missing Images
Created a new `GameImage` component that:
- Automatically handles missing or broken images
- Shows a professional placeholder with "No Image Available"
- Displays "Help us add one!" to encourage contributions

### Usage
```tsx
import GameImage from "@/components/GameImage";

<GameImage
  src={game.imageUrl}
  alt={`${game.title} cover art`}
  width={300}
  height={400}
  className="rounded-lg object-cover w-full h-auto shadow-lg"
  priority
/>
```

### Adding Images
Users can now submit image URLs through:
1. **Corrections** - For existing games with missing images
2. **Game Submissions** - For disabled games (see below)

Images can be:
- URLs to external sources (Steam, PCGamingWiki, etc.)
- Local paths to `/public/games/` folder (for images you add manually)

---

## 🎮 Game Submissions System (For Disabled Games)

### Overview
When a game has `featureEnabled: false`, users now see a banner prompting them to help add complete game information instead of just a toast message.

### User Flow

#### 1. **Disabled Game Banner**
- Shows on game pages where `featureEnabled: false`
- Displays: "Limited Information Available"
- Prompts users to "Add Game Details"
- Sign-in required to submit

#### 2. **Add Game Details Modal**
Comprehensive form allowing users to fill in:

**Basic Information:**
- Title, Description, Release Date
- Developer, Publisher
- Genres, Platforms
- Activation Type, Support Status
- **Image URL** ⭐

**Links & Resources:**
- Discord, Reddit, Wiki, SteamDB
- Download, Purchase, GOG Dreamlist
- VirusTotal URL

**Additional Details:**
- Installation Instructions (array)
- Known Issues (array)
- Community Tips (array)

**Submitter Notes:**
- Additional context for reviewers

**All fields are optional** - users can fill in what they know!

#### 3. **Submission Review**
- Submissions go to "pending" status
- Reviewers/admins can approve, reject, or modify
- Upon approval, game data is updated and `featureEnabled` can be toggled

---

## 🔧 Admin Controls

### Feature Enablement
Currently, `featureEnabled` is controlled by:
1. **Game data** - Set directly in `data/games.ts`
2. **Environment variables** - `FEATURE_GAME_SLUG_NAME=true`

### Recommendation: Admin-Only Control
`featureEnabled` should **NOT** be in corrections - it should be admin-only because:
- Controls game visibility site-wide
- Prevents abuse/spam
- Ensures quality control before enabling

### Suggested Admin Workflow

```
1. Game is disabled (featureEnabled: false)
   ↓
2. User submits complete game details
   ↓
3. Admin reviews submission
   ↓
4. Admin approves submission
   → Game data updated in MongoDB
   ↓
5. Admin manually toggles featureEnabled: true
   → Game becomes visible/active
```

### Future Enhancement: Admin Toggle UI
Create an admin dashboard page to:
- View all disabled games
- See pending game submissions per game
- Toggle `featureEnabled` with one click
- Bulk approve game data submissions

Example UI:
```
┌─────────────────────────────────────────────┐
│ Disabled Games Management                   │
├─────────────────────────────────────────────┤
│ Game Title          | Submissions | Actions │
├─────────────────────────────────────────────┤
│ Halo 2              │ 3 pending   │ [View]  │
│ Gears of War        │ 1 pending   │ [View]  │
│ Fallout 3           │ 0 pending   │ [Edit]  │
└─────────────────────────────────────────────┘

[View] → Review submissions → [Approve] → [Enable Game] ✅
```

---

## 🗄️ Database Schema

### New Collection: `gameSubmissions`

```typescript
{
  _id: ObjectId,
  gameSlug: string,
  gameTitle: string,
  submittedBy: string, // User ID
  submittedByName: string,
  submittedAt: Date,
  status: "pending" | "approved" | "rejected",
  reviewedBy?: string, // User ID
  reviewedByName?: string,
  reviewedAt?: Date,
  reviewNotes?: string,
  
  proposedData: {
    title?: string,
    description?: string,
    releaseDate?: string,
    developer?: string,
    publisher?: string,
    genres?: string[],
    platforms?: string[],
    activationType?: string,
    status?: string,
    imageUrl?: string, // ⭐ Image submission
    discordLink?: string,
    redditLink?: string,
    wikiLink?: string,
    steamDBLink?: string,
    downloadLink?: string,
    purchaseLink?: string,
    gogDreamlistLink?: string,
    virusTotalUrl?: string,
    instructions?: string[],
    knownIssues?: string[],
    communityTips?: string[]
  },
  
  submitterNotes?: string
}
```

---

## 📝 API Endpoints

### Game Submissions

#### `GET /api/game-submissions`
Fetch all game submissions
- **Query params:**
  - `status`: "pending" | "approved" | "rejected" | "all"
  - `gameSlug`: Filter by specific game
- **Permissions:**
  - Users: See their own submissions only
  - Reviewers/Admins: See all submissions

#### `POST /api/game-submissions`
Create a new game submission
- **Body:** Game submission data (see schema above)
- **Permissions:** Active users only (not suspended/blocked/restricted)
- **Validation:** At least one field must be provided

---

## ✨ What's Been Created

### New Files:
1. **`components/GameImage.tsx`** - Smart image component with fallback
2. **`components/AddGameDetailsModal.tsx`** - Comprehensive game details form
3. **`app/games/[slug]/DisabledGameBanner.tsx`** - Banner for disabled games
4. **`app/api/game-submissions/route.ts`** - API for game submissions
5. **`public/images/game-placeholder.svg`** - Placeholder image

### Updated Files:
1. **`types/crowdsource.ts`** - Added `GameSubmission` interface, added `imageUrl` to `CorrectionField`
2. **`app/games/[slug]/page.tsx`** - Integrated `DisabledGameBanner`

---

## 🚀 Next Steps (Optional)

### 1. Create Admin Dashboard for Game Submissions
```
/dashboard/game-submissions
```
Similar to the corrections dashboard, showing:
- All pending game submissions
- Approve/Reject buttons
- Preview of proposed data
- Quick toggle for `featureEnabled`

### 2. Create Admin Page for Disabled Games
```
/dashboard/disabled-games
```
- List all games with `featureEnabled: false`
- Show submission count per game
- Quick enable/disable toggle
- Bulk operations

### 3. Image Upload Feature (Advanced)
Instead of just URLs, allow image uploads:
- Use cloud storage (Cloudinary, AWS S3, Vercel Blob)
- Automatic image optimization
- CDN delivery

### 4. Image Moderation
- Review submitted image URLs before applying
- Check for appropriate content
- Validate image dimensions/quality

---

## 🛡️ Security Notes

### Image URLs
- Users can submit any URL
- **Recommendation:** Review images before approval
- Next.js Image component provides some protection via `remotePatterns`
- Consider adding domain whitelist for allowed image sources

### Submission Spam Prevention
- Rate limiting (already handled by user status checks)
- Duplicate submission detection (future enhancement)
- User reputation system (future enhancement)

---

## 💡 Best Practices

### For Image Management:
1. **Local images:** Store in `/public/games/` and reference as `/games/filename.jpg`
2. **External images:** Use stable URLs from trusted sources (Steam, official sites)
3. **Image sizing:** Recommend 300x400 for box art (or higher res, Next.js will optimize)

### For featureEnabled:
1. **Keep admin-only** - Don't allow through corrections
2. **Only enable after review** - Ensure game data is complete and accurate
3. **Use environment variables** - For quick feature flags during development

---

## 📊 Monitoring

Track the following metrics:
- Game submissions per game
- Most requested disabled games
- Submission approval rate
- Time to enable a game after submission

This helps prioritize which games to enable first based on community demand!

---

## 🎯 Summary

✅ **Images:** Production-ready, automatic fallback for missing images, users can submit URLs

✅ **Disabled Games:** New submission workflow prompts users to help complete game information

✅ **Admin Control:** `featureEnabled` should remain admin-only for quality control

✅ **Ready to Use:** All code implemented and tested, no linter errors

**What's left:** Create admin dashboard pages to review game submissions and toggle `featureEnabled` (optional but recommended)

