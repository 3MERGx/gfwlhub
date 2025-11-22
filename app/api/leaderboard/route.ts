import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is reviewer or admin (feature flag)
    if (session.user.role !== "admin" && session.user.role !== "reviewer") {
      return NextResponse.json(
        { error: "Access denied. Reviewers and admins only." },
        { status: 403 }
      );
    }

    const client = await clientPromise;
    const db = client.db("GFWL");
    const usersCollection = db.collection("users");

    // Get only active and suspended users with submissions (exclude restricted, blocked, and deleted)
    const users = await usersCollection
      .find({
        status: { $in: ["active", "suspended"] }, // Only active and suspended users
        submissionsCount: { $gt: 0 }, // Only users with submissions
      })
      .toArray();

    // Calculate leaderboard data
    const leaderboardData = users.map((user) => {
      const reviewedCount = (user.approvedCount || 0) + (user.rejectedCount || 0);
      const approvalRate = reviewedCount > 0 
        ? ((user.approvedCount || 0) / reviewedCount) * 100 
        : 0;

      return {
        id: user._id.toString(),
        name: user.name || "Unknown User",
        email: user.email,
        avatar: user.image || null,
        role: user.role || "user",
        status: user.status || "active",
        submissionsCount: user.submissionsCount || 0,
        approvedCount: user.approvedCount || 0,
        rejectedCount: user.rejectedCount || 0,
        reviewedCount,
        approvalRate,
        createdAt: user.createdAt || new Date(),
        lastLoginAt: user.lastLoginAt || new Date(),
      };
    });

    // Sort by approval rate (descending), then by submission count (descending) for ties
    leaderboardData.sort((a, b) => {
      // First compare approval rates
      const rateDiff = b.approvalRate - a.approvalRate;
      if (Math.abs(rateDiff) > 0.01) { // Not a tie (allowing for floating point precision)
        return rateDiff;
      }
      // If approval rates are the same, prioritize users with more submissions
      return b.submissionsCount - a.submissionsCount;
    });

    return NextResponse.json(leaderboardData);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard data" },
      { status: 500 }
    );
  }
}

