import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { safeLog, sanitizeString, markdownToSafeHtml, sanitizeHtml, rateLimiters, getClientIdentifier } from "@/lib/security";
import { validateCSRFToken } from "@/lib/csrf";
import { canSubmitCorrections, getUserByEmail } from "@/lib/crowdsource-service-mongodb";
import { notifyFaqSubmissionSubmitted } from "@/lib/discord-webhook";

// GET - Fetch FAQ submissions (for reviewers/admins)
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

    // Check if user is authenticated and is reviewer or admin
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "reviewer" && session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = await getGFWLDatabase();
    const submissionsCollection = db.collection("faqSubmissions");

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get("status");
    const status = statusParam ? sanitizeString(statusParam, 50) : "";
    const userId = sanitizeString(searchParams.get("userId") || "", 50);

    // Build query
    const query: Record<string, unknown> = {};

    // Filter by status if provided
    if (status && status !== "all") {
      query.status = status;
    }

    // Filter by submitter if provided
    if (userId) {
      query.submittedBy = userId;
    }

    // Fetch submissions
    const submissions = await submissionsCollection
      .find(query)
      .sort({ submittedAt: -1 })
      .toArray();

    // Transform submissions
    const transformedSubmissions = submissions.map((doc) => ({
      id: doc._id.toString(),
      question: doc.question,
      answer: doc.answer,
      submittedBy: doc.submittedBy,
      submittedByName: doc.submittedByName,
      submittedAt: doc.submittedAt,
      status: doc.status,
      reviewedBy: doc.reviewedBy,
      reviewedByName: doc.reviewedByName,
      reviewedAt: doc.reviewedAt,
      adminNotes: doc.adminNotes,
    }));

    return NextResponse.json(transformedSubmissions, {
      headers: {
        "Cache-Control": "private, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    safeLog.error("Error fetching FAQ submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Submit a new FAQ suggestion (authenticated users)
export async function POST(request: NextRequest) {
  try {
    // Rate limiting - use stricter limit for submissions
    const session = await getServerSession(authOptions);
    const identifier = getClientIdentifier(request, session?.user?.id);
    if (!rateLimiters.auth.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database to check status
    const user = await getUserByEmail(session.user.email!);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user can submit (same check as corrections and game submissions)
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

    const { question, answer } = body;

    const rawQuestion = String(question ?? "").trim();
    const rawAnswer = String(answer ?? "").trim();

    if (!rawQuestion) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }
    if (!rawAnswer) {
      return NextResponse.json(
        { error: "Answer is required" },
        { status: 400 }
      );
    }

    const QUESTION_MAX = 500;
    const ANSWER_MAX = 5000;
    if (rawQuestion.length > QUESTION_MAX) {
      return NextResponse.json(
        { error: `Question must be ${QUESTION_MAX} characters or less` },
        { status: 400 }
      );
    }
    if (rawAnswer.length > ANSWER_MAX) {
      return NextResponse.json(
        { error: `Answer must be ${ANSWER_MAX} characters or less` },
        { status: 400 }
      );
    }

    const sanitizedQuestion = sanitizeString(rawQuestion, QUESTION_MAX);
    // If content looks like HTML (from rich editor), sanitize; otherwise treat as Markdown
    const sanitizedAnswer =
      rawAnswer.includes("<") && /<[a-z][\s\S]*>/i.test(rawAnswer)
        ? sanitizeHtml(rawAnswer)
        : markdownToSafeHtml(rawAnswer);

    const db = await getGFWLDatabase();
    const submissionsCollection = db.collection("faqSubmissions");

    const newSubmission = {
      question: sanitizedQuestion.trim(),
      answer: sanitizedAnswer,
      submittedBy: session.user.id,
      submittedByName: session.user.name || "Unknown",
      submittedAt: new Date(),
      status: "pending",
      reviewedBy: null,
      reviewedByName: null,
      reviewedAt: null,
      adminNotes: null,
    };

    const result = await submissionsCollection.insertOne(newSubmission);
    const submissionId = result.insertedId.toString();

    // Discord webhook (non-blocking; log errors only)
    notifyFaqSubmissionSubmitted({
      id: submissionId,
      question: sanitizedQuestion,
      submittedByName: newSubmission.submittedByName,
    }).catch((err) => safeLog.error("FAQ submission Discord webhook failed:", err));

    return NextResponse.json({
      id: submissionId,
      ...newSubmission,
    });
  } catch (error) {
    safeLog.error("Error creating FAQ submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
