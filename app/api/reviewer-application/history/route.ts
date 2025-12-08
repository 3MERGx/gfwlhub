import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  getUserReviewerApplicationHistory,
  getUserByEmail,
} from "@/lib/crowdsource-service-mongodb";
import { safeLog } from "@/lib/security";

// GET - Get user's reviewer application history
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");

    // If userId is provided and user is admin, allow fetching other user's history
    let targetUserId: string;
    if (userIdParam && session.user.role === "admin") {
      targetUserId = userIdParam;
    } else {
      // Otherwise, fetch the current user's history
      const user = await getUserByEmail(session.user.email!);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      targetUserId = user.id;
    }

    const history = await getUserReviewerApplicationHistory(targetUserId);
    return NextResponse.json({ history });
  } catch (error) {
    safeLog.error("Error fetching reviewer application history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

