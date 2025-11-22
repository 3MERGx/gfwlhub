# Leaderboard Implementation

## Overview
A mobile-first community leaderboard page that ranks users by their contribution quality and activity. Currently feature-flagged for admin-only access during testing phase.

## Features Implemented

### 1. Admin-Only Access (Feature Flag)
- Only administrators can access `/dashboard/leaderboard`
- Authentication check in API route (`/api/leaderboard/route.ts`)
- Returns 403 Forbidden for non-admin users

### 2. Testing Mode Banner
- Prominent yellow banner at top of page
- Clearly indicates the page is in testing mode
- States that only admins can view it

### 3. Ranking System
- **Primary Sort**: Approval rate (percentage of approved vs rejected submissions)
- **Tiebreaker**: Total submission count (users with more submissions rank higher)
- Excludes users with no submissions
- Excludes blocked and deleted users

### 4. Mobile-First Responsive Design
- **Desktop (lg+)**: Full table view with sortable columns
- **Mobile/Tablet**: Card-based layout with all key information
- Optimized touch targets for mobile interaction
- Responsive text sizes and spacing

### 5. Sorting Functionality
- Sort by: Rank, Name, Submissions, Approved, Rejected, Approval Rate
- Toggle between ascending/descending order
- Visual indicators for active sort column and direction
- Preserves filter state when sorting

### 6. Search & Filters
- **Search**: By user name or email (real-time)
- **Role Filter**: All, Users, Reviewers, Admins
- **Status Filter**: All, Active, Suspended, Restricted

### 7. User Profiles
- User names are clickable links to their profile pages
- User avatars displayed (with fallback initials)
- Role badges (color-coded for admin/reviewer/user)

### 8. Visual Ranking System
- Top 3 get special icons:
  - 🏆 #1 - Gold trophy
  - 🥈 #2 - Silver medal
  - 🥉 #3 - Bronze medal
- Color-coded rank badges
- Approval rate progress bars with color thresholds:
  - Green: ≥75%
  - Yellow: 50-74%
  - Red: <50%

### 9. Statistics Overview
- Total Contributors count
- Total Submissions across all users
- Total Approved submissions
- Total Rejected submissions

### 10. Dashboard Integration
- Added "Experimental" section in dashboard sidebar
- Leaderboard link with "Beta" badge
- Flask icon (🧪) to denote experimental features
- Only visible to admins

## Files Created/Modified

### New Files
1. `app/api/leaderboard/route.ts` - API endpoint for leaderboard data
2. `app/dashboard/leaderboard/page.tsx` - Leaderboard page component
3. `app/dashboard/leaderboard/layout.tsx` - Page layout with metadata

### Modified Files
1. `components/DashboardLayout.tsx` - Added experimental section with leaderboard link
2. `types/crowdsource.ts` - Added LeaderboardEntry interface

## API Endpoint

### GET `/api/leaderboard`
**Authentication**: Required (Admin only)

**Response**: Array of leaderboard entries
```typescript
[
  {
    id: string,
    name: string,
    email: string,
    avatar: string | null,
    role: "user" | "reviewer" | "admin",
    status: "active" | "suspended" | "restricted",
    submissionsCount: number,
    approvedCount: number,
    rejectedCount: number,
    reviewedCount: number,
    approvalRate: number, // 0-100
    createdAt: Date,
    lastLoginAt: Date
  }
]
```

**Sorting Logic**:
1. Calculate approval rate: `(approvedCount / (approvedCount + rejectedCount)) * 100`
2. Sort by approval rate descending
3. For ties (rates within 0.01%), sort by submission count descending

## User Experience

### Desktop View
- Full table with 12-column grid layout
- Sortable headers with visual indicators
- Hover effects on rows
- Progress bars for approval rates

### Mobile View
- Card-based layout
- Condensed information hierarchy
- Touch-friendly controls
- Collapsible filters

## Access Control

### Current (Testing Phase)
- ✅ Admins: Full access
- ❌ Reviewers: No access
- ❌ Users: No access

### Future (Post-Testing)
When ready to launch:
1. Remove or update the testing banner
2. Modify role check in `app/api/leaderboard/route.ts` to include other roles
3. Update `roles: ["admin"]` in DashboardLayout to include desired roles
4. Move from "experimental" section to main navigation if desired

## Testing Checklist

- [x] Admin authentication enforced
- [x] Non-admins receive 403 error
- [x] Sorting works correctly
- [x] Search filters users in real-time
- [x] Role and status filters work
- [x] User profile links work
- [x] Mobile responsive layout
- [x] Desktop table layout
- [x] Avatars display (with fallback)
- [x] Statistics calculations accurate
- [x] Banner displays correctly
- [x] Sidebar link appears only for admins
- [x] Beta badge shows on sidebar link

## Performance Considerations

- All users loaded at once (no pagination currently)
- Filtering/sorting done client-side
- Consider adding pagination if user count exceeds 100+
- Avatar images use Next.js Image component with unoptimized flag

## Future Enhancements (Optional)

1. **Time-based Leaderboards**: Weekly, monthly, all-time rankings
2. **Achievement Badges**: Special icons for milestones
3. **Export Functionality**: CSV/Excel export for admins
4. **Detailed Stats**: Click user for detailed contribution history
5. **Pagination**: For large user bases (100+ contributors)
6. **Caching**: Redis cache for leaderboard data
7. **Real-time Updates**: WebSocket for live rank changes
8. **Historical Tracking**: Rank change indicators (↑↓)

