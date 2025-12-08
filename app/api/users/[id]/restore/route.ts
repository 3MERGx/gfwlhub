import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { restoreDeletedUser } from "@/lib/crowdsource-service-mongodb";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { validateCSRFToken } from "@/lib/csrf";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const session = await getServerSession(authOptions);
    const identifier = getClientIdentifier(request, session?.user?.id);
    if (!rateLimiters.admin.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Only admins can restore deleted users
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const sanitizedId = sanitizeString(String(id || ""), 50);

    if (!sanitizedId || !/^[a-f\d]{24}$/i.test(sanitizedId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    // CSRF protection
    const body = await request.json().catch(() => ({}));
    const csrfToken = request.headers.get("X-CSRF-Token") || body._csrf;
    if (!(await validateCSRFToken(csrfToken))) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 }
      );
    }
    
    // Remove CSRF token from body if present
    delete body._csrf;
    
    // Check for admin override (developer-only feature)
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
    const restored = await restoreDeletedUser(sanitizedId, adminOverride);

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

    // Revalidate paths
    revalidatePath("/dashboard/users");
    revalidatePath(`/profile/${sanitizedId}`);
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      overrideUsed: adminOverride,
    });
  } catch (error) {
    safeLog.error("Error restoring user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
