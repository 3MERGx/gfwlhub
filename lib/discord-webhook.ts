/**
 * Discord Webhook Service
 * Sends notifications to Discord channels via webhooks
 * Uses webhooks for efficiency and to avoid rate limiting issues
 */

import { safeLog } from "./security";

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
    icon_url?: string;
  };
  timestamp?: string;
  url?: string;
}

interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

/**
 * Parses webhook URLs from environment variable (supports comma-separated multiple URLs)
 * @param envVar - The environment variable name
 * @returns Array of webhook URLs
 */
function getWebhookUrls(envVar: string): string[] {
  const webhookValue = process.env[envVar];
  if (!webhookValue) {
    return [];
  }
  // Split by comma and trim whitespace, filter out empty strings
  return webhookValue
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url.length > 0);
}

/**
 * Sends a Discord webhook message to a single webhook
 * @param webhookUrl - The Discord webhook URL
 * @param payload - The webhook payload (content, embeds, etc.)
 * @returns Promise that resolves with the message ID when the message is sent (or null if failed)
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<string | null> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      safeLog.error(
        `Discord webhook failed: ${response.status} ${response.statusText}`,
        errorText
      );
      return null;
    }

    // Discord returns the message object with an id field
    const data = await response.json().catch(() => null);
    return data?.id || null;
  } catch (error) {
    // Fail silently to not disrupt the main flow
    // Log error for debugging
    safeLog.error("Error sending Discord webhook:", error);
    return null;
  }
}

/**
 * Updates an existing Discord webhook message
 * @param webhookUrl - The Discord webhook URL
 * @param messageId - The ID of the message to update
 * @param payload - The webhook payload (content, embeds, etc.)
 * @returns Promise that resolves when the message is updated (or fails silently)
 */
export async function updateDiscordWebhook(
  webhookUrl: string,
  messageId: string,
  payload: DiscordWebhookPayload
): Promise<void> {
  try {
    // Extract webhook ID and token from URL
    // Discord webhook URLs are in format: https://discord.com/api/webhooks/{webhook_id}/{webhook_token}
    const urlMatch = webhookUrl.match(/discord\.com\/api\/webhooks\/([^\/]+)\/([^\/\?]+)/);
    if (!urlMatch) {
      safeLog.error("Invalid Discord webhook URL format");
      return;
    }

    const [, webhookId, webhookToken] = urlMatch;
    const updateUrl = `https://discord.com/api/webhooks/${webhookId}/${webhookToken}/messages/${messageId}`;

    const response = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      safeLog.error(
        `Discord webhook update failed: ${response.status} ${response.statusText}`,
        errorText
      );
    }
  } catch (error) {
    // Fail silently to not disrupt the main flow
    // Log error for debugging
    safeLog.error("Error updating Discord webhook:", error);
  }
}

/**
 * Sends a Discord webhook message to multiple webhooks
 * @param webhookUrls - Array of Discord webhook URLs
 * @param payload - The webhook payload (content, embeds, etc.)
 * @returns Promise that resolves with an array of message IDs (one per webhook, null for failures)
 */
export async function sendDiscordWebhooks(
  webhookUrls: string[],
  payload: DiscordWebhookPayload
): Promise<(string | null)[]> {
  if (webhookUrls.length === 0) {
    return [];
  }
  
  // Send to all webhooks in parallel
  const promises = webhookUrls.map((url) => sendDiscordWebhook(url, payload));
  return Promise.all(promises);
}

/**
 * Updates multiple Discord webhook messages
 * @param webhookUrls - Array of Discord webhook URLs
 * @param messageIds - Array of message IDs (one per webhook URL, in same order)
 * @param payload - The webhook payload (content, embeds, etc.)
 * @returns Promise that resolves when all updates complete (or fail silently)
 */
export async function updateDiscordWebhooks(
  webhookUrls: string[],
  messageIds: (string | null)[],
  payload: DiscordWebhookPayload
): Promise<void> {
  if (webhookUrls.length === 0 || messageIds.length === 0) {
    return;
  }
  
  // Update all webhooks in parallel (only update if we have a message ID for that webhook)
  const promises = webhookUrls.map((url, index) => {
    const messageId = messageIds[index];
    if (messageId) {
      return updateDiscordWebhook(url, messageId, payload);
    }
    // If no message ID, send a new message instead
    return sendDiscordWebhook(url, payload).then(() => {});
  });
  
  await Promise.all(promises);
}

/**
 * Sends a notification about a new correction submission
 */
export async function notifyCorrectionSubmitted(
  correction: {
    id: string;
    gameTitle: string;
    gameSlug: string;
    field: string;
    submittedByName: string;
    reason: string;
    oldValue: unknown;
    newValue: unknown;
  }
): Promise<void> {
  const webhookUrls = getWebhookUrls("DISCORD_WEBHOOK_URL");
  if (webhookUrls.length === 0) {
    return; // Discord notifications disabled
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://gfwlhub.com";
  const gameUrl = `${baseUrl}/games/${correction.gameSlug}`;
  const dashboardUrl = `${baseUrl}/dashboard/submissions`;
  
  // Format field value for display
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "*empty*";
    if (Array.isArray(value)) return value.join(", ") || "*empty*";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  const embed: DiscordEmbed = {
    title: "📝 New Correction Submitted",
    description: `**${correction.submittedByName}** submitted a correction for **${correction.gameTitle}**`,
    color: 0x3498db, // Blue
    url: dashboardUrl, // Make title clickable
    fields: [
      {
        name: "Field",
        value: correction.field,
        inline: true,
      },
      {
        name: "Game",
        value: `[${correction.gameTitle}](${gameUrl})`,
        inline: true,
      },
      {
        name: "Review",
        value: `[Open Dashboard](${dashboardUrl})`,
        inline: true,
      },
      {
        name: "Old Value",
        value: formatValue(correction.oldValue),
        inline: false,
      },
      {
        name: "New Value",
        value: formatValue(correction.newValue),
        inline: false,
      },
      {
        name: "Reason",
        value: correction.reason || "*No reason provided*",
        inline: false,
      },
    ],
    footer: {
      text: `Correction ID: ${correction.id}`,
    },
    timestamp: new Date().toISOString(),
  };

  // Send to all webhooks (non-blocking, errors are handled internally)
  await sendDiscordWebhooks(webhookUrls, {
    embeds: [embed],
  });
}

/**
 * Sends a notification about a correction being reviewed
 */
export async function notifyCorrectionReviewed(
  correction: {
    id: string;
    gameTitle: string;
    gameSlug: string;
    field: string;
    submittedByName: string;
    status: "approved" | "rejected" | "modified";
    reviewedByName: string;
    reviewNotes?: string;
    finalValue?: unknown;
  }
): Promise<void> {
  const webhookUrls = getWebhookUrls("DISCORD_WEBHOOK_URL");
  if (webhookUrls.length === 0) {
    return; // Discord notifications disabled
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://gfwlhub.com";
  const gameUrl = `${baseUrl}/games/${correction.gameSlug}`;
  const dashboardUrl = `${baseUrl}/dashboard/submissions`;
  
  // Determine color and emoji based on status
  const statusConfig = {
    approved: { color: 0x2ecc71, emoji: "✅" }, // Green
    rejected: { color: 0xe74c3c, emoji: "❌" }, // Red
    modified: { color: 0xf39c12, emoji: "✏️" }, // Orange
  };

  const config = statusConfig[correction.status];

  // Format field value for display
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "*empty*";
    if (Array.isArray(value)) return value.join(", ") || "*empty*";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  const embed: DiscordEmbed = {
    title: `${config.emoji} Correction ${correction.status.charAt(0).toUpperCase() + correction.status.slice(1)}`,
    description: `**${correction.reviewedByName}** ${correction.status} a correction for **${correction.gameTitle}**`,
    color: config.color,
    url: dashboardUrl, // Make title clickable
    fields: [
      {
        name: "Field",
        value: correction.field,
        inline: true,
      },
      {
        name: "Game",
        value: `[${correction.gameTitle}](${gameUrl})`,
        inline: true,
      },
      {
        name: "Submitted By",
        value: correction.submittedByName,
        inline: true,
      },
    ],
    footer: {
      text: `Correction ID: ${correction.id}`,
    },
    timestamp: new Date().toISOString(),
  };

  // Add final value if modified
  if (correction.status === "modified" && correction.finalValue !== undefined) {
    embed.fields?.push({
      name: "Final Value",
      value: formatValue(correction.finalValue),
      inline: false,
    });
  }

  // Add review notes if provided
  if (correction.reviewNotes) {
    embed.fields?.push({
      name: "Review Notes",
      value: correction.reviewNotes,
      inline: false,
    });
  }

  // Send to all webhooks (non-blocking, errors are handled internally)
  await sendDiscordWebhooks(webhookUrls, {
    embeds: [embed],
  });
}

/**
 * Sends a notification about a new game submission
 * @returns The Discord message ID from the first webhook if successful, null otherwise
 */
export async function notifyGameSubmissionSubmitted(
  submission: {
    id: string;
    gameTitle: string;
    gameSlug: string;
    submittedByName: string;
    proposedData: Record<string, unknown>;
    submitterNotes?: string;
  }
): Promise<string | null> {
  const webhookUrls = getWebhookUrls("DISCORD_WEBHOOK_URL");
  if (webhookUrls.length === 0) {
    return null; // Discord notifications disabled
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://gfwlhub.com";
  const gameUrl = `${baseUrl}/games/${submission.gameSlug}`;
  const dashboardUrl = `${baseUrl}/dashboard/game-submissions`;
  
  // Get list of fields being submitted
  const submittedFields = Object.keys(submission.proposedData).filter(
    (key) => submission.proposedData[key] !== null && submission.proposedData[key] !== undefined && submission.proposedData[key] !== ""
  );

  const embed: DiscordEmbed = {
    title: "🎮 New Game Submission",
    description: `**${submission.submittedByName}** submitted game data for **${submission.gameTitle}**`,
    color: 0x9b59b6, // Purple
    url: dashboardUrl, // Make title clickable
    fields: [
      {
        name: "Game",
        value: `[${submission.gameTitle}](${gameUrl})`,
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
      text: `Submission ID: ${submission.id}`,
    },
    timestamp: new Date().toISOString(),
  };

  // Add submitter notes if provided
  if (submission.submitterNotes) {
    embed.fields?.push({
      name: "Notes",
      value: submission.submitterNotes.length > 500 
        ? submission.submitterNotes.substring(0, 500) + "..."
        : submission.submitterNotes,
      inline: false,
    });
  }

  // Send to all webhooks, return the first message ID for backward compatibility
  const messageIds = await sendDiscordWebhooks(webhookUrls, {
    embeds: [embed],
  });
  // Return the first non-null message ID, or null if all failed
  return messageIds.find((id) => id !== null) || null;
}

/**
 * Sends or updates a notification about a game submission being reviewed
 * @param submission - The submission data
 * @param existingMessageId - Optional Discord message ID(s) to update instead of creating a new message
 */
export async function notifyGameSubmissionReviewed(
  submission: {
    id: string;
    gameTitle: string;
    gameSlug: string;
    submittedByName: string;
    status: "approved" | "rejected";
    reviewedByName: string;
    reviewNotes?: string;
  },
  existingMessageId?: string | string[] | null
): Promise<void> {
  const webhookUrls = getWebhookUrls("DISCORD_WEBHOOK_URL");
  if (webhookUrls.length === 0) {
    return; // Discord notifications disabled
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://gfwlhub.com";
  const gameUrl = `${baseUrl}/games/${submission.gameSlug}`;
  const dashboardUrl = `${baseUrl}/dashboard/game-submissions`;
  
  // Determine color and emoji based on status
  const statusConfig = {
    approved: { color: 0x2ecc71, emoji: "✅" }, // Green
    rejected: { color: 0xe74c3c, emoji: "❌" }, // Red
  };

  const config = statusConfig[submission.status];

  const embed: DiscordEmbed = {
    title: `${config.emoji} Game Submission ${submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}`,
    description: `**${submission.reviewedByName}** ${submission.status} a game submission for **${submission.gameTitle}**`,
    color: config.color,
    url: dashboardUrl, // Make title clickable
    fields: [
      {
        name: "Game",
        value: `[${submission.gameTitle}](${gameUrl})`,
        inline: true,
      },
      {
        name: "Submitted By",
        value: submission.submittedByName,
        inline: true,
      },
    ],
    footer: {
      text: `Submission ID: ${submission.id}`,
    },
    timestamp: new Date().toISOString(),
  };

  // Add review notes if provided
  if (submission.reviewNotes) {
    embed.fields?.push({
      name: "Review Notes",
      value: submission.reviewNotes.length > 500 
        ? submission.reviewNotes.substring(0, 500) + "..."
        : submission.reviewNotes,
      inline: false,
    });
  }

  // Update existing messages if message IDs are provided, otherwise send to all
  if (existingMessageId && webhookUrls.length > 0) {
    // If existingMessageId is a string, it's the old format (single message ID)
    // If it's an array, it's the new format (multiple message IDs)
    if (typeof existingMessageId === 'string') {
      // Legacy: single message ID - update first webhook, send new to others
      await updateDiscordWebhook(webhookUrls[0], existingMessageId, {
        embeds: [embed],
      });
      if (webhookUrls.length > 1) {
        await sendDiscordWebhooks(webhookUrls.slice(1), {
          embeds: [embed],
        });
      }
    } else if (Array.isArray(existingMessageId)) {
      // New format: array of message IDs - update all matching webhooks
      await updateDiscordWebhooks(webhookUrls, existingMessageId, {
        embeds: [embed],
      });
    }
  } else {
    // Send to all webhooks
    await sendDiscordWebhooks(webhookUrls, {
      embeds: [embed],
    });
  }
}

/**
 * Sends a notification about a new reviewer application
 * @returns The Discord message ID from the first webhook if successful, null otherwise
 */
export async function notifyReviewerApplicationSubmitted(
  application: {
    id: string;
    userName: string;
    userEmail: string;
    motivationText: string;
    experienceText?: string;
    contributionExamples?: string;
    createdAt: Date;
  }
): Promise<string | null> {
  // Use dedicated reviewer application webhook if available, otherwise fall back to main webhook
  const reviewerWebhookUrls = getWebhookUrls("DISCORD_REVIEWER_APPLICATION_WEBHOOK_URL");
  const webhookUrls = reviewerWebhookUrls.length > 0 
    ? reviewerWebhookUrls 
    : getWebhookUrls("DISCORD_WEBHOOK_URL");
  
  if (webhookUrls.length === 0) {
    return null; // Discord notifications disabled
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://gfwlhub.com";
  const dashboardUrl = `${baseUrl}/dashboard/reviewer-applications`;

  const embed: DiscordEmbed = {
    title: "📝 New Reviewer Application",
    description: `**${application.userName}** has submitted a reviewer application`,
    color: 0xffa500, // Orange
    url: dashboardUrl,
    fields: [
      {
        name: "Applicant",
        value: `${application.userName}\n${application.userEmail}`,
        inline: true,
      },
      {
        name: "Application ID",
        value: application.id,
        inline: true,
      },
      {
        name: "Motivation",
        value:
          application.motivationText.length > 500
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
      value:
        application.experienceText.length > 300
          ? application.experienceText.substring(0, 300) + "..."
          : application.experienceText,
      inline: false,
    });
  }

  if (application.contributionExamples) {
    embed.fields?.push({
      name: "Contribution Examples",
      value:
        application.contributionExamples.length > 300
          ? application.contributionExamples.substring(0, 300) + "..."
          : application.contributionExamples,
      inline: false,
    });
  }

  // Send to all webhooks, return the first message ID for backward compatibility
  const messageIds = await sendDiscordWebhooks(webhookUrls, {
    embeds: [embed],
  });
  // Return the first non-null message ID, or null if all failed
  return messageIds.find((id) => id !== null) || null;
}

/**
 * Sends or updates a notification about a reviewer application being reviewed
 * @param application - The application data
 * @param existingMessageId - Optional Discord message ID(s) to update instead of creating new messages
 */
export async function notifyReviewerApplicationReviewed(
  application: {
    id: string;
    userName: string;
    userEmail: string;
    status: "approved" | "rejected";
    reviewedByName: string;
    adminNotes?: string;
  },
  existingMessageId?: string | string[] | null
): Promise<void> {
  // Use dedicated reviewer application webhook if available, otherwise fall back to main webhook
  const reviewerWebhookUrls = getWebhookUrls("DISCORD_REVIEWER_APPLICATION_WEBHOOK_URL");
  const webhookUrls = reviewerWebhookUrls.length > 0 
    ? reviewerWebhookUrls 
    : getWebhookUrls("DISCORD_WEBHOOK_URL");
  
  if (webhookUrls.length === 0) {
    return; // Discord notifications disabled
  }

  const baseUrl = process.env.NEXTAUTH_URL || "https://gfwlhub.com";
  const dashboardUrl = `${baseUrl}/dashboard/reviewer-applications`;

  // Determine color and emoji based on status
  const statusConfig = {
    approved: { color: 0x2ecc71, emoji: "✅" }, // Green
    rejected: { color: 0xe74c3c, emoji: "❌" }, // Red
  };

  const config = statusConfig[application.status];

  const embed: DiscordEmbed = {
    title: `${config.emoji} Reviewer Application ${application.status.charAt(0).toUpperCase() + application.status.slice(1)}`,
    description: `**${application.reviewedByName}** ${application.status} a reviewer application from **${application.userName}**`,
    color: config.color,
    url: dashboardUrl,
    fields: [
      {
        name: "Applicant",
        value: `${application.userName}\n${application.userEmail}`,
        inline: true,
      },
      {
        name: "Application ID",
        value: application.id,
        inline: true,
      },
    ],
    footer: {
      text: `Application ID: ${application.id}`,
    },
    timestamp: new Date().toISOString(),
  };

  // Add admin notes if provided
  if (application.adminNotes) {
    embed.fields?.push({
      name: "Admin Notes",
      value: application.adminNotes.length > 500 
        ? application.adminNotes.substring(0, 500) + "..."
        : application.adminNotes,
      inline: false,
    });
  }

  // Update existing messages if message IDs are provided, otherwise send to all
  if (existingMessageId && webhookUrls.length > 0) {
    // If existingMessageId is a string, it's the old format (single message ID)
    // If it's an array, it's the new format (multiple message IDs)
    if (typeof existingMessageId === 'string') {
      // Legacy: single message ID - update first webhook, send new to others
      await updateDiscordWebhook(webhookUrls[0], existingMessageId, {
        embeds: [embed],
      });
      if (webhookUrls.length > 1) {
        await sendDiscordWebhooks(webhookUrls.slice(1), {
          embeds: [embed],
        });
      }
    } else if (Array.isArray(existingMessageId)) {
      // New format: array of message IDs - update all matching webhooks
      await updateDiscordWebhooks(webhookUrls, existingMessageId, {
        embeds: [embed],
      });
    }
  } else {
    // Send to all webhooks
    await sendDiscordWebhooks(webhookUrls, {
      embeds: [embed],
    });
  }
}
