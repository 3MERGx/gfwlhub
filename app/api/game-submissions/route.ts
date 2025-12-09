import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getGameBySlug } from "@/lib/games-service";
import { notifyGameSubmissionSubmitted } from "@/lib/discord-webhook";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { revalidatePath } from "next/cache";

// GET - Fetch all game submissions (for reviewers/admins)
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

    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getGFWLDatabase();
    const submissionsCollection = db.collection("gameSubmissions");

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const statusParam = searchParams.get("status");
    const status = statusParam ? sanitizeString(statusParam, 50) : "";
    const gameSlug = sanitizeString(searchParams.get("gameSlug") || "", 200);
    const readyToPublish = searchParams.get("readyToPublish") === "true";

    // Build query
    const query: Record<string, unknown> = {};

    // Regular users can only see their own submissions
    // Reviewers and admins can see all submissions
    if (session.user.role === "user") {
      query.submittedBy = session.user.id;
    }

    // If readyToPublish is enabled, we need approved submissions (overrides status filter)
    if (readyToPublish) {
      query.status = "approved";
    } else {
      // Filter by status if provided (but only if readyToPublish is not enabled)
      // If status is empty or "all", don't filter by status (show all statuses)
      if (status && status !== "all") {
        query.status = status;
      }
    }

    // Filter by game slug if provided
    if (gameSlug) {
      query.gameSlug = gameSlug;
    }

    // Fetch submissions
    let submissions = await submissionsCollection
      .find(query)
      .sort({ submittedAt: -1 })
      .toArray();

    // If readyToPublish filter is enabled, filter to show only approved submissions
    // where the game hasn't been published yet (featureEnabled is false or not set)
    if (readyToPublish && (session.user.role === "reviewer" || session.user.role === "admin")) {
      // First, ensure we only have approved submissions (should already be filtered by query.status = "approved")
      submissions = submissions.filter((submission) => submission.status === "approved");
      
      // Then, filter out games that are already published
      const gamesCollection = db.collection("Games");
      const games = await gamesCollection.find({}).toArray();
      const publishedGameSlugs = new Set(
        games
          .filter((g) => g.featureEnabled === true)
          .map((g) => g.slug)
      );

      // Filter to only approved submissions for unpublished games
      submissions = submissions.filter(
        (submission) => !publishedGameSlugs.has(submission.gameSlug)
      );
    }

    const usersCollection = db.collection("users");

    // Transform submissions and include current game data for comparison
    const transformedSubmissions = await Promise.all(
      submissions.map(async (doc) => {
        // Get current game data to compare
        const currentGame = await getGameBySlug(doc.gameSlug);
        
        // Get published by user name if game is published
        let publishedByName = null;
        if (currentGame?.publishedBy && ObjectId.isValid(currentGame.publishedBy)) {
          const publisher = await usersCollection.findOne({
            _id: new ObjectId(currentGame.publishedBy),
          });
          publishedByName = publisher?.name || null;
        }
        
        return {
          id: doc._id.toString(),
          gameSlug: doc.gameSlug,
          gameTitle: doc.gameTitle,
          submittedBy: doc.submittedBy,
          submittedByName: doc.submittedByName,
          submittedAt: doc.submittedAt,
          status: doc.status,
          reviewedBy: doc.reviewedBy,
          reviewedByName: doc.reviewedByName,
          reviewedAt: doc.reviewedAt,
          reviewNotes: doc.reviewNotes,
          proposedData: doc.proposedData,
          submitterNotes: doc.submitterNotes,
          originalGameData: doc.originalGameData || null, // Use original game data from submission time
          currentGameData: currentGame || null, // Include current game for reference
          publishedByName: publishedByName,
          publishedAt: currentGame?.publishedAt || null,
        };
      })
    );

    return NextResponse.json(
      transformedSubmissions,
      {
        headers: {
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    safeLog.error("Error fetching game submissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new game submission
export async function POST(request: NextRequest) {
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

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is allowed to submit
    if (
      session.user.status === "suspended" ||
      session.user.status === "blocked" ||
      session.user.status === "restricted"
    ) {
      return NextResponse.json(
        { error: "Your account is not permitted to submit content" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      gameSlug,
      gameTitle,
      submittedBy,
      submittedByName,
      proposedData,
      submitterNotes,
    } = body;

    // Sanitize and validate inputs
    const sanitizedGameSlug = sanitizeString(String(gameSlug || ""), 200);
    const sanitizedGameTitle = sanitizeString(String(gameTitle || ""), 500);
    const sanitizedSubmittedBy = sanitizeString(String(submittedBy || ""), 50);
    const sanitizedSubmittedByName = sanitizeString(String(submittedByName || ""), 200);
    const sanitizedSubmitterNotes = submitterNotes ? sanitizeString(String(submitterNotes), 2000) : undefined;

    // Validate required fields
    if (!sanitizedGameSlug || !sanitizedGameTitle || !sanitizedSubmittedBy || !sanitizedSubmittedByName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate that at least some data was provided
    if (
      !proposedData ||
      Object.keys(proposedData).filter((key) => proposedData[key]).length === 0
    ) {
      return NextResponse.json(
        { error: "Please provide at least one field of game data" },
        { status: 400 }
      );
    }

    // Validate submittedBy is a valid ObjectId
    if (!sanitizedSubmittedBy || !ObjectId.isValid(sanitizedSubmittedBy)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    // Sanitize proposedData and validate URLs
    const sanitizedProposedData: Record<string, unknown> = {};
    if (proposedData && typeof proposedData === "object") {
      const { isNsfwDomainBlocked, isDirectDownloadLink } = await import("@/lib/nsfw-blacklist");
      
      for (const [key, value] of Object.entries(proposedData)) {
        if (typeof value === "string") {
          const sanitizedKey = sanitizeString(key, 100);
          const sanitizedValue = sanitizeString(value, 5000);
          
          // Validate URL fields for NSFW domains and direct download links
          const urlFields: string[] = [
            "imageUrl",
            "discordLink",
            "redditLink",
            "wikiLink",
            "steamDBLink",
            "purchaseLink",
            "gogDreamlistLink",
            "communityAlternativeUrl",
          ];
          
          if (urlFields.includes(sanitizedKey) && sanitizedValue) {
            // Check NSFW domains
            const nsfwCheck = isNsfwDomainBlocked(sanitizedValue);
            if (nsfwCheck.isBlocked) {
              return NextResponse.json(
                { error: `${sanitizedKey}: ${nsfwCheck.reason || "This URL is not allowed"}` },
                { status: 400 }
              );
            }
            
            // Check for direct download links in non-download fields
            if (sanitizedKey !== "downloadLink" && sanitizedKey !== "communityAlternativeDownloadLink") {
              const downloadCheck = isDirectDownloadLink(sanitizedValue);
              if (downloadCheck.isDirectDownload) {
                return NextResponse.json(
                  { error: `${sanitizedKey}: ${downloadCheck.reason || "Direct download links are not allowed in this field"}` },
                  { status: 400 }
                );
              }
            }
          }
          
          sanitizedProposedData[sanitizedKey] = sanitizedValue;
        } else if (Array.isArray(value)) {
          sanitizedProposedData[sanitizeString(key, 100)] = value.map((item) => 
            typeof item === "string" ? sanitizeString(item, 500) : item
          );
        } else {
          sanitizedProposedData[sanitizeString(key, 100)] = value;
        }
      }
    }

    const db = await getGFWLDatabase();
    const submissionsCollection = db.collection("gameSubmissions");
    const usersCollection = db.collection("users");
    const gamesCollection = db.collection("Games");

    // Get original game data at time of submission for comparison
    const originalGame = await gamesCollection.findOne({ slug: sanitizedGameSlug });
    const originalGameData = originalGame ? {
      title: originalGame.title,
      description: originalGame.description,
      releaseDate: originalGame.releaseDate,
      developer: originalGame.developer,
      publisher: originalGame.publisher,
      genres: originalGame.genres,
      platforms: originalGame.platforms,
      activationType: originalGame.activationType,
      status: originalGame.status,
      imageUrl: originalGame.imageUrl,
      discordLink: originalGame.discordLink,
      redditLink: originalGame.redditLink,
      wikiLink: originalGame.wikiLink,
      steamDBLink: originalGame.steamDBLink,
      downloadLink: originalGame.downloadLink,
      fileName: originalGame.fileName,
      purchaseLink: originalGame.purchaseLink,
      gogDreamlistLink: originalGame.gogDreamlistLink,
      instructions: originalGame.instructions,
      virusTotalUrl: originalGame.virusTotalUrl,
      knownIssues: originalGame.knownIssues,
      communityTips: originalGame.communityTips,
      additionalDRM: originalGame.additionalDRM,
      playabilityStatus: originalGame.playabilityStatus,
      isUnplayable: originalGame.isUnplayable,
      communityAlternativeName: originalGame.communityAlternativeName,
      communityAlternativeUrl: originalGame.communityAlternativeUrl,
      communityAlternativeDownloadLink: originalGame.communityAlternativeDownloadLink,
      remasteredName: originalGame.remasteredName,
      remasteredPlatform: originalGame.remasteredPlatform,
    } : null;

    // Check for existing pending submission by the same user for the same game
    // Only update if submission is within 24 hours (allows users to refine their submission)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingSubmission = await submissionsCollection.findOne({
      gameSlug: sanitizedGameSlug,
      submittedBy: sanitizedSubmittedBy,
      status: "pending",
      submittedAt: { $gte: twentyFourHoursAgo },
    });

    let submissionId: string;
    let isUpdate = false;
    let existingDiscordMessageId: (string | null)[] | null = null;
    let finalProposedData: Record<string, unknown>;
    let finalSubmitterNotes: string | undefined;

    if (existingSubmission) {
      // Update existing submission
      isUpdate = true;
      submissionId = existingSubmission._id.toString();
      existingDiscordMessageId = existingSubmission.discordMessageId || null;

      // Merge proposed data (new fields override old ones, but keep all fields)
      finalProposedData = {
        ...existingSubmission.proposedData,
        ...sanitizedProposedData,
      };

      // Merge submitter notes (append if both exist)
      finalSubmitterNotes = existingSubmission.submitterNotes && sanitizedSubmitterNotes
        ? `${existingSubmission.submitterNotes}\n\n--- Updated ---\n${sanitizedSubmitterNotes}`
        : sanitizedSubmitterNotes || existingSubmission.submitterNotes;

      await submissionsCollection.updateOne(
        { _id: existingSubmission._id },
        {
          $set: {
            proposedData: finalProposedData,
            submitterNotes: finalSubmitterNotes,
            submittedAt: new Date(), // Update timestamp to reflect latest submission
            // Keep originalGameData from first submission (don't update it)
          },
        }
      );
    } else {
      // Create new submission
      finalProposedData = sanitizedProposedData;
      finalSubmitterNotes = sanitizedSubmitterNotes;

      const submission = {
        gameSlug: sanitizedGameSlug,
        gameTitle: sanitizedGameTitle,
        submittedBy: sanitizedSubmittedBy,
        submittedByName: sanitizedSubmittedByName,
        submittedAt: new Date(),
        status: "pending",
        proposedData: finalProposedData,
        submitterNotes: finalSubmitterNotes,
        originalGameData: originalGameData, // Store original game data at submission time
      };

      const result = await submissionsCollection.insertOne(submission);
      submissionId = result.insertedId.toString();

      // Update user's submission count only for new submissions
      await usersCollection.updateOne(
        { _id: new ObjectId(sanitizedSubmittedBy) },
        { $inc: { submissionsCount: 1 } }
      );
    }

    // Send or update Discord notification (non-blocking)
    if (isUpdate && existingDiscordMessageId) {
      // Update existing Discord webhook messages
      const webhookUrls = process.env.DISCORD_WEBHOOK_URL
        ? process.env.DISCORD_WEBHOOK_URL.split(",").map((url) => url.trim()).filter((url) => url.length > 0)
        : [];
      if (webhookUrls.length > 0) {
        const baseUrl = process.env.NEXTAUTH_URL || "https://gfwlhub.com";
        const gameUrl = `${baseUrl}/games/${sanitizedGameSlug}`;
        const dashboardUrl = `${baseUrl}/dashboard/game-submissions`;
        
        const submittedFields = Object.keys(finalProposedData).filter(
          (key) => finalProposedData[key] !== null && 
                   finalProposedData[key] !== undefined && 
                   finalProposedData[key] !== ""
        );

        const embed = {
          title: "🎮 Game Submission Updated",
          description: `**${sanitizedSubmittedByName}** updated their submission for **${sanitizedGameTitle}**`,
          color: 0x9b59b6, // Purple
          url: dashboardUrl,
          fields: [
            {
              name: "Game",
              value: `[${sanitizedGameTitle}](${gameUrl})`,
              inline: true,
            },
            {
              name: "Review",
              value: `[Open Dashboard](${dashboardUrl})`,
              inline: true,
            },
            {
              name: "Fields Submitted",
              value: submittedFields.length > 0 
                ? submittedFields.slice(0, 10).join(", ") + (submittedFields.length > 10 ? ` (+${submittedFields.length - 10} more)` : "")
                : "*No fields*",
              inline: false,
            },
          ],
          footer: {
            text: `Submission ID: ${submissionId}`,
          },
          timestamp: new Date().toISOString(),
        };

        if (finalSubmitterNotes) {
          embed.fields?.push({
            name: "Notes",
            value: finalSubmitterNotes.length > 500 
              ? finalSubmitterNotes.substring(0, 500) + "..."
              : finalSubmitterNotes,
            inline: false,
          });
        }

        // Update all webhooks using their stored message IDs
        const { updateDiscordWebhooks } = await import("@/lib/discord-webhook");
        // Ensure message IDs array matches webhook URLs length (pad with null if needed)
        const messageIdsArray: (string | null)[] = Array.isArray(existingDiscordMessageId)
          ? existingDiscordMessageId
          : existingDiscordMessageId
          ? [existingDiscordMessageId]
          : [];
        // Pad array to match webhook URLs length
        while (messageIdsArray.length < webhookUrls.length) {
          messageIdsArray.push(null);
        }
        updateDiscordWebhooks(webhookUrls, messageIdsArray, {
          embeds: [embed],
        }).catch((error) => {
          safeLog.error("Failed to update Discord notification:", error);
        });
      }
    } else {
      // Send new Discord webhook message
      // Get webhook URLs to store message IDs in correct order
      const webhookUrls = process.env.DISCORD_WEBHOOK_URL
        ? process.env.DISCORD_WEBHOOK_URL.split(",").map((url) => url.trim()).filter((url) => url.length > 0)
        : [];
      
      notifyGameSubmissionSubmitted({
        id: submissionId,
        gameTitle: sanitizedGameTitle,
        gameSlug: sanitizedGameSlug,
        submittedByName: sanitizedSubmittedByName,
        proposedData: finalProposedData as Record<string, unknown>,
        submitterNotes: finalSubmitterNotes,
      })
        .then(async (firstMessageId) => {
          // Store Discord message IDs in submission document
          // We need to get all message IDs, not just the first one
          if (webhookUrls.length > 0) {
            const { sendDiscordWebhooks } = await import("@/lib/discord-webhook");
            const baseUrl = process.env.NEXTAUTH_URL || "https://gfwlhub.com";
            const dashboardUrl = `${baseUrl}/dashboard/game-submissions`;
            
            const submittedFields = Object.keys(finalProposedData).filter(
              (key) => finalProposedData[key] !== null && 
                       finalProposedData[key] !== undefined && 
                       finalProposedData[key] !== ""
            );

            const embed = {
              title: "🎮 New Game Submission",
              description: `**${sanitizedSubmittedByName}** submitted game data for **${sanitizedGameTitle}**`,
              color: 0x9b59b6,
              url: dashboardUrl,
              fields: [
                {
                  name: "Game",
                  value: `[${sanitizedGameTitle}](${baseUrl}/games/${sanitizedGameSlug})`,
                  inline: true,
                },
                {
                  name: "Review",
                  value: `[Open Dashboard](${dashboardUrl})`,
                  inline: true,
                },
                {
                  name: "Fields Submitted",
                  value: submittedFields.length > 0 
                    ? submittedFields.slice(0, 10).join(", ") + (submittedFields.length > 10 ? ` (+${submittedFields.length - 10} more)` : "")
                    : "*No fields*",
                  inline: false,
                },
              ],
              footer: {
                text: `Submission ID: ${submissionId}`,
              },
              timestamp: new Date().toISOString(),
            };

            if (finalSubmitterNotes) {
              embed.fields?.push({
                name: "Notes",
                value: finalSubmitterNotes.length > 500 
                  ? finalSubmitterNotes.substring(0, 500) + "..."
                  : finalSubmitterNotes,
                inline: false,
              });
            }

            // Send to all webhooks and get all message IDs
            const messageIds = await sendDiscordWebhooks(webhookUrls, {
              embeds: [embed],
            });
            
            // Store array of message IDs (one per webhook)
            await submissionsCollection.updateOne(
              { _id: new ObjectId(submissionId) },
              { $set: { discordMessageIds: messageIds } }
            );
          } else if (firstMessageId) {
            // Fallback: if no webhook URLs but we got a message ID, store it as single value (backward compatibility)
            await submissionsCollection.updateOne(
              { _id: new ObjectId(submissionId) },
              { $set: { discordMessageId: firstMessageId } }
            );
          }
        })
        .catch((error) => {
          safeLog.error("Failed to send Discord notification:", error);
        });
    }

    // Revalidate paths
    revalidatePath("/dashboard/game-submissions");
    revalidatePath(`/games/${sanitizedGameSlug}`);
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      submissionId,
      updated: isUpdate,
    });
  } catch (error) {
    safeLog.error("Error creating game submission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

