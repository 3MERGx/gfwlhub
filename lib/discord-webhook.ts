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
 * Sends a Discord webhook message
 * @param webhookUrl - The Discord webhook URL
 * @param payload - The webhook payload (content, embeds, etc.)
 * @returns Promise that resolves when the message is sent (or fails silently)
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<void> {
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
    }
  } catch (error) {
    // Fail silently to not disrupt the main flow
    // Log error for debugging
    safeLog.error("Error sending Discord webhook:", error);
  }
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
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
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

  await sendDiscordWebhook(webhookUrl, {
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
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
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

  await sendDiscordWebhook(webhookUrl, {
    embeds: [embed],
  });
}

/**
 * Sends a notification about a new game submission
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
): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return; // Discord notifications disabled
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

  await sendDiscordWebhook(webhookUrl, {
    embeds: [embed],
  });
}

/**
 * Sends a notification about a game submission being reviewed
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
  }
): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
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

  await sendDiscordWebhook(webhookUrl, {
    embeds: [embed],
  });
}

