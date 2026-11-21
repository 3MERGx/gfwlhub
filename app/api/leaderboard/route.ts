import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { safeLog, rateLimiters, getClientIdentifier } from "@/lib/security";

export async function GET(request: Request) {
  try {
    const identifier = getClientIdentifier(request);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const client = await clientPromise;
    const db = client.db("GFWL");
    const usersCollection = db.collection("users");

    const users = await usersCollection
      .find(
        {
          status: { $in: ["active", "suspended"] },
          submissionsCount: { $gt: 0 },
        },
        {
          projection: {
            _id: 1,
            name: 1,
            image: 1,
            role: 1,
            submissionsCount: 1,
            approvedCount: 1,
            rejectedCount: 1,
          },
        }
      )
      .toArray();

    const leaderboardData = users.map((user) => {
      const reviewedCount =
        (user.approvedCount || 0) + (user.rejectedCount || 0);
      const approvalRate =
        reviewedCount > 0
          ? ((user.approvedCount || 0) / reviewedCount) * 100
          : 0;

      return {
        id: user._id.toString(),
        name: user.name || "Unknown User",
        avatar: user.image || null,
        role: user.role || "user",
        submissionsCount: user.submissionsCount || 0,
        approvedCount: user.approvedCount || 0,
        rejectedCount: user.rejectedCount || 0,
        reviewedCount,
        approvalRate,
      };
    });

    leaderboardData.sort((a, b) => {
      const rateDiff = b.approvalRate - a.approvalRate;
      if (Math.abs(rateDiff) > 0.01) {
        return rateDiff;
      }
      return b.submissionsCount - a.submissionsCount;
    });

    return NextResponse.json(leaderboardData, {
      headers: {
        "Cache-Control":
          "public, s-maxage=1800, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    safeLog.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
