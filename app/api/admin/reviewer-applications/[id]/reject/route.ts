import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  rejectReviewerApplication,
  getReviewerApplicationById,
  getUserByEmail,
  canManageUsers,
} from "@/lib/crowdsource-service-mongodb";
import {
  safeLog,
  sanitizeString,
  rateLimiters,
  getClientIdentifier,
} from "@/lib/security";
import { validateCSRFToken } from "@/lib/csrf";

// POST - Reject a reviewer application (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const identifier = getClientIdentifier(request, session.user.id);
    if (!rateLimiters.admin.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
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

    // CSRF protection
    const body = await request.json();
    const csrfToken = request.headers.get("X-CSRF-Token") || body._csrf;
    if (!(await validateCSRFToken(csrfToken))) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const sanitizedId = sanitizeString(id, 50);
    const adminNotes = body.adminNotes
      ? sanitizeString(String(body.adminNotes), 1000)
      : undefined;

    // Check if application exists
    const application = await getReviewerApplicationById(sanitizedId);
    if (!application) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 404 }
      );
    }

    // Check if already processed
    if (application.status !== "pending") {
      return NextResponse.json(
        { error: "Application has already been processed" },
        { status: 400 }
      );
    }

    // Reject application
    await rejectReviewerApplication(
      sanitizedId,
      user.id,
      user.name,
      adminNotes
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    safeLog.error("Error rejecting reviewer application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

