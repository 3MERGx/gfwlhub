import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  createReviewerApplication,
  getUserReviewerApplication,
  userEligibleForReviewer,
  hasPendingApplication,
  getUserByEmail,
  canReapplyForReviewer,
} from "@/lib/crowdsource-service-mongodb";
import {
  safeLog,
  sanitizeString,
  rateLimiters,
  getClientIdentifier,
} from "@/lib/security";
import { validateCSRFToken } from "@/lib/csrf";
import { notifyReviewerApplicationSubmitted } from "@/lib/discord-webhook";
import { getGFWLDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// POST - Submit a reviewer application
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const identifier = getClientIdentifier(request, session.user.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Get user from database
    const user = await getUserByEmail(session.user.email!);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is already a reviewer or admin
    if (user.role !== "user") {
      return NextResponse.json(
        { error: "You are already a reviewer or admin" },
        { status: 400 }
      );
    }

    // Check eligibility
    const eligible = await userEligibleForReviewer(user.id);
    if (!eligible) {
      return NextResponse.json(
        { error: "You do not meet the eligibility requirements" },
        { status: 403 }
      );
    }

    // Check for pending application
    const hasPending = await hasPendingApplication(user.id);
    if (hasPending) {
      return NextResponse.json(
        { error: "You already have a pending application" },
        { status: 400 }
      );
    }

    // Check cooldown period if user was previously rejected
    const reapplyCheck = await canReapplyForReviewer(user.id);
    if (!reapplyCheck.canReapply) {
      return NextResponse.json(
        {
          error: `You cannot re-apply yet. Please wait ${reapplyCheck.daysUntilReapply} more day(s) before submitting a new application.`,
          daysUntilReapply: reapplyCheck.daysUntilReapply,
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

    const {
      motivation,
      experience,
      contributionExamples,
      timeAvailability,
      languages,
      priorExperience,
      agreedToRules,
    } = body;

    // Validate required fields
    if (!motivation || typeof motivation !== "string") {
      return NextResponse.json(
        { error: "Motivation text is required" },
        { status: 400 }
      );
    }

    if (!experience || typeof experience !== "string") {
      return NextResponse.json(
        { error: "Experience with platform is required" },
        { status: 400 }
      );
    }

    if (!contributionExamples || typeof contributionExamples !== "string") {
      return NextResponse.json(
        { error: "Examples of contributions are required" },
        { status: 400 }
      );
    }

    if (!agreedToRules) {
      return NextResponse.json(
        { error: "You must agree to the reviewer guidelines" },
        { status: 400 }
      );
    }

    // Sanitize all text fields
    const sanitizedMotivation = sanitizeString(motivation, 2000);
    if (sanitizedMotivation.length < 10) {
      return NextResponse.json(
        { error: "Motivation text must be at least 10 characters" },
        { status: 400 }
      );
    }

    const sanitizedExperience = sanitizeString(experience, 2000);
    if (sanitizedExperience.length < 10) {
      return NextResponse.json(
        { error: "Experience text must be at least 10 characters" },
        { status: 400 }
      );
    }

    const sanitizedContributionExamples = sanitizeString(
      contributionExamples,
      2000
    );
    if (sanitizedContributionExamples.length < 10) {
      return NextResponse.json(
        { error: "Contribution examples must be at least 10 characters" },
        { status: 400 }
      );
    }

    const sanitizedTimeAvailability = timeAvailability
      ? sanitizeString(String(timeAvailability), 500)
      : undefined;

    const sanitizedLanguages = languages
      ? sanitizeString(String(languages), 200)
      : undefined;

    const sanitizedPriorExperience = priorExperience
      ? sanitizeString(String(priorExperience), 1000)
      : undefined;

    // Create application
    const application = await createReviewerApplication(
      user.id,
      sanitizedMotivation,
      sanitizedExperience,
      sanitizedContributionExamples,
      sanitizedTimeAvailability,
      sanitizedLanguages,
      sanitizedPriorExperience
    );

    // Get webhook URLs to store message IDs in correct order
    const reviewerWebhookUrls = process.env.DISCORD_REVIEWER_APPLICATION_WEBHOOK_URL
      ? process.env.DISCORD_REVIEWER_APPLICATION_WEBHOOK_URL.split(",").map((url) => url.trim()).filter((url) => url.length > 0)
      : [];
    const webhookUrls = reviewerWebhookUrls.length > 0 
      ? reviewerWebhookUrls 
      : (process.env.DISCORD_WEBHOOK_URL
          ? process.env.DISCORD_WEBHOOK_URL.split(",").map((url) => url.trim()).filter((url) => url.length > 0)
          : []);

    // Send Discord notification and store message IDs (non-blocking)
    notifyReviewerApplicationSubmitted({
      id: application.id,
      userName: application.userName || user.name || "Unknown",
      userEmail: application.userEmail || user.email || "",
      motivationText: application.motivationText,
      experienceText: application.experienceText,
      contributionExamples: application.contributionExamples,
      createdAt: application.createdAt,
    })
      .then(async (firstMessageId) => {
        // Store Discord message IDs in application document
        if (webhookUrls.length > 0) {
          const db = await getGFWLDatabase();
          const applicationsCollection = db.collection("reviewerApplications");
          const baseUrl = process.env.NEXTAUTH_URL || "https://gfwlhub.com";
          const dashboardUrl = `${baseUrl}/dashboard/reviewer-applications`;

          const embed = {
            title: "📝 New Reviewer Application",
            description: `**${application.userName || user.name || "Unknown"}** has submitted a reviewer application`,
            color: 0xffa500,
            url: dashboardUrl,
            fields: [
              {
                name: "Applicant",
                value: `${application.userName || user.name || "Unknown"}\n${application.userEmail || user.email || ""}`,
                inline: true,
              },
              {
                name: "Application ID",
                value: application.id,
                inline: true,
              },
              {
                name: "Motivation",
                value: application.motivationText.length > 500
                  ? application.motivationText.substring(0, 500) + "..."
                  : application.motivationText,
                inline: false,
              },
            ],
            footer: {
              text: `Application ID: ${application.id}`,
            },
            timestamp: new Date(application.createdAt).toISOString(),
          };

          if (application.experienceText) {
            embed.fields?.push({
              name: "Experience",
              value: application.experienceText.length > 300
                ? application.experienceText.substring(0, 300) + "..."
                : application.experienceText,
              inline: false,
            });
          }

          if (application.contributionExamples) {
            embed.fields?.push({
              name: "Contribution Examples",
              value: application.contributionExamples.length > 300
                ? application.contributionExamples.substring(0, 300) + "..."
                : application.contributionExamples,
              inline: false,
            });
          }

          // Send to all webhooks and get all message IDs
          const { sendDiscordWebhooks } = await import("@/lib/discord-webhook");
          const messageIds = await sendDiscordWebhooks(webhookUrls, {
            embeds: [embed],
          });
          
          // Store array of message IDs (one per webhook)
          await applicationsCollection.updateOne(
            { _id: new ObjectId(application.id) },
            { $set: { discordMessageIds: messageIds } }
          );
        } else if (firstMessageId) {
          // Fallback: if no webhook URLs but we got a message ID, store it as single value (backward compatibility)
          const db = await getGFWLDatabase();
          const applicationsCollection = db.collection("reviewerApplications");
          await applicationsCollection.updateOne(
            { _id: new ObjectId(application.id) },
            { $set: { discordMessageId: firstMessageId } }
          );
        }
      })
      .catch((error) => {
        safeLog.error("Failed to send Discord notification:", error);
      });

    return NextResponse.json({ application });
  } catch (error) {
    safeLog.error("Error creating reviewer application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Get user's reviewer application
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByEmail(session.user.email!);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const application = await getUserReviewerApplication(user.id);
    return NextResponse.json({ application });
  } catch (error) {
    safeLog.error("Error fetching reviewer application:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

