import { NextRequest, NextResponse } from "next/server";
import {
  getAllAuditLogs,
  getAuditLogsByGame,
} from "@/lib/crowdsource-service-mongodb";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { requireAdmin } from "@/lib/api-auth";
import { parseClampedLimit } from "@/lib/request-validation";

// GET - Fetch audit logs (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const { user } = auth;

    const identifier = getClientIdentifier(request, user.id);
    if (!rateLimiters.admin.isAllowed(identifier)) {
      safeLog.warn("Audit logs: rate limit exceeded", { identifier: identifier?.slice(0, 8) });
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const gameSlug = sanitizeString(searchParams.get("gameSlug") || "", 200);
    const limit = parseClampedLimit(searchParams.get("limit"), {
      defaultLimit: 100,
      min: 1,
      max: 5000,
    });
    const skip = parseClampedLimit(searchParams.get("skip"), {
      defaultLimit: 0,
      min: 0,
      max: 10_000,
    });

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

    const logs = await getAllAuditLogs(limit, skip);
    const hasMore = logs.length === limit;

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

