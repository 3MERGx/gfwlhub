import { NextRequest, NextResponse } from "next/server";
import { getGFWLDatabase } from "@/lib/mongodb";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { toObjectId } from "@/lib/mongo-sanitize";
import { revalidatePath } from "next/cache";
import { validateCSRFToken } from "@/lib/csrf";
import { requireSession } from "@/lib/api-auth";

// GET - Get user settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const identifier = getClientIdentifier(request, auth.user.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { id } = await params;
    const sanitizedId = sanitizeString(String(id || ""), 50);

    if (auth.user.id !== sanitizedId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const identifier = getClientIdentifier(request, auth.user.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { id } = await params;
    const sanitizedId = sanitizeString(String(id || ""), 50);

    if (auth.user.id !== sanitizedId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const objectId = toObjectId(sanitizedId);
    if (!objectId) {
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
    const user = await usersCollection.findOne({ _id: objectId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = user.settings && typeof user.settings === "object" && !Array.isArray(user.settings)
      ? (user.settings as Record<string, unknown>)
      : {};

    const mergedSettings: Record<string, boolean | string> = {};
    if (typeof existing.showStatistics === "boolean") {
      mergedSettings.showStatistics = existing.showStatistics;
    }
    if (typeof existing.emailNotifications === "boolean") {
      mergedSettings.emailNotifications = existing.emailNotifications;
    }
    if (typeof existing.reviewNotifications === "boolean") {
      mergedSettings.reviewNotifications = existing.reviewNotifications;
    }
    if (existing.theme === "dark" || existing.theme === "light") {
      mergedSettings.theme = existing.theme;
    }
    if (typeof existing.publicProfile === "boolean") {
      mergedSettings.publicProfile = existing.publicProfile;
    }

    if (typeof showStatistics === "boolean") {
      mergedSettings.showStatistics = showStatistics;
    }
    if (typeof emailNotifications === "boolean") {
      mergedSettings.emailNotifications = emailNotifications;
    }
    if (typeof reviewNotifications === "boolean") {
      mergedSettings.reviewNotifications = reviewNotifications;
    }
    if (sanitizedTheme && (sanitizedTheme === "dark" || sanitizedTheme === "light")) {
      mergedSettings.theme = sanitizedTheme;
    }

    await usersCollection.updateOne(
      { _id: objectId },
      {
        $set: {
          settings: mergedSettings,
          updatedAt: new Date(),
        },
      }
    );

    // Revalidate paths
    revalidatePath("/settings");
    revalidatePath(`/profile/${sanitizedId}`);

    return NextResponse.json({ success: true, settings: mergedSettings });
  } catch (error) {
    safeLog.error("Error updating user settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

