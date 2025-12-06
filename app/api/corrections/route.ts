import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  createCorrection,
  getPendingCorrections,
  getAllCorrections,
  canSubmitCorrections,
  getUserByEmail,
} from "@/lib/crowdsource-service-mongodb";
import { CorrectionField } from "@/types/crowdsource";
import { notifyCorrectionSubmitted } from "@/lib/discord-webhook";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { validateCSRFToken } from "@/lib/csrf";

// POST - Submit a new correction
export async function POST(request: NextRequest) {
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

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await getUserByEmail(session.user.email!);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user can submit corrections
    if (!canSubmitCorrections(user)) {
      return NextResponse.json(
        { 
          error: "Your account is suspended or blocked",
          userStatus: user.status,
          userId: user.id 
        },
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
    
    // Remove CSRF token from body if present
    delete body._csrf;
    const {
      gameId,
      gameSlug,
      gameTitle,
      field,
      oldValue,
      newValue,
      reason,
    } = body;

    // Sanitize and validate inputs
    const sanitizedGameId = sanitizeString(String(gameId || ""), 50);
    const sanitizedGameSlug = sanitizeString(String(gameSlug || ""), 200);
    const sanitizedGameTitle = sanitizeString(String(gameTitle || ""), 500);
    const sanitizedField = sanitizeString(String(field || ""), 100);
    const sanitizedReason = sanitizeString(String(reason || ""), 2000);

    // Validate required fields
    if (
      !sanitizedGameId ||
      !sanitizedGameSlug ||
      !sanitizedGameTitle ||
      !sanitizedField ||
      !sanitizedReason
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate newValue based on field type
    // Required fields (title, status, activationType) cannot be null/empty
    const requiredFields = ["title", "status", "activationType"];
    if (requiredFields.includes(sanitizedField)) {
      if (newValue === undefined || newValue === null || newValue === "") {
        return NextResponse.json(
          { error: `Field "${sanitizedField}" is required and cannot be cleared` },
          { status: 400 }
        );
      }
    }
    // For optional fields, null is allowed (to clear the field)
    // but newValue must be explicitly provided (not undefined)
    else if (newValue === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Sanitize newValue if it's a string
    let sanitizedNewValue = newValue;
    if (typeof newValue === "string") {
      sanitizedNewValue = sanitizeString(newValue, 5000);
    } else if (Array.isArray(newValue)) {
      sanitizedNewValue = newValue.map((item) => 
        typeof item === "string" ? sanitizeString(item, 500) : item
      );
    }

    // Create correction
    const correction = await createCorrection({
      gameId: sanitizedGameId,
      gameSlug: sanitizedGameSlug,
      gameTitle: sanitizedGameTitle,
      submittedBy: user.id,
      submittedByName: user.name,
      field: sanitizedField as CorrectionField,
      oldValue: oldValue === undefined ? null : oldValue,
      newValue: sanitizedNewValue,
      reason: sanitizedReason,
    });

    // Send Discord notification (non-blocking)
    notifyCorrectionSubmitted({
      id: correction.id,
      gameTitle: correction.gameTitle,
      gameSlug: correction.gameSlug,
      field: correction.field,
      submittedByName: correction.submittedByName,
      reason: correction.reason,
      oldValue: correction.oldValue,
      newValue: correction.newValue,
    }).catch((error) => {
      safeLog.error("Failed to send Discord notification:", error);
    });

    // Revalidate paths
    revalidatePath("/dashboard/submissions");
    revalidatePath(`/games/${sanitizedGameSlug}`);
    revalidatePath("/");

    return NextResponse.json({ correction }, { status: 201 });
  } catch (error) {
    safeLog.error("Error submitting correction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Fetch corrections (with optional filters)
export async function GET(request: NextRequest) {
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

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await getUserByEmail(session.user.email!);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = sanitizeString(searchParams.get("status") || "", 50);
    const gameSlug = sanitizeString(searchParams.get("gameSlug") || "", 200);
    const userId = sanitizeString(searchParams.get("userId") || "", 50);

    // Only reviewers and admins can see all corrections
    // Regular users can only see their own
    if (user.role === "user") {
      // Fetch user's own corrections
      const { getCorrectionsByUser } = await import(
        "@/lib/crowdsource-service-mongodb"
      );
      const corrections = await getCorrectionsByUser(user.id);
      return NextResponse.json({ corrections });
    }

    // For reviewers and admins, handle filtering
    if (status === "pending") {
      const corrections = await getPendingCorrections();
      return NextResponse.json({ corrections });
    }

    if (gameSlug) {
      const { getCorrectionsByGame } = await import(
        "@/lib/crowdsource-service-mongodb"
      );
      const corrections = await getCorrectionsByGame(gameSlug);
      return NextResponse.json({ corrections });
    }

    if (userId) {
      const { getCorrectionsByUser } = await import(
        "@/lib/crowdsource-service-mongodb"
      );
      const corrections = await getCorrectionsByUser(userId);
      return NextResponse.json({ corrections });
    }

    // Return all corrections by default for reviewers/admins (for stats and full view)
    // Limit to 1000 corrections to prevent memory issues
    const corrections = await getAllCorrections(1000);
    return NextResponse.json(
      { corrections },
      {
        headers: {
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    safeLog.error("Error fetching corrections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

