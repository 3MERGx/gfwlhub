import { NextResponse } from "next/server";
import { getGFWLDatabase } from "@/lib/mongodb";
import { safeLog, rateLimiters, getClientIdentifier } from "@/lib/security";
import { requireAdmin } from "@/lib/api-auth";

interface ModerationLog {
  id: string;
  moderatedUser: {
    id: string;
    name: string;
  };
  moderator: {
    id: string;
    name: string;
  };
  timestamp: Date;
  action: string;
  reason: string;
  previousRole?: string;
  newRole?: string;
  previousStatus?: string;
  newStatus?: string;
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const identifier = getClientIdentifier(request, auth.user.id);
    if (!rateLimiters.admin.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const db = await getGFWLDatabase();
    const usersCollection = db.collection("users");

    // Moderation logs live in the users collection: each user document can have a
    // moderationHistory array. To find logs for a specific user (e.g. "EMERGx"),
    // query users by name and read that document's moderationHistory field.
    // Get all users with moderation history
    const users = await usersCollection
      .find({
        moderationHistory: { $exists: true, $ne: [] },
      })
      .toArray();

    // Flatten moderation history from all users into a single array
    const allModerationLogs: ModerationLog[] = [];
    for (const user of users) {
      if (user.moderationHistory && Array.isArray(user.moderationHistory)) {
        for (const log of user.moderationHistory) {
          allModerationLogs.push({
            id: `${user._id.toString()}-${log.timestamp?.getTime() || Date.now()}`,
            moderatedUser: log.moderatedUser || {
              id: user._id.toString(),
              name: user.name || "Unknown User",
            },
            moderator: log.moderator || {
              id: "unknown",
              name: "Unknown Admin",
            },
            timestamp: log.timestamp || new Date(),
            action: log.action || "Unknown action",
            reason: log.reason || "No reason provided",
            previousRole: log.previousRole,
            newRole: log.newRole,
            previousStatus: log.previousStatus,
            newStatus: log.newStatus,
          });
        }
      }
    }

    // Sort by timestamp (newest first)
    allModerationLogs.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

    return NextResponse.json(
      { logs: allModerationLogs },
      {
        headers: {
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    safeLog.error("Error fetching moderation logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

