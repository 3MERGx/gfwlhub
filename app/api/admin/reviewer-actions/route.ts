import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  getReviewerActionLogs,
  getUserByEmail,
  canManageUsers,
} from "@/lib/crowdsource-service-mongodb";
import { safeLog, sanitizeString } from "@/lib/security";

// GET - Get reviewer action logs (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByEmail(session.user.email!);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check admin permissions
    if (!canManageUsers(user)) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    // Get optional filters from query params
    const { searchParams } = new URL(request.url);
    const reviewerIdParam = searchParams.get("reviewerId");
    const limitParam = searchParams.get("limit");

    const reviewerId = reviewerIdParam
      ? sanitizeString(reviewerIdParam, 50)
      : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    const logs = await getReviewerActionLogs(reviewerId, limit);
    return NextResponse.json({ logs });
  } catch (error) {
    safeLog.error("Error fetching reviewer action logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

