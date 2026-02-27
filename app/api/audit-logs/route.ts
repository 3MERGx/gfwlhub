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
      safeLog.warn("Audit logs: rate limit exceeded", { identifier: identifier?.slice(0, 8) });
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
      safeLog.warn("Audit logs: user not found for email");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only admins can view audit logs
    if (!canManageUsers(user)) {
      safeLog.warn("Audit logs: forbidden access attempt", { userId: user.id });
      return NextResponse.json(
        { error: "You do not have permission to view audit logs" },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const gameSlug = sanitizeString(searchParams.get("gameSlug") || "", 200);
    const limitParam = searchParams.get("limit");
    const skipParam = searchParams.get("skip");
    let limit: number | undefined;
    if (limitParam) {
      const parsed = parseInt(sanitizeString(limitParam, 10), 10);
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 5000) {
        safeLog.warn("Audit logs: invalid limit param", { limitParam, parsed });
      } else {
        limit = parsed;
      }
    }
    let skip = 0;
    if (skipParam) {
      const parsed = parseInt(sanitizeString(skipParam, 10), 10);
      if (!Number.isNaN(parsed) && parsed >= 0) skip = parsed;
    }

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

    const effectiveLimit = limit ?? 100;
    const logs = await getAllAuditLogs(effectiveLimit, skip);
    const hasMore = logs.length === effectiveLimit;

    return NextResponse.json(
      { logs, hasMore },
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

