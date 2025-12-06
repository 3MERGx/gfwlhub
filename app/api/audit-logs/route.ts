import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  getAllAuditLogs,
  getAuditLogsByGame,
  canManageUsers,
  getUserByEmail,
} from "@/lib/crowdsource-service-mongodb";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";

// GET - Fetch audit logs (with optional filters)
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const session = await getServerSession(authOptions);
    const identifier = getClientIdentifier(request, session?.user?.id);
    if (!rateLimiters.admin.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await getUserByEmail(session.user.email!);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only admins can view audit logs
    if (!canManageUsers(user)) {
      return NextResponse.json(
        { error: "You do not have permission to view audit logs" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const gameSlug = sanitizeString(searchParams.get("gameSlug") || "", 200);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? parseInt(sanitizeString(limitParam, 10), 10) : undefined;

    if (gameSlug) {
      const logs = await getAuditLogsByGame(gameSlug);
      return NextResponse.json(
        { logs },
        {
          headers: {
            "Cache-Control": "private, no-cache, must-revalidate",
          },
        }
      );
    }

    const logs = await getAllAuditLogs(limit);
    return NextResponse.json(
      { logs },
      {
        headers: {
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    safeLog.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

