import { NextRequest, NextResponse } from "next/server";
import { getGFWLDatabase } from "@/lib/mongodb";
import { canManageUsers, deleteUserAndAnonymizeContent } from "@/lib/crowdsource-service-mongodb";
import { toObjectId } from "@/lib/mongo-sanitize";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { parseEnum, parseIsoDateInRange } from "@/lib/request-validation";
import { revalidatePath } from "next/cache";
import { validateCSRFToken } from "@/lib/csrf";
import { triggerPusherEvent, PUSHER_EVENTS } from "@/lib/pusher-server";
import { requireAdmin, requireSession } from "@/lib/api-auth";

// GET - Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;
    const { user: viewer } = auth;

    const identifier = getClientIdentifier(request, viewer.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { id } = await params;
    const sanitizedId = sanitizeString(String(id || ""), 50);
    
    const objectId = toObjectId(sanitizedId);
    if (!objectId) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const db = await getGFWLDatabase();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({ _id: objectId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isOwner = viewer.id === sanitizedId;
    const isAdmin = canManageUsers(viewer);
    const isPublic = user.settings?.publicProfile !== false;

    if (!isOwner && !isAdmin && !isPublic) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const showStatistics =
      isOwner || isAdmin || user.settings?.showStatistics !== false;

    const publicSettings = {
      publicProfile: user.settings?.publicProfile ?? true,
      showStatistics: user.settings?.showStatistics ?? true,
    };

    return NextResponse.json(
      {
        id: user._id.toString(),
        name: user.name,
        avatar: user.image,
        role: user.role || "user",
        status: user.status || "active",
        createdAt: user.createdAt || new Date(),
        settings: isOwner || isAdmin ? (user.settings || publicSettings) : publicSettings,
        ...(showStatistics
          ? {
              submissionsCount: user.submissionsCount || 0,
              approvedCount: user.approvedCount || 0,
              rejectedCount: user.rejectedCount || 0,
            }
          : {}),
        ...(isOwner || isAdmin
          ? {
              email: user.email,
              provider: user.providerInfo?.provider || "unknown",
              lastLoginAt: user.lastLoginAt || undefined,
              providerInfo: user.providerInfo,
            }
          : {}),
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    safeLog.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update user role or status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const { session } = auth;

    const identifier = getClientIdentifier(request, session.user.id);
    if (!rateLimiters.admin.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    
    // CSRF protection
    const csrfToken = request.headers.get("X-CSRF-Token") || body._csrf;
    if (!(await validateCSRFToken(csrfToken))) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 }
      );
    }
    
    // Remove CSRF token from body if present
    delete body._csrf;
    
    const { role, status, suspendedUntil, moderationReason } = body;

    // Sanitize inputs
    const sanitizedId = sanitizeString(String(id || ""), 50);
    const sanitizedRole = role
      ? parseEnum(role, ["user", "reviewer", "admin"] as const, 50)
      : undefined;
    const sanitizedStatus = status
      ? parseEnum(
          status,
          ["active", "suspended", "restricted", "blocked"] as const,
          50
        )
      : undefined;
    const sanitizedModerationReason = moderationReason ? sanitizeString(String(moderationReason), 2000) : undefined;

    const objectId = toObjectId(sanitizedId);
    if (!objectId) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    // Validate that at least one field is being updated
    if (!sanitizedRole && !sanitizedStatus) {
      return NextResponse.json(
        { error: "Must provide role or status to update" },
        { status: 400 }
      );
    }

    if (role && !sanitizedRole) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (status && !sanitizedStatus) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const db = await getGFWLDatabase();
    const usersCollection = db.collection("users");

    // Check if user exists
    const user = await usersCollection.findOne({ _id: objectId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Security: Only developers can change admin roles
    // Regular admins cannot change other admins' roles or promote to admin
    if (sanitizedRole) {
      const isDeveloper = (() => {
        const devEmails =
          process.env.DEVELOPER_EMAILS?.split(",").map((e) => e.trim()) || [];
        return session.user.email && devEmails.includes(session.user.email);
      })();

      // If target user is admin, only developers can change their role
      if (user.role === "admin" && !isDeveloper) {
        return NextResponse.json(
          {
            error:
              "Only developers can change admin roles. Regular admins cannot modify other admins.",
          },
          { status: 403 }
        );
      }

      // If promoting to admin, only developers can do this
      if (sanitizedRole === "admin" && !isDeveloper) {
        return NextResponse.json(
          {
            error:
              "Only developers can promote users to admin. Regular admins can only promote to reviewer.",
          },
          { status: 403 }
        );
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (sanitizedRole) {
      updateData.role = sanitizedRole;
    }

    if (sanitizedStatus) {
      updateData.status = sanitizedStatus;

      // If setting to active or restricted, remove suspendedUntil
      if (sanitizedStatus === "active" || sanitizedStatus === "restricted") {
        await usersCollection.updateOne(
          { _id: objectId },
          { $unset: { suspendedUntil: "" } }
        );
      }

      // If suspending, set the suspendedUntil date
      if (sanitizedStatus === "suspended" && suspendedUntil) {
        const parsedUntil = parseIsoDateInRange(suspendedUntil);
        if (!parsedUntil) {
          return NextResponse.json(
            { error: "Invalid suspension end date" },
            { status: 400 }
          );
        }
        updateData.suspendedUntil = parsedUntil;
      }
    }

    // Update user
    await usersCollection.updateOne(
      { _id: objectId },
      { $set: updateData }
    );

    // Create moderation log entry if status or role changed
    if (sanitizedStatus || sanitizedRole) {
      const moderationAction = {
        moderatedUser: {
          id: id,
          name: user.name || "Unknown User",
        },
        moderator: {
          id: session.user.id,
          name: session.user.name || "Unknown Admin",
        },
        timestamp: new Date(),
        action: sanitizedRole
          ? `Role changed to ${sanitizedRole}`
          : sanitizedStatus
          ? `Status changed to ${sanitizedStatus}`
          : "User updated",
        reason: sanitizedModerationReason || "No reason provided",
        previousRole: sanitizedRole ? user.role : undefined,
        newRole: sanitizedRole || undefined,
        previousStatus: sanitizedStatus ? user.status : undefined,
        newStatus: sanitizedStatus || undefined,
      };

      // Add moderation action to user's moderationHistory array
      await usersCollection.updateOne(
        { _id: objectId },
        {
          $push: {
            moderationHistory: {
              $each: [moderationAction],
              $position: 0,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          },
        }
      );
    }

    // Revalidate paths
    revalidatePath("/dashboard/users");
    revalidatePath(`/profile/${sanitizedId}`);
    revalidatePath("/");

    triggerPusherEvent(PUSHER_EVENTS.USERS_UPDATED, { userId: sanitizedId });

    return NextResponse.json({ success: true });
  } catch (error) {
    safeLog.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete user account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;
    const { user: actor } = auth;

    const identifier = getClientIdentifier(request, actor.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // CSRF protection
    const csrfToken = request.headers.get("X-CSRF-Token");
    if (!(await validateCSRFToken(csrfToken))) {
      return NextResponse.json(
        { error: "Invalid CSRF token" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const sanitizedId = sanitizeString(String(id || ""), 50);

    if (!toObjectId(sanitizedId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    // Users can only delete their own account
    if (actor.id !== sanitizedId) {
      return NextResponse.json(
        { error: "You can only delete your own account" },
        { status: 403 }
      );
    }

    // Call the soft delete function (marks as deleted, keeps provider info for tracking)
    await deleteUserAndAnonymizeContent(sanitizedId);

    // Revalidate paths
    revalidatePath("/dashboard/users");
    revalidatePath(`/profile/${sanitizedId}`);
    revalidatePath("/");

    triggerPusherEvent(PUSHER_EVENTS.USERS_UPDATED, { userId: sanitizedId });

    return NextResponse.json({ success: true });
  } catch (error) {
    safeLog.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
