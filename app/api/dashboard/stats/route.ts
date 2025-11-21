import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    // Check authentication - only reviewers and admins can access
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role;
    if (userRole !== "reviewer" && userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getGFWLDatabase();

    // Fetch users
    const users = await db.collection("users").find({}).toArray();
    
    // Fetch corrections (submissions)
    const corrections = await db.collection("corrections").find({}).toArray();
    
    // Count audit logs
    const totalChanges = await db.collection("auditLogs").countDocuments();

    // Calculate stats
    const stats = {
      totalUsers: users.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      activeUsers: users.filter((u: any) => (u.status || "active") === "active").length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      suspendedUsers: users.filter((u: any) => (u.status || "active") === "suspended").length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      blockedUsers: users.filter((u: any) => (u.status || "active") === "blocked").length,
      totalSubmissions: corrections.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pendingSubmissions: corrections.filter((c: any) => (c.status || "pending") === "pending").length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      approvedSubmissions: corrections.filter((c: any) => (c.status || "pending") === "approved").length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rejectedSubmissions: corrections.filter((c: any) => (c.status || "pending") === "rejected").length,
      totalChanges: totalChanges,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}

