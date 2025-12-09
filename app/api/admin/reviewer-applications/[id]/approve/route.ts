import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  approveReviewerApplication,
  getReviewerApplicationById,
  getUserByEmail,
  canManageUsers,
} from "@/lib/crowdsource-service-mongodb";
import { ReviewerApplication } from "@/types/crowdsource";
import {
  safeLog,
  sanitizeString,
  rateLimiters,
  getClientIdentifier,
} from "@/lib/security";
import { validateCSRFToken } from "@/lib/csrf";
import { notifyReviewerApplicationReviewed } from "@/lib/discord-webhook";

// POST - Approve a reviewer application (admin only)
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

    // Approve application
    await approveReviewerApplication(
      sanitizedId,
      user.id,
      user.name,
      adminNotes
    );

    // Get updated application to check for discordMessageIds
    const updatedApplication = await getReviewerApplicationById(sanitizedId);

    // Send Discord notification (non-blocking)
    // Update existing webhook messages if message IDs exist, otherwise create new messages
    // Support both old format (single message ID) and new format (array of message IDs)
    if (updatedApplication) {
      const appWithExtras = updatedApplication as ReviewerApplication & {
        discordMessageIds?: (string | null)[];
        discordMessageId?: string;
      };
      const rawMessageIds = appWithExtras.discordMessageIds || 
                           (appWithExtras.discordMessageId ? [appWithExtras.discordMessageId] : null);
      
      // Filter out null values and convert to string[] if it's an array
      const discordMessageIds: string | string[] | null = rawMessageIds 
        ? (Array.isArray(rawMessageIds) 
            ? (rawMessageIds.filter((id): id is string => id !== null) as string[])
            : rawMessageIds)
        : null;
      
      notifyReviewerApplicationReviewed(
        {
          id: updatedApplication.id,
          userName: updatedApplication.userName || "Unknown",
          userEmail: updatedApplication.userEmail || "",
          status: "approved",
          reviewedByName: user.name || "Unknown",
          adminNotes: adminNotes || undefined,
        },
        discordMessageIds
      ).catch((error) => {
        safeLog.error("Failed to send Discord notification:", error);
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    safeLog.error("Error approving reviewer application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

