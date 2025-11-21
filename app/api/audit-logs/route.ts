import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  getAllAuditLogs,
  getAuditLogsByGame,
  canManageUsers,
  getUserByEmail,
} from "@/lib/crowdsource-service-mongodb";

// GET - Fetch audit logs (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

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
    const gameSlug = searchParams.get("gameSlug");
    const limit = searchParams.get("limit");

    if (gameSlug) {
      const logs = await getAuditLogsByGame(gameSlug);
      return NextResponse.json({ logs });
    }

    const logs = await getAllAuditLogs(
      limit ? parseInt(limit, 10) : undefined
    );
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}

