import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  getReviewerApplications,
  getUserByEmail,
  canManageUsers,
} from "@/lib/crowdsource-service-mongodb";
import { safeLog, sanitizeString } from "@/lib/security";
import { ReviewerApplicationStatus } from "@/types/crowdsource";

// GET - List all reviewer applications (admin only)
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

    // Get status filter from query params
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const status = statusParam
      ? (sanitizeString(statusParam, 20) as ReviewerApplicationStatus)
      : undefined;

    // Validate status if provided
    if (status && !["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const applications = await getReviewerApplications(status);
    return NextResponse.json({ applications });
  } catch (error) {
    safeLog.error("Error fetching reviewer applications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

