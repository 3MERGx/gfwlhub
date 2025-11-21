# MongoDB Collections Explained

## Simplified Structure: Only `users` Collection

We use a **custom simplified adapter** that only requires the `users` collection.

### ✅ `users` Collection
- **Purpose**: Stores all user information
- **Fields**: 
  - NextAuth fields: `_id`, `email`, `name`, `image`, `emailVerified`, `createdAt`, `updatedAt`
  - **Provider info** (stored directly in user document): `provider`, `providerAccountId`, `providerType`
  - **Custom fields**: `role`, `status`, `submissionsCount`, `approvedCount`, `rejectedCount`, `lastLoginAt`, `suspendedUntil`
- **Why this works**: Since we don't allow account linking (one user per OAuth provider), we can store provider info directly in the user document

### ❌ `accounts` Collection - NOT USED
- **Why eliminated**: Provider info is stored directly in the `users` collection
- **Benefit**: Simpler database structure, fewer queries needed

### ❌ `sessions` Collection - NOT USED
- **Why eliminated**: Using JWT session strategy (sessions stored client-side as tokens)
- **Benefit**: No database queries for session validation, faster performance

## How It Works

### User Sign-In Flow:
1. User signs in with Google OAuth → Creates **User A** with `provider: "google"`
2. Same person signs out and signs in with GitHub OAuth → Creates **User B** with `provider: "github"` (separate user)
3. No account linking - each OAuth provider = separate user account

### User Document Structure:
```javascript
{
  _id: ObjectId("..."),
  email: "user@example.com",
  name: "John Doe",
  image: "https://...",
  provider: "google",              // OAuth provider
  providerAccountId: "123456789",  // Provider's user ID
  providerType: "oauth",
  role: "user",
  status: "active",
  submissionsCount: 0,
  approvedCount: 0,
  rejectedCount: 0,
  createdAt: ISODate("..."),
  updatedAt: ISODate("..."),
  lastLoginAt: ISODate("...")
}
```

## Database Configuration

**Important**: Make sure your `MONGODB_URI` includes the database name:

```
mongodb://username:password@host:port/GFWL
```

If your connection string doesn't include `/GFWL`, NextAuth will default to the `test` database.

## Benefits of This Approach

✅ **Simpler**: Only one collection to manage  
✅ **Faster**: Fewer database queries (no joins needed)  
✅ **Clearer**: All user info in one place  
✅ **No Account Linking**: Each OAuth provider = separate user (as requested)

