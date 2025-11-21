import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { restoreDeletedUser } from "@/lib/crowdsource-service-mongodb";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // Only admins can restore deleted users
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check for admin override (developer-only feature)
    const body = await request.json().catch(() => ({}));
    const adminOverride = body.adminOverride === true;

    // Only developers can use admin override
    const devEmails =
      process.env.DEVELOPER_EMAILS?.split(",").map((e) => e.trim()) || [];
    const isDeveloper =
      session.user.email && devEmails.includes(session.user.email);

    if (adminOverride && !isDeveloper) {
      return NextResponse.json(
        { error: "Only developers can override grace period restrictions" },
        { status: 403 }
      );
    }

    // Restore the user
    const restored = await restoreDeletedUser(id, adminOverride);

    if (!restored) {
      return NextResponse.json(
        {
          error: adminOverride
            ? "Cannot restore this user. They may not be deleted."
            : "Cannot restore this user. Grace period (30 days) has expired or they may be anonymized. Contact a developer for admin override.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      overrideUsed: adminOverride,
    });
  } catch (error) {
    console.error("Error restoring user:", error);
    return NextResponse.json(
      { error: "Failed to restore user" },
      { status: 500 }
    );
  }
}
