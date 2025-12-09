import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { validateCSRFToken } from "@/lib/csrf";

// PATCH - Toggle featureEnabled for a game (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
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

    // Only admins can toggle features
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const { slug } = await params;
    const { featureEnabled } = body;

    // Sanitize inputs
    const sanitizedSlug = sanitizeString(String(slug || ""), 200);

    if (!sanitizedSlug) {
      return NextResponse.json(
        { error: "Invalid game slug" },
        { status: 400 }
      );
    }

    // Validate featureEnabled
    if (typeof featureEnabled !== "boolean") {
      return NextResponse.json(
        { error: "featureEnabled must be a boolean" },
        { status: 400 }
      );
    }

    const db = await getGFWLDatabase();
    const gamesCollection = db.collection("Games"); // Use capital G to match games-service

    // Generate update ID (timestamp-based)
    const updateId = `${Date.now()}-${slug}`;
    
    // Create update history entry (for feature toggles, admin is both submitter and reviewer)
    const updateHistoryEntry = {
      updateId,
      timestamp: new Date(),
      submitter: {
        id: session.user.id,
        name: session.user.name || "Unknown",
      },
      reviewer: {
        id: session.user.id,
        name: session.user.name || "Unknown",
      },
      field: "featureEnabled",
      updateType: "featureToggle" as const,
      notes: `Feature ${featureEnabled ? "enabled" : "disabled"} by admin`,
    };

    // Update existing game document with featureEnabled flag and update history
    await gamesCollection.updateOne(
      { slug: sanitizedSlug },
      {
        $set: {
          featureEnabled,
          updatedAt: new Date(),
          updatedBy: session.user.id,
          updatedByName: session.user.name || "Unknown",
        },
        $push: {
          updateHistory: updateHistoryEntry,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      }
    );

    // Revalidate paths
    revalidatePath("/dashboard/games");
    revalidatePath(`/games/${sanitizedSlug}`);
    revalidatePath("/");
    revalidatePath("/supported-games");
    // Revalidate API route cache
    revalidatePath("/api/games");

    return NextResponse.json({ success: true, featureEnabled });
  } catch (error) {
    safeLog.error("Error toggling game feature:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

