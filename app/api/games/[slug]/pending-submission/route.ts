import { NextRequest, NextResponse } from "next/server";
import { getGFWLDatabase } from "@/lib/mongodb";
import { sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { requireSession } from "@/lib/api-auth";
import { canReviewCorrections } from "@/lib/crowdsource-service-mongodb";
import { internalError, jsonError } from "@/lib/api-error";

// GET - Check if there's a pending submission for a game
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const identifier = getClientIdentifier(request, auth.user.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return jsonError("Too many requests. Please try again later.", 429);
    }

    const { slug } = await params;
    const sanitizedSlug = sanitizeString(String(slug || ""), 200);

    if (!sanitizedSlug) {
      return jsonError("Invalid game slug", 400);
    }

    const db = await getGFWLDatabase();
    const submissionsCollection = db.collection("gameSubmissions");

    const pendingSubmission = await submissionsCollection.findOne({
      gameSlug: sanitizedSlug,
      status: "pending",
    });

    if (!pendingSubmission) {
      return NextResponse.json(
        { hasPendingSubmission: false },
        {
          headers: {
            "Cache-Control": "private, no-cache, must-revalidate",
          },
        }
      );
    }

    const isOwner = auth.user.id === pendingSubmission.submittedBy;
    const isStaff = canReviewCorrections(auth.user);
    if (!isOwner && !isStaff) {
      return NextResponse.json(
        { hasPendingSubmission: true },
        {
          headers: {
            "Cache-Control": "private, no-cache, must-revalidate",
          },
        }
      );
    }

    return NextResponse.json(
      {
        hasPendingSubmission: true,
        submittedByName: pendingSubmission.submittedByName,
        submittedAt: pendingSubmission.submittedAt,
        proposedData: pendingSubmission.proposedData,
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    return internalError("Error checking pending submission:", error);
  }
}
