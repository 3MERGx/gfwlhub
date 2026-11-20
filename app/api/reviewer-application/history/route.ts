import { NextRequest, NextResponse } from "next/server";
import {
  canManageUsers,
  getUserReviewerApplicationHistory,
} from "@/lib/crowdsource-service-mongodb";
import { sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { requireSession } from "@/lib/api-auth";
import { internalError, jsonError } from "@/lib/api-error";

// GET - Get user's reviewer application history
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;
    const { user } = auth;

    const identifier = getClientIdentifier(request, user.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return jsonError("Too many requests. Please try again later.", 429);
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = sanitizeString(searchParams.get("userId") || "", 50);

    let targetUserId = user.id;
    if (userIdParam && userIdParam !== user.id) {
      if (!canManageUsers(user)) {
        return jsonError("Forbidden", 403);
      }
      targetUserId = userIdParam;
    }

    const history = await getUserReviewerApplicationHistory(targetUserId);
    return NextResponse.json({ history });
  } catch (error) {
    return internalError("Error fetching reviewer application history:", error);
  }
}
