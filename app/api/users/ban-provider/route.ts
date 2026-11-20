import { NextRequest, NextResponse } from "next/server";
import { addBannedProvider } from "@/lib/crowdsource-service-mongodb";
import { sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { requireAdmin } from "@/lib/api-auth";
import { internalError, jsonError } from "@/lib/api-error";
import { revalidatePath } from "next/cache";
import { readCsrfToken, validateCSRFToken } from "@/lib/csrf";
import { triggerPusherEvent, PUSHER_EVENTS } from "@/lib/pusher-server";
import {
  parseObjectIdParam,
  parseOAuthProvider,
} from "@/lib/request-validation";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    const { session } = auth;

    const identifier = getClientIdentifier(request, session.user.id);
    if (!rateLimiters.admin.isAllowed(identifier)) {
      return jsonError("Too many requests. Please try again later.", 429);
    }

    const body = await request.json();
    const csrfToken = readCsrfToken(request, body);
    if (!(await validateCSRFToken(csrfToken))) {
      return jsonError("Invalid CSRF token", 403);
    }

    delete body._csrf;

    const { userId, provider, providerAccountId, reason, notes } = body;

    const parsedProvider = parseOAuthProvider(provider);
    const sanitizedProviderAccountId = sanitizeString(
      String(providerAccountId || ""),
      200
    );
    const sanitizedReason = sanitizeString(String(reason || ""), 2000);
    const sanitizedNotes = notes
      ? sanitizeString(String(notes), 2000)
      : undefined;

    if (!parsedProvider || !sanitizedProviderAccountId || !sanitizedReason) {
      return jsonError(
        "Provider, provider account ID, and reason are required",
        400
      );
    }

    let sanitizedUserId: string | undefined;
    if (userId) {
      const objectId = parseObjectIdParam(userId);
      if (!objectId) {
        return jsonError("Invalid user ID", 400);
      }
      sanitizedUserId = objectId.toString();
    }

    await addBannedProvider({
      provider: parsedProvider,
      providerAccountId: sanitizedProviderAccountId,
      userId: sanitizedUserId,
      reason: sanitizedReason,
      notes: sanitizedNotes,
      bannedBy: session.user.id,
      bannedByName: session.user.name || "Unknown",
    });

    revalidatePath("/dashboard/users");
    revalidatePath("/");

    triggerPusherEvent(
      PUSHER_EVENTS.USERS_UPDATED,
      sanitizedUserId ? { userId: sanitizedUserId } : {}
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    return internalError("Error banning provider:", error);
  }
}
