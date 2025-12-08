# Reviewer Application System Documentation

## Overview
The reviewer application system allows users to apply for reviewer privileges after meeting contribution requirements. Admins review and approve/reject applications.

## User Access to "Become a Reviewer" Page

### Where Users Can Find It:
1. **User Menu** - Regular users (role: "user") will see a "Become a Reviewer" link in their user menu dropdown (top right corner)
2. **Direct URL** - Users can navigate to `/become-reviewer` directly

### Page Features:
- Eligibility status display
- Application form
- Application history
- Cooldown period information

## Configuration

### Requirements Configuration
Edit `lib/reviewer-application-config.ts` or set environment variables:

```typescript
MIN_CORRECTIONS_SUBMITTED: 20  // Minimum corrections submitted
MIN_CORRECTIONS_ACCEPTED: 10   // Minimum corrections accepted
MIN_ACCOUNT_AGE_DAYS: 7        // Minimum account age in days
REAPPLICATION_COOLDOWN_DAYS: 30 // Days to wait after rejection before re-applying
```

### Environment Variables:
```bash
MIN_CORRECTIONS_SUBMITTED=20
MIN_CORRECTIONS_ACCEPTED=10
MIN_ACCOUNT_AGE_DAYS=7
REAPPLICATION_COOLDOWN_DAYS=30
```

## Reviewer Permissions & Access

### What Reviewers CAN Do:
1. **Review Corrections** (`/dashboard/submissions`)
   - Approve, reject, or modify game corrections
   - Add review notes
   - Cannot review their own submissions (prevents abuse)

2. **Review Game Submissions** (`/dashboard/game-submissions`)
   - Approve or reject new game submissions
   - Add review notes

3. **Access Dashboard** (`/dashboard`)
   - View dashboard statistics
   - See pending corrections count

4. **View Leaderboard** (`/leaderboard`)
   - See community contribution rankings

5. **Submit Corrections**
   - Can still submit corrections like regular users

### What Reviewers CANNOT Do:
1. **Manage Users** (`/dashboard/users`)
   - Cannot view or modify user accounts
   - Cannot change user roles or status

2. **Manage Games** (`/dashboard/games`)
   - Cannot directly edit game data
   - Must use correction system

3. **View Audit Logs** (`/dashboard/audit`)
   - Admin-only feature

4. **View Moderation Logs** (`/dashboard/moderation`)
   - Admin-only feature

5. **Review Reviewer Applications** (`/dashboard/reviewer-applications`)
   - Admin-only feature

6. **Access VirusTotal Scanning**
   - Only reviewers and admins can scan URLs, but this is for reviewing submissions

## Application History & Cooldown

### Features:
- **Application History**: Users can see all their previous applications (pending, approved, rejected)
- **Cooldown Period**: After rejection, users must wait 30 days (configurable) before re-applying
- **History Tracking**: All applications are stored with:
  - Status (pending/approved/rejected)
  - Submission date
  - Decision date
  - Admin notes (if provided)

### API Endpoints:
- `GET /api/reviewer-application/history` - Get user's application history
- `GET /api/admin/reviewer-actions` - Get reviewer action logs (admin only)

## Reviewer Action Logging

### What Gets Logged:
Every time a reviewer approves or rejects a correction, it's logged in the `reviewerActionsLog` collection with:
- Reviewer ID and name
- Correction ID
- Action (approve/reject)
- Timestamp

### Viewing Logs:
- **API**: `GET /api/admin/reviewer-actions?reviewerId=<id>&limit=100`
- **UI**: Currently no UI exists, but logs are being collected
- **Future**: Could add a "Reviewer Activity" page in admin dashboard

## Database Collections

### `reviewerApplications`
- Stores all reviewer applications
- Fields: userId, motivationText, status, adminId, decisionAt, adminNotes

### `reviewerActionsLog`
- Stores all reviewer actions (approve/reject corrections)
- Fields: reviewerId, reviewerName, correctionId, action, createdAt

## Security Features

1. **CSRF Protection**: All POST endpoints require CSRF tokens
2. **Rate Limiting**: API endpoints are rate-limited
3. **Permission Checks**: Role-based access control
4. **Input Sanitization**: All user inputs are sanitized
5. **Cooldown Enforcement**: Prevents spam applications
6. **Self-Review Prevention**: Reviewers cannot review their own submissions

## Future Enhancements

1. **Reviewer Activity Dashboard**: UI to view reviewer action logs
2. **Reviewer Performance Metrics**: Track approval rates, activity levels
3. **Automatic Promotion**: Option to auto-promote users who exceed thresholds
4. **Application Notifications**: Email/notification when application status changes
5. **Reviewer Badges**: Visual indicators for active reviewers

