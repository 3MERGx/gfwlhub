import { NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import DiscordProvider from "next-auth/providers/discord";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@/lib/mongodb-adapter";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { safeLog } from "@/lib/security";

const adminEmails =
  process.env.DEVELOPER_EMAILS?.split(",").map((email) => email.trim()) || [];

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // No account linking - each OAuth provider creates a separate user
    }),
    // GitHub OAuth - Add credentials when ready
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [
          GithubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            authorization: {
              params: {
                scope: "read:user user:email",
              },
            },
          }),
        ]
      : []),
    // Discord OAuth - Add credentials when ready
    ...(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
      ? [
          DiscordProvider({
            clientId: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
          }),
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Always fetch fresh user data from database to ensure role/status changes are reflected
      const client = await clientPromise;
      const db = client.db("GFWL");
      const usersCollection = db.collection("users");

      // When user signs in (initial login)
      if (user) {
        // user.id from adapter is always a valid MongoDB ObjectId string
        // Try to find user by ID first (most reliable), then by email/provider
        let dbUser = null;
        
        // First, try to find by ID (works for both new and existing users)
        if (user.id && ObjectId.isValid(user.id)) {
          try {
            dbUser = await usersCollection.findOne({
              _id: new ObjectId(user.id),
            });
          } catch (error) {
            safeLog.error("JWT callback: Error finding user by ID:", error);
          }
        }
        
        // If not found by ID, try by email (for existing users)
        if (!dbUser && user.email) {
          dbUser = await usersCollection.findOne({ email: user.email });
        }
        
        // If still not found, try by provider account ID (for GitHub users with null email)
        if (!dbUser && account) {
          dbUser = await usersCollection.findOne({
            "providerInfo.provider": account.provider,
            "providerInfo.providerAccountId": account.providerAccountId,
          });
        }

        if (dbUser) {
          // Existing user found - use database values
          token.id = dbUser._id.toString();
          token.role = dbUser.role || "user";
          token.status = dbUser.status || "active";
          token.submissionsCount = dbUser.submissionsCount || 0;
          token.approvedCount = dbUser.approvedCount || 0;
          token.rejectedCount = dbUser.rejectedCount || 0;
          token.lastActivity = Math.floor(Date.now() / 1000); // Set initial activity time

          // Always use fresh name and image from database (updated on sign-in from OAuth)
          if (dbUser.name) {
            token.name = dbUser.name;
          }
          if (dbUser.image) {
            token.picture = dbUser.image; // NextAuth uses 'picture' for image
          }

          // Ensure email is set in token even if it was null initially
          if (!token.email && dbUser.email) {
            token.email = dbUser.email;
          }
        } else {
          // New user - user was just created by adapter but not yet in our query
          // Use user.id from adapter (which is a valid ObjectId string)
          token.id = user.id;
          token.role =
            user.email && adminEmails.includes(user.email) ? "admin" : "user";
          token.status = "active";
          token.submissionsCount = 0;
          token.approvedCount = 0;
          token.rejectedCount = 0;
          token.lastActivity = Math.floor(Date.now() / 1000); // Set initial activity time

          // Set name and image from OAuth provider
          if (user.name) {
            token.name = user.name;
          }
          if (user.image) {
            token.picture = user.image;
          }
        }
      } else if (token.id) {
        // On subsequent requests, refresh user data from database
        // This ensures role/status changes are reflected immediately
        // Also updates name and image from OAuth provider (updated on sign-in)
        
        // Validate that token.id is a valid MongoDB ObjectId
        let dbUser = null;
        try {
          // Check if token.id is a valid ObjectId format
          if (ObjectId.isValid(token.id as string)) {
            dbUser = await usersCollection.findOne({
              _id: new ObjectId(token.id as string),
            });
          } else {
            safeLog.warn(`JWT callback: Invalid ObjectId format for token.id=${token.id}`);
            // If token.id is not a valid ObjectId, keep existing token (don't invalidate)
            return token;
          }
        } catch (error) {
          safeLog.error(`JWT callback: Error querying user ${token.id}:`, error);
          // On error, keep existing token (don't invalidate)
          return token;
        }

        if (dbUser) {
          // Session rotation on privilege escalation
          // If role changed, invalidate session to force re-authentication
          // Only check if we have a previous role (skip on first request after sign-in)
          const previousRole = token.role as string | undefined;
          const currentRole = dbUser.role || "user";
          
          // Only invalidate if:
          // 1. We have a previous role (not undefined/empty - means not first request)
          // 2. The role actually changed
          // This prevents invalidating on initial sign-in where token.role might not be set yet
          if (previousRole && previousRole.trim() !== "" && previousRole !== currentRole) {
            // Role changed - invalidate session
            safeLog.warn(`Session invalidated: role changed from ${previousRole} to ${currentRole} for user ${token.id}`);
            return {
              ...token,
              error: "SessionInvalidated",
              role: currentRole, // Update role but mark as invalidated
            };
          }

          // Session timeout check (inactivity timeout)
          const now = Math.floor(Date.now() / 1000);
          const INACTIVITY_TIMEOUT = 30 * 60; // 30 minutes in seconds
          
          // Ensure lastActivity is set (should be set on sign-in, but handle edge case)
          if (!token.lastActivity) {
            token.lastActivity = now;
          } else {
            // Check timeout only if we have a valid previous activity timestamp
            const lastActivity = token.lastActivity as number;
            // Only expire if inactivity exceeds timeout (not on first request)
            if (lastActivity > 0 && now - lastActivity > INACTIVITY_TIMEOUT) {
              // Session expired due to inactivity
              safeLog.warn(`Session expired: inactivity timeout exceeded for user ${token.id}`);
              return {
                ...token,
                error: "SessionExpired",
              };
            }
          }

          // Update last activity timestamp on every request
          token.lastActivity = now;

          token.role = currentRole;
          token.status = dbUser.status || "active";
          token.submissionsCount = dbUser.submissionsCount || 0;
          token.approvedCount = dbUser.approvedCount || 0;
          token.rejectedCount = dbUser.rejectedCount || 0;

          // Always update name and image from database (which gets updated on sign-in from OAuth)
          if (dbUser.name) {
            token.name = dbUser.name;
          }
          if (dbUser.image) {
            token.picture = dbUser.image; // NextAuth uses 'picture' for image
          }

          // Update email if it's now available (e.g., GitHub user who previously had null email)
          if (
            dbUser.email &&
            (!token.email || token.email.includes(".local"))
          ) {
            token.email = dbUser.email;
          }
        } else {
          // User not found in database - this shouldn't happen after sign-in
          // but if it does, log it and keep the token as-is (don't invalidate)
          safeLog.warn(`JWT callback: User ${token.id} not found in database, keeping existing token`);
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Check if session was invalidated or expired
      // Return a session object with error flag instead of null to prevent NextAuth errors
      if (token.error === "SessionInvalidated" || token.error === "SessionExpired") {
        safeLog.warn(`Session callback: Session ${token.error} for token.id=${token.id}`);
        // Return a session object with minimal data and error flag
        // This prevents NextAuth from throwing "Cannot convert undefined or null to object" errors
        // The client-side code will handle the error and sign out the user
        if (session && session.user) {
          return {
            ...session,
            user: {
              ...session.user,
              id: "",
              email: "",
              name: "",
              role: "user" as const,
              status: "active" as const,
              submissionsCount: 0,
              approvedCount: 0,
              rejectedCount: 0,
            },
            error: token.error,
          };
        }
        // Fallback if session is null/undefined - return a minimal valid session
        return {
          user: {
            id: "",
            email: "",
            name: "",
            role: "user" as const,
            status: "active" as const,
            submissionsCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
          },
          error: token.error,
          expires: new Date().toISOString(),
        };
      }

      // If token doesn't have an ID, session is not valid (shouldn't happen, but safety check)
      if (!token.id) {
        safeLog.warn("Session callback: token.id is missing");
        return session;
      }

      // If session is missing, something went wrong
      if (!session) {
        safeLog.warn("Session callback: session is null/undefined");
        return session;
      }

      // Add custom user data to session from JWT token
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.role =
          (token.role as "user" | "reviewer" | "admin") || "user";
        session.user.status =
          (token.status as "active" | "suspended" | "restricted" | "blocked") ||
          "active";
        session.user.submissionsCount = (token.submissionsCount as number) || 0;
        session.user.approvedCount = (token.approvedCount as number) || 0;
        session.user.rejectedCount = (token.rejectedCount as number) || 0;

        // Check if user is a developer (for client-side UI checks only)
        // SECURITY NOTE: This flag is for UI convenience only. All authorization
        // must be verified server-side in API endpoints. The flag is set server-side
        // from a server-only env var, and the JWT is signed, so clients cannot forge it.
        // However, we still verify server-side in all API endpoints as defense-in-depth.
        const userEmail = session.user.email;
        const isDeveloper = userEmail && adminEmails.includes(userEmail);
        interface SessionUserWithDeveloper {
          isDeveloper?: boolean;
        }
        (session.user as SessionUserWithDeveloper).isDeveloper =
          isDeveloper || false;

        // Update name and image from token (which gets fresh data from database)
        if (token.name) {
          session.user.name = token.name as string;
        }
        if (token.picture) {
          session.user.image = token.picture as string;
        }
      }
      return session;
    },
    async signIn({ user, account }) {
      if (!account) return true;

      const client = await clientPromise;
      const db = client.db("GFWL");
      const usersCollection = db.collection("users");

      // Check if provider is permanently banned
      const bannedProvider = await db.collection("bannedProviders").findOne({
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      });

      if (bannedProvider) {
        return false; // Permanently banned - no sign-in allowed
      }

      // Check for existing user by provider info first (handles deleted accounts)
      let dbUser = await usersCollection.findOne({
        "providerInfo.provider": account.provider,
        "providerInfo.providerAccountId": account.providerAccountId,
      });

      // Also check by email if available
      if (!dbUser && user.email) {
        dbUser = await usersCollection.findOne({ email: user.email });
      }

      if (dbUser) {
        // Check if account was deleted
        if (dbUser.status === "deleted") {
          // Check if account was anonymized (past grace period)
          if (dbUser.anonymizedAt) {
            // Cannot restore anonymized accounts
            return false;
          }

          // Within grace period - restore the account
          const updateData: Record<string, unknown> = {
            status: "active", // Restore as active by default
            name: user.name || dbUser.name || "User",
            email: user.email || dbUser.email,
            image: user.image !== undefined ? user.image : dbUser.image,
            lastLoginAt: new Date(),
            restoredAt: new Date(),
          };

          await usersCollection.updateOne(
            { _id: dbUser._id },
            { $set: updateData, $unset: { deletedAt: "" } }
          );

          return true;
        }

        // Check if account is blocked - prevent sign-in
        if (dbUser.status === "blocked") {
          return false; // Block sign-in completely
        }

        // Suspended users can sign in but won't be able to submit corrections
      }

      return true;
    },
    async redirect({ url, baseUrl }) {
      // If URL is provided and valid, use it
      if (url.startsWith("/")) {
        // If it's a dashboard route, we'll let DashboardLayout handle permission checks
        // Otherwise redirect to the requested page
        return `${baseUrl}${url}`;
      }
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      // Default redirect to homepage (safe for all users)
      return `${baseUrl}/`;
    },
  },
  events: {
    async createUser({ user }) {
      // Custom fields are set by our adapter, but we can add additional fields here if needed
      // The adapter already stores provider info in the user document
      const client = await clientPromise;
      const db = client.db("GFWL");
      const usersCollection = db.collection("users");

      // Handle GitHub users with private emails - use provider account ID as fallback
      // GitHub may return null email if user has private email settings
      let userEmail = user.email;
      if (!userEmail) {
        // Get the user document to find provider info
        const dbUser = await usersCollection.findOne({
          _id: new ObjectId(user.id),
        });
        const providerInfo = dbUser?.providerInfo || {};

        // If still no email, use a placeholder based on provider account ID
        if (providerInfo.providerAccountId) {
          userEmail = `${providerInfo.providerAccountId}@${
            providerInfo.provider || "github"
          }.local`;
        } else {
          // Last resort: use user ID
          userEmail = `user-${user.id}@unknown.local`;
        }

        // Update the user document with the email
        await usersCollection.updateOne(
          { _id: new ObjectId(user.id) },
          { $set: { email: userEmail } }
        );
      }

      const role =
        userEmail && adminEmails.includes(userEmail) ? "admin" : "user";

      // Update with our custom fields (adapter already created the user)
      // This ensures ALL new users start with active status
      await usersCollection.updateOne(
        { _id: new ObjectId(user.id) }, // Convert string ID to ObjectId
        {
          $set: {
            role,
            status: "active", // Always set to active for new users
            submissionsCount: 0,
            approvedCount: 0,
            rejectedCount: 0,
            lastLoginAt: new Date(),
          },
        }
      );
    },
    async signIn({ user }) {
      // Update last login and check admin status on each sign in
      const client = await clientPromise;
      const db = client.db("GFWL");
      const usersCollection = db.collection("users");

      const existingUser = await usersCollection.findOne({
        _id: new ObjectId(user.id),
      });

      // Check if this is a deleted account attempting to sign back in
      if (existingUser?.status === "deleted" && existingUser?.deletedAt) {
        const deletedAt = new Date(existingUser.deletedAt);
        const now = new Date();
        const daysSinceDeletion = Math.floor(
          (now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Allow restoration within 30-day grace period
        if (daysSinceDeletion <= 30) {
          const restoredName = user.name || existingUser.archivedName || "User";
          const restoredImage =
            user.image || existingUser.archivedImage || null;

          // 1. Restore the account with current OAuth profile information
          await usersCollection.updateOne(
            { _id: new ObjectId(user.id) },
            {
              $set: {
                status: "active",
                name: restoredName,
                email: user.email || existingUser.email,
                image: restoredImage, // Restore archived image or use current OAuth image
                lastLoginAt: new Date(),
              },
              $unset: {
                deletedAt: "",
                suspendedUntil: "",
                archivedName: "", // Remove archived name on restoration
                archivedImage: "", // Remove archived image on restoration
              },
            }
          );

          // 2. Restore the user's name in their correction submissions
          await db.collection("corrections").updateMany(
            { submittedBy: user.id },
            {
              $set: {
                submittedByName: restoredName,
              },
            }
          );

          // 3. Restore the user's name in audit logs where they were the submitter
          await db.collection("auditLogs").updateMany(
            { submittedBy: user.id },
            {
              $set: {
                submittedByName: restoredName,
              },
            }
          );

          // 4. Restore the user's name in audit logs where they were the reviewer/approver
          await db.collection("auditLogs").updateMany(
            { changedBy: user.id },
            {
              $set: {
                changedByName: restoredName,
              },
            }
          );

          return;
        } else {
          throw new Error(
            "This account has been permanently deleted and cannot be restored. " +
              "Please contact support if you believe this is an error."
          );
        }
      }

      const updates: {
        lastLoginAt: Date;
        email?: string;
        name?: string;
        image?: string;
        status?: string;
        submissionsCount?: number;
        approvedCount?: number;
        rejectedCount?: number;
        role?: string;
      } = {
        lastLoginAt: new Date(),
      };

      // Update email if it's now available (e.g., GitHub user who previously had null email)
      // Only update if the new email is not a placeholder
      if (
        user.email &&
        !user.email.includes(".local") &&
        !user.email.includes("@unknown")
      ) {
        // If user had a placeholder email, replace it with the real one
        if (
          !existingUser?.email ||
          existingUser.email.includes(".local") ||
          existingUser.email.includes("@unknown")
        ) {
          updates.email = user.email;
        }
      }

      // Always update name and image from OAuth provider to keep them current
      // This ensures users have the most up-to-date profile information
      if (user.name) {
        updates.name = user.name;
      }
      if (user.image) {
        updates.image = user.image;
      }

      // Promote to admin if email is in admin list and not already admin
      if (
        user.email &&
        !user.email.includes(".local") &&
        !user.email.includes("@unknown") &&
        adminEmails.includes(user.email) &&
        existingUser?.role !== "admin"
      ) {
        updates.role = "admin";
      }

      // Ensure default fields exist if they don't - this fixes users created before we added these fields
      if (!existingUser?.role) {
        updates.role =
          user.email &&
          !user.email.includes(".local") &&
          !user.email.includes("@unknown") &&
          adminEmails.includes(user.email)
            ? "admin"
            : "user";
      }
      // Always set status to active if it's missing (for existing users without status field)
      if (!existingUser?.status || existingUser.status === undefined) {
        updates.status = "active";
      }
      if (existingUser?.submissionsCount === undefined) {
        updates.submissionsCount = 0;
      }
      if (existingUser?.approvedCount === undefined) {
        updates.approvedCount = 0;
      }
      if (existingUser?.rejectedCount === undefined) {
        updates.rejectedCount = 0;
      }

      await usersCollection.updateOne(
        { _id: new ObjectId(user.id) },
        {
          $set: updates,
        }
      );
    },
    async linkAccount() {
      // Provider info is already stored in user document by our adapter
      // This event is called after linkAccount, so we can add any additional logic here
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt", // JWT strategy doesn't require sessions collection
    maxAge: 30 * 24 * 60 * 60, // 30 days absolute timeout
    updateAge: 24 * 60 * 60, // Update session if older than 24 hours
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" 
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax", // CSRF protection - allows OAuth redirects
        path: "/",
        secure: process.env.NODE_ENV === "production", // HTTPS only in production
      },
    },
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days - match session maxAge
  },
  secret: process.env.NEXTAUTH_SECRET,
};
