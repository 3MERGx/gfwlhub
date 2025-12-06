import { NextRequest, NextResponse } from "next/server";
import { getGFWLDatabase } from "@/lib/mongodb";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";

// GET - Check if there's a pending submission for a game
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(request);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { slug } = await params;
    const sanitizedSlug = sanitizeString(String(slug || ""), 200);

    if (!sanitizedSlug) {
      return NextResponse.json(
        { error: "Invalid game slug" },
        { status: 400 }
      );
    }

    const db = await getGFWLDatabase();
    const submissionsCollection = db.collection("gameSubmissions");

    // Check for pending submissions for this game
    const pendingSubmission = await submissionsCollection.findOne({
      gameSlug: sanitizedSlug,
      status: "pending",
    });

    if (pendingSubmission) {
      return NextResponse.json({
        hasPendingSubmission: true,
        submittedByName: pendingSubmission.submittedByName,
        submittedAt: pendingSubmission.submittedAt,
        proposedData: pendingSubmission.proposedData,
      });
    }

    return NextResponse.json(
      {
        hasPendingSubmission: false,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    safeLog.error("Error checking pending submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

