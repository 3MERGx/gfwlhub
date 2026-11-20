import { NextRequest, NextResponse } from "next/server";
import { getReviewerActionLogs } from "@/lib/crowdsource-service-mongodb";
import { rateLimiters, getClientIdentifier } from "@/lib/security";
import { requireAdmin } from "@/lib/api-auth";
import { internalError, jsonError } from "@/lib/api-error";
import { parseClampedLimit } from "@/lib/request-validation";

// GET - Get reviewer action logs (admin only)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const identifier = getClientIdentifier(request, auth.user.id);
    if (!rateLimiters.admin.isAllowed(identifier)) {
      return jsonError("Too many requests. Please try again later.", 429);
    }

    const { searchParams } = new URL(request.url);
    const reviewerIdParam = searchParams.get("reviewerId");
    const limit = parseClampedLimit(searchParams.get("limit"), {
      defaultLimit: 100,
      min: 1,
      max: 1000,
    });

    const logs = await getReviewerActionLogs(
      reviewerIdParam ?? undefined,
      limit
    );
    return NextResponse.json({ logs });
  } catch (error) {
    return internalError("Error fetching reviewer action logs:", error);
  }
}
