import { NextRequest, NextResponse } from "next/server";
import { getReviewerApplications } from "@/lib/crowdsource-service-mongodb";
import { rateLimiters, getClientIdentifier } from "@/lib/security";
import { ReviewerApplicationStatus } from "@/types/crowdsource";
import { requireAdmin } from "@/lib/api-auth";
import { internalError, jsonError } from "@/lib/api-error";
import { parseEnum } from "@/lib/request-validation";

const APPLICATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const satisfies readonly ReviewerApplicationStatus[];

// GET - List all reviewer applications (admin only)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const identifier = getClientIdentifier(request, auth.user.id);
    if (!rateLimiters.admin.isAllowed(identifier)) {
      return jsonError("Too many requests. Please try again later.", 429);
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    let status: ReviewerApplicationStatus | undefined;
    if (statusParam) {
      const parsed = parseEnum(statusParam, APPLICATION_STATUSES, 20);
      if (!parsed) {
        return jsonError("Invalid status", 400);
      }
      status = parsed;
    }

    const applications = await getReviewerApplications(status);
    return NextResponse.json({ applications });
  } catch (error) {
    return internalError("Error fetching reviewer applications:", error);
  }
}
