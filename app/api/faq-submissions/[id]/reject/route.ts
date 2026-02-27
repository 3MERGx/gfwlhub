import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { createAuditLog, getUserByEmail } from "@/lib/crowdsource-service-mongodb";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { validateCSRFToken } from "@/lib/csrf";
import { revalidatePath } from "next/cache";
import { notifyFaqSubmissionReviewed } from "@/lib/discord-webhook";
import { triggerPusherEvent, PUSHER_EVENTS } from "@/lib/pusher-server";
import type { UserRole } from "@/types/crowdsource";

// POST - Reject an FAQ submission (reviewer/admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const identifier = getClientIdentifier(request, session.user.id);
    if (!rateLimiters.admin.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Check permissions - reviewer or admin
    if (session.user.role !== "reviewer" && session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Reviewer or Admin access required" },
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

    const { id } = await params;
    const sanitizedId = sanitizeString(id, 50);
    const adminNotes = body.adminNotes
      ? sanitizeString(String(body.adminNotes), 1000)
      : undefined;

    if (!ObjectId.isValid(sanitizedId)) {
      return NextResponse.json({ error: "Invalid submission ID" }, { status: 400 });
    }

    const db = await getGFWLDatabase();
    const submissionsCollection = db.collection("faqSubmissions");

    // Get the submission
    const submission = await submissionsCollection.findOne({
      _id: new ObjectId(sanitizedId),
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Check if already processed
    if (submission.status !== "pending") {
      return NextResponse.json(
        { error: "Submission has already been processed" },
        { status: 400 }
      );
    }

    // Update submission status to rejected
    await submissionsCollection.updateOne(
      { _id: new ObjectId(sanitizedId) },
      {
        $set: {
          status: "rejected",
          reviewedBy: session.user.id,
          reviewedByName: session.user.name || "Unknown",
          reviewedAt: new Date(),
          adminNotes: adminNotes || null,
        },
      }
    );

    // Audit log: FAQ submission rejected
    const reviewerUser = await getUserByEmail(session.user.email!);
    const reviewerRole: UserRole =
      reviewerUser?.role ?? (session.user.role as UserRole) ?? "reviewer";
    const gameTitle =
      submission.question.length > 80
        ? `FAQ: ${submission.question.slice(0, 77)}...`
        : `FAQ: ${submission.question}`;
    await createAuditLog({
      gameId: "faq",
      gameSlug: "faq",
      gameTitle,
      field: "faqSubmission",
      oldValue: "pending",
      newValue: "rejected",
      changedBy: session.user.id,
      changedByName: session.user.name || "Unknown",
      changedByRole: reviewerRole,
      correctionId: sanitizedId,
      notes: adminNotes,
      submittedBy: submission.submittedBy,
      submittedByName: submission.submittedByName ?? "Unknown",
    }).catch((err) => safeLog.error("Failed to create audit log for FAQ rejection:", err));

    // Revalidate paths
    revalidatePath("/dashboard/faq-submissions");

    triggerPusherEvent(PUSHER_EVENTS.FAQ_SUBMISSIONS_UPDATED);

    // Discord webhook (non-blocking)
    notifyFaqSubmissionReviewed({
      id: sanitizedId,
      question: submission.question,
      submittedByName: submission.submittedByName || "Unknown",
      status: "rejected",
      reviewedByName: session.user.name || "Unknown",
      reviewNotes: adminNotes,
    }).catch((err) => safeLog.error("FAQ rejection Discord webhook failed:", err));

    return NextResponse.json({ success: true });
  } catch (error) {
    safeLog.error("Error rejecting FAQ submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
