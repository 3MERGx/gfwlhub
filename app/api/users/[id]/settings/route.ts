import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { validateCSRFToken } from "@/lib/csrf";

// GET - Get user settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const session = await getServerSession(authOptions);
    const identifier = getClientIdentifier(request, session?.user?.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { id } = await params;
    const sanitizedId = sanitizeString(String(id || ""), 50);

    // Users can only view their own settings
    if (!session || session.user.id !== sanitizedId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!sanitizedId || !ObjectId.isValid(sanitizedId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const db = await getGFWLDatabase();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({ _id: new ObjectId(sanitizedId) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return user settings (defaults if not set)
    return NextResponse.json(
      {
        showStatistics: user.settings?.showStatistics ?? true,
        emailNotifications: user.settings?.emailNotifications ?? false,
        reviewNotifications: user.settings?.reviewNotifications ?? false,
        theme: user.settings?.theme ?? "dark",
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    safeLog.error("Error fetching user settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update user settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const session = await getServerSession(authOptions);
    const identifier = getClientIdentifier(request, session?.user?.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { id } = await params;
    const sanitizedId = sanitizeString(String(id || ""), 50);

    // Users can only update their own settings
    if (!session || session.user.id !== sanitizedId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!sanitizedId || !ObjectId.isValid(sanitizedId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
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
    
    // Remove CSRF token from body if present
    delete body._csrf;
    
    const { showStatistics, emailNotifications, reviewNotifications, theme } = body;

    // Sanitize theme if provided
    const sanitizedTheme = theme ? sanitizeString(String(theme), 20) : undefined;

    const db = await getGFWLDatabase();
    const usersCollection = db.collection("users");

    // Check if user exists
    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build settings object
    const settings: Record<string, boolean | string> = {};
    if (typeof showStatistics === "boolean") {
      settings.showStatistics = showStatistics;
    }
    if (typeof emailNotifications === "boolean") {
      settings.emailNotifications = emailNotifications;
    }
    if (typeof reviewNotifications === "boolean") {
      settings.reviewNotifications = reviewNotifications;
    }
    if (sanitizedTheme && (sanitizedTheme === "dark" || sanitizedTheme === "light")) {
      settings.theme = sanitizedTheme;
    }

    // Update user settings
    await usersCollection.updateOne(
      { _id: new ObjectId(sanitizedId) },
      {
        $set: {
          settings: {
            ...(user.settings || {}),
            ...settings,
          },
          updatedAt: new Date(),
        },
      }
    );

    // Revalidate paths
    revalidatePath("/settings");
    revalidatePath(`/profile/${sanitizedId}`);

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    safeLog.error("Error updating user settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

