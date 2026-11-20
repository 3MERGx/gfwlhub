import { NextRequest, NextResponse } from "next/server";
import { getGFWLDatabase } from "@/lib/mongodb";
import { createAuditLog } from "@/lib/crowdsource-service-mongodb";
import { toObjectId } from "@/lib/mongo-sanitize";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { validateCSRFToken } from "@/lib/csrf";
import { requireReviewer } from "@/lib/api-auth";
import { revalidatePath } from "next/cache";
import { notifyFaqSubmissionReviewed } from "@/lib/discord-webhook";
import { triggerPusherEvent, PUSHER_EVENTS } from "@/lib/pusher-server";
import type { UserRole } from "@/types/crowdsource";

// POST - Approve an FAQ submission (reviewer/admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireReviewer();
    if (!auth.ok) return auth.response;
    const { session, user } = auth;

    const identifier = getClientIdentifier(request, user.id);
    if (!rateLimiters.admin.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
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

    const objectId = toObjectId(sanitizedId);
    if (!objectId) {
      return NextResponse.json({ error: "Invalid submission ID" }, { status: 400 });
    }

    const db = await getGFWLDatabase();
    const submissionsCollection = db.collection("faqSubmissions");
    const faqsCollection = db.collection("faqs");

    // Get the submission
    const submission = await submissionsCollection.findOne({
      _id: objectId,
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    const adminEmails =
      process.env.DEVELOPER_EMAILS?.split(",").map((email) => email.trim()) ||
      [];
    const isDeveloper = Boolean(user.email && adminEmails.includes(user.email));
    if (submission.submittedBy === user.id && !isDeveloper) {
      return NextResponse.json(
        {
          error:
            "You cannot review your own submissions. This prevents abuse of the approval system.",
        },
        { status: 403 }
      );
    }

    // Check if already processed
    if (submission.status !== "pending") {
      return NextResponse.json(
        { error: "Submission has already been processed" },
        { status: 400 }
      );
    }

    // Get the highest order in FAQs and add 1
    const maxOrderDoc = await faqsCollection
      .find({})
      .sort({ order: -1 })
      .limit(1)
      .toArray();
    const maxOrder = maxOrderDoc.length > 0 ? maxOrderDoc[0].order : 0;

    // Create the FAQ
    const newFAQ = {
      question: submission.question,
      answer: submission.answer,
      order: maxOrder + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: submission.submittedBy,
      createdByName: submission.submittedByName,
    };

    await faqsCollection.insertOne(newFAQ);

    // Audit log: FAQ submission approved
    const reviewerRole: UserRole = user.role;
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
      newValue: "approved",
      changedBy: session.user.id,
      changedByName: session.user.name || "Unknown",
      changedByRole: reviewerRole,
      correctionId: sanitizedId,
      notes: adminNotes,
      submittedBy: submission.submittedBy,
      submittedByName: submission.submittedByName ?? "Unknown",
    }).catch((err) => safeLog.error("Failed to create audit log for FAQ approval:", err));

    // Update submission status
    await submissionsCollection.updateOne(
      { _id: objectId },
      {
        $set: {
          status: "approved",
          reviewedBy: session.user.id,
          reviewedByName: session.user.name || "Unknown",
          reviewedAt: new Date(),
          adminNotes: adminNotes || null,
        },
      }
    );

    // Revalidate paths
    revalidatePath("/faq");
    revalidatePath("/dashboard/faq-submissions");

    triggerPusherEvent(PUSHER_EVENTS.FAQ_SUBMISSIONS_UPDATED);
    triggerPusherEvent(PUSHER_EVENTS.FAQ_UPDATED);

    // Discord webhook (non-blocking)
    notifyFaqSubmissionReviewed({
      id: sanitizedId,
      question: submission.question,
      submittedByName: submission.submittedByName || "Unknown",
      status: "approved",
      reviewedByName: session.user.name || "Unknown",
      reviewNotes: adminNotes,
    }).catch((err) => safeLog.error("FAQ approval Discord webhook failed:", err));

    return NextResponse.json({ success: true });
  } catch (error) {
    safeLog.error("Error approving FAQ submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
