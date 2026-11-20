import { NextRequest, NextResponse } from "next/server";
import {
  createCorrection,
  getPendingCorrections,
  getAllCorrections,
  canSubmitCorrections,
  canReviewCorrections,
  findRecentPendingCorrection,
} from "@/lib/crowdsource-service-mongodb";
import { requireSession } from "@/lib/api-auth";
import { getGFWLDatabase } from "@/lib/mongodb";
import { CorrectionField, Correction } from "@/types/crowdsource";
import { isCorrectionField, mustObjectId } from "@/lib/mongo-sanitize";
import { sanitizeCorrectionValue } from "@/lib/request-validation";
import { notifyCorrectionSubmitted } from "@/lib/discord-webhook";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { validateCSRFToken } from "@/lib/csrf";
import { valuesAreEffectivelySame } from "@/lib/normalize-value";
import { triggerPusherEvent, PUSHER_EVENTS } from "@/lib/pusher-server";
import { resolveVirusTotalGuiUrlForDownloadLink } from "@/lib/virustotal-resolve-download-scan";

// POST - Submit a new correction
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;
    const { session, user } = auth;

    const identifier = getClientIdentifier(request, user.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Check if user can submit corrections
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
    const {
      gameId,
      gameSlug,
      gameTitle,
      field,
      oldValue,
      newValue,
      reason,
    } = body;

    // Sanitize and validate inputs
    const sanitizedGameId = sanitizeString(String(gameId || ""), 50);
    const sanitizedGameSlug = sanitizeString(String(gameSlug || ""), 200);
    const sanitizedGameTitle = sanitizeString(String(gameTitle || ""), 500);
    const sanitizedField = sanitizeString(String(field || ""), 100);
    const sanitizedReason = sanitizeString(String(reason || ""), 2000);

    // Validate required fields
    if (
      !sanitizedGameId ||
      !sanitizedGameSlug ||
      !sanitizedGameTitle ||
      !sanitizedField ||
      !sanitizedReason
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!isCorrectionField(sanitizedField)) {
      return NextResponse.json(
        { error: "Invalid field" },
        { status: 400 }
      );
    }

    // Validate newValue based on field type
    // Required fields (title, status, activationType) cannot be null/empty
    const requiredFields = ["title", "status", "activationType"];
    if (requiredFields.includes(sanitizedField)) {
      if (newValue === undefined || newValue === null || newValue === "") {
        return NextResponse.json(
          { error: `Field "${sanitizedField}" is required and cannot be cleared` },
          { status: 400 }
        );
      }
    }
    // For optional fields, null is allowed (to clear the field)
    // but newValue must be explicitly provided (not undefined)
    else if (newValue === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const sanitizedOldResult = sanitizeCorrectionValue(
      oldValue,
      sanitizedField
    );
    if (!sanitizedOldResult.ok) {
      return NextResponse.json(
        { error: "Invalid oldValue type" },
        { status: 400 }
      );
    }
    const sanitizedOldValue = sanitizedOldResult.value;

    // Sanitize newValue if it's a string
    let sanitizedNewValue: unknown = newValue;
    if (typeof newValue === "string") {
      const sanitizedStringValue = sanitizeString(newValue, 5000);
      sanitizedNewValue = sanitizedStringValue;
      
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
        "virusTotalUrl",
      ];
      
      if (urlFields.includes(sanitizedField)) {
        const { isNsfwDomainBlocked, isDirectDownloadLink } = await import("@/lib/nsfw-blacklist");
        
        // Check NSFW domains
        const nsfwCheck = isNsfwDomainBlocked(sanitizedStringValue);
        if (nsfwCheck.isBlocked) {
          return NextResponse.json(
            { error: nsfwCheck.reason || "This URL is not allowed" },
            { status: 400 }
          );
        }
        
        // Check for direct download links in non-download fields
        if (sanitizedField !== "downloadLink" && sanitizedField !== "communityAlternativeDownloadLink") {
          const downloadCheck = isDirectDownloadLink(sanitizedStringValue);
          if (downloadCheck.isDirectDownload) {
            return NextResponse.json(
              { error: downloadCheck.reason || "Direct download links are not allowed in this field" },
              { status: 400 }
            );
          }
        }
      }
    } else if (Array.isArray(newValue)) {
      sanitizedNewValue = newValue
        .filter((item): item is string => typeof item === "string")
        .map((item) => sanitizeString(item, 500));
    } else if (typeof newValue === "boolean" && sanitizedField === "isUnplayable") {
      sanitizedNewValue = newValue;
    } else if (newValue === null) {
      sanitizedNewValue = null;
    } else {
      return NextResponse.json(
        { error: "Invalid newValue type" },
        { status: 400 }
      );
    }

    // Reject if the submitted value is effectively the same as current (e.g. "FASA Studio" vs "FASA Studios")
    const db = await getGFWLDatabase();
    const gamesCollection = db.collection("Games");
    const currentGame = await gamesCollection.findOne(
      { slug: sanitizedGameSlug },
      {
        projection: {
          [sanitizedField]: 1,
          communityAlternativeName: 1,
        },
      }
    );
    if (currentGame && sanitizedField in currentGame) {
      const currentValue = currentGame[sanitizedField as keyof typeof currentGame];
      if (valuesAreEffectivelySame(sanitizedNewValue, currentValue)) {
        return NextResponse.json(
          {
            error:
              "The value you submitted is the same as the current value (after normalizing spaces and case). No change needed.",
          },
          { status: 400 }
        );
      }
    }

    if (
      sanitizedField === "communityAlternativeDownloadLink" &&
      typeof sanitizedNewValue === "string" &&
      sanitizedNewValue.trim()
    ) {
      const existingName =
        typeof currentGame?.communityAlternativeName === "string"
          ? currentGame.communityAlternativeName.trim()
          : "";
      if (!existingName) {
        const pendingName = await db.collection("corrections").findOne({
          gameSlug: sanitizedGameSlug,
          submittedBy: user.id,
          field: "communityAlternativeName",
          status: "pending",
          submittedAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
        });
        const pendingNameValue =
          typeof pendingName?.newValue === "string"
            ? pendingName.newValue.trim()
            : "";
        if (!pendingNameValue) {
          return NextResponse.json(
            {
              error:
                "A community alternative name is required when adding a community download link.",
            },
            { status: 400 }
          );
        }
      }
    }

    let autoVirusTotalUrl: string | undefined;
    let virusTotalScan: Correction["virusTotalScan"] | undefined;
    if (
      (sanitizedField === "downloadLink" ||
        sanitizedField === "communityAlternativeDownloadLink") &&
      typeof sanitizedNewValue === "string"
    ) {
      const trimmed = sanitizedNewValue.trim();
      if (/^https?:\/\//i.test(trimmed)) {
        try {
          new URL(trimmed);
        } catch {
          return NextResponse.json(
            { error: "Download link must be a valid http(s) URL." },
            { status: 400 }
          );
        }
        const apiKey = process.env.VIRUSTOTAL_API_KEY;
        if (apiKey) {
          const vtIdentifier = getClientIdentifier(request, user.id);
          if (!rateLimiters.virusTotal.isAllowed(vtIdentifier)) {
            return NextResponse.json(
              {
                error:
                  "Too many VirusTotal scans in a short period. Please wait a minute before submitting another download link correction.",
              },
              { status: 429 }
            );
          }
          const resolved = await resolveVirusTotalGuiUrlForDownloadLink(
            trimmed,
            apiKey
          );
          if (!resolved.ok) {
            return NextResponse.json({ error: resolved.error }, { status: 422 });
          }
          autoVirusTotalUrl = resolved.guiUrl;
          if (resolved.scan) {
            virusTotalScan = {
              ...resolved.scan,
              scannedAt: new Date(),
              source: "submit",
            };
          }
        }
      }
    }

    const correctionExtras = {
      ...(autoVirusTotalUrl !== undefined ? { autoVirusTotalUrl } : {}),
      ...(virusTotalScan !== undefined ? { virusTotalScan } : {}),
    };

    // Check for recent pending correction from same user/game (within 10 minutes)
    const recentCorrection = await findRecentPendingCorrection(
      sanitizedGameSlug,
      user.id,
      10 // 10 minute window - good balance between grouping related corrections and avoiding unrelated ones
    );

    let correction: Correction | undefined;
    let shouldMerge = false;
    let mergedCorrections: Array<{
      id: string;
      gameTitle: string;
      gameSlug: string;
      field: string;
      submittedByName: string;
      reason: string;
      oldValue: unknown;
      newValue: unknown;
    }> = [];

    if (recentCorrection) {
      // Check if this field was already submitted in the recent correction
      if (recentCorrection.field === sanitizedField) {
        // Same field - override the old correction (mark as superseded)
        // This prevents duplicate corrections for the same field and matches user intent
        // (if they submit the same field twice quickly, they're likely correcting their mistake)
        const db = await getGFWLDatabase();
        const correctionsCollection = db.collection("corrections");
        
        // Mark all pending corrections for this user/game/field as superseded
        await correctionsCollection.updateMany(
          {
            gameSlug: sanitizedGameSlug,
            submittedBy: user.id,
            field: sanitizedField,
            status: "pending",
            _id: { $ne: mustObjectId(recentCorrection.id) }, // Don't update the one we just found (it might be the same one)
          },
          {
            $set: {
              status: "superseded",
              reviewedAt: new Date(),
              reviewNotes: "Automatically superseded because a newer correction for the same field was submitted.",
            },
          }
        );
        
        // Get existing webhook message IDs before marking as superseded
        // Need to fetch raw document to access discordMessageIds field
        const recentCorrectionDoc = await correctionsCollection.findOne(
          { _id: mustObjectId(recentCorrection.id) }
        );
        const existingMessageIds = recentCorrectionDoc?.discordMessageIds as string[] | undefined ||
          (recentCorrectionDoc?.discordMessageId ? [recentCorrectionDoc.discordMessageId as string] : null);
        
        // Also mark the recent correction itself if it's still pending
        await correctionsCollection.updateOne(
          { _id: mustObjectId(recentCorrection.id), status: "pending" },
          {
            $set: {
              status: "superseded",
              reviewedAt: new Date(),
              reviewNotes: "Automatically superseded because a newer correction for the same field was submitted.",
            },
          }
        );
        
        // Create new correction
        correction = await createCorrection({
          gameId: sanitizedGameId,
          gameSlug: sanitizedGameSlug,
          gameTitle: sanitizedGameTitle,
          submittedBy: user.id,
          submittedByName: user.name,
          field: sanitizedField as CorrectionField,
          oldValue: sanitizedOldValue,
          newValue: sanitizedNewValue,
          reason: sanitizedReason,
          ...correctionExtras,
        });
        
        // Update existing webhook with new correction value (replaces old same-field correction)
        // This keeps the webhook clean and shows the latest value
        if (existingMessageIds && existingMessageIds.length > 0) {
          // Get all other pending corrections for this user/game to include in webhook
          const cutoffTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
          const allPendingCorrections = await correctionsCollection
            .find({
              gameSlug: sanitizedGameSlug,
              submittedBy: user.id,
              status: "pending",
              submittedAt: { $gte: cutoffTime },
            })
            .sort({ submittedAt: 1 })
            .toArray();
          
          // Build corrections array for webhook (exclude superseded ones)
          const correctionsForWebhook = allPendingCorrections.map((c) => ({
            id: c._id.toString(),
            gameTitle: c.gameTitle,
            gameSlug: c.gameSlug,
            field: c.field,
            submittedByName: c.submittedByName,
            reason: c.reason,
            oldValue: c.oldValue,
            newValue: c.newValue,
          }));
          
          // Update webhook with all pending corrections (including the new one)
          const { notifyCorrectionSubmitted } = await import("@/lib/discord-webhook");
          notifyCorrectionSubmitted(correctionsForWebhook, existingMessageIds)
            .then(async (messageIds) => {
              if (messageIds && messageIds.length > 0) {
                // Store message IDs in all pending corrections (including the new one)
                await correctionsCollection.updateMany(
                  {
                    gameSlug: sanitizedGameSlug,
                    submittedBy: user.id,
                    status: "pending",
                    submittedAt: { $gte: cutoffTime },
                  },
                  { $set: { discordMessageIds: messageIds } }
                );
              }
            })
            .catch((error) => {
              safeLog.error("Failed to update Discord webhook:", error);
            });
        } else {
          // No existing webhook - send new one
          const { notifyCorrectionSubmitted } = await import("@/lib/discord-webhook");
          notifyCorrectionSubmitted([{
            id: correction.id,
            gameTitle: correction.gameTitle,
            gameSlug: correction.gameSlug,
            field: correction.field,
            submittedByName: correction.submittedByName,
            reason: correction.reason,
            oldValue: correction.oldValue,
            newValue: correction.newValue,
          }]).then(async (messageIds) => {
            if (messageIds && messageIds.length > 0 && correction) {
              await correctionsCollection.updateOne(
                { _id: mustObjectId(correction.id) },
                { $set: { discordMessageIds: messageIds } }
              );
            }
          }).catch((error) => {
            safeLog.error("Failed to send Discord notification:", error);
          });
        }
        
        // Don't merge - we've handled webhook update above
        shouldMerge = false;
      } else {
        // Different field - merge them
        shouldMerge = true;
      }
    }

    if (shouldMerge && recentCorrection) {
      // Found a recent correction with a different field - merge them
      shouldMerge = true;
      
      // Create the new correction
      correction = await createCorrection({
        gameId: sanitizedGameId,
        gameSlug: sanitizedGameSlug,
        gameTitle: sanitizedGameTitle,
        submittedBy: user.id,
        submittedByName: user.name,
        field: sanitizedField as CorrectionField,
        oldValue: sanitizedOldValue,
        newValue: sanitizedNewValue,
        reason: sanitizedReason,
        ...correctionExtras,
      });

      // Get all pending corrections from this user for this game (including the new one)
      const db = await getGFWLDatabase();
      const correctionsCollection = db.collection("corrections");
      const cutoffTime = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      
      const allRecentCorrections = await correctionsCollection
        .find({
          gameSlug: sanitizedGameSlug,
          submittedBy: user.id,
          status: "pending",
          submittedAt: { $gte: cutoffTime },
        })
        .sort({ submittedAt: 1 })
        .toArray();

      // Build merged corrections array for webhook
      mergedCorrections = allRecentCorrections.map((c) => ({
        id: c._id.toString(),
        gameTitle: c.gameTitle,
        gameSlug: c.gameSlug,
        field: c.field,
        submittedByName: c.submittedByName,
        reason: c.reason,
        oldValue: c.oldValue,
        newValue: c.newValue,
      }));

      // Update webhook with merged corrections
      // Need to fetch raw document to access discordMessageIds field
      const recentCorrectionDoc = await correctionsCollection.findOne(
        { _id: mustObjectId(recentCorrection.id) }
      );
      const existingMessageIds = recentCorrectionDoc?.discordMessageIds as string[] | undefined ||
        (recentCorrectionDoc?.discordMessageId ? [recentCorrectionDoc.discordMessageId as string] : null);

      notifyCorrectionSubmitted(
        mergedCorrections,
        existingMessageIds
      ).then(async (messageIds) => {
        if (messageIds && messageIds.length > 0) {
          // Store message IDs in all recent corrections
          await correctionsCollection.updateMany(
            {
              gameSlug: sanitizedGameSlug,
              submittedBy: user.id,
              status: "pending",
              submittedAt: { $gte: cutoffTime },
            },
            { $set: { discordMessageIds: messageIds } }
          );
        }
      }).catch((error) => {
        safeLog.error("Failed to send Discord notification:", error);
      });
    } else {
      // No recent correction or same field - create new correction normally
      correction = await createCorrection({
        gameId: sanitizedGameId,
        gameSlug: sanitizedGameSlug,
        gameTitle: sanitizedGameTitle,
        submittedBy: user.id,
        submittedByName: user.name,
        field: sanitizedField as CorrectionField,
        oldValue: sanitizedOldValue,
        newValue: sanitizedNewValue,
        reason: sanitizedReason,
        ...correctionExtras,
      });

      // Send Discord notification (non-blocking)
      notifyCorrectionSubmitted({
        id: correction.id,
        gameTitle: correction.gameTitle,
        gameSlug: correction.gameSlug,
        field: correction.field,
        submittedByName: correction.submittedByName,
        reason: correction.reason,
        oldValue: correction.oldValue,
        newValue: correction.newValue,
      }).then(async (messageIds) => {
        if (messageIds && messageIds.length > 0 && correction) {
          // Store message IDs in correction
          const db = await getGFWLDatabase();
          const correctionsCollection = db.collection("corrections");
          await correctionsCollection.updateOne(
            { _id: mustObjectId(correction.id) },
            { $set: { discordMessageIds: messageIds } }
          );
        }
      }).catch((error) => {
        safeLog.error("Failed to send Discord notification:", error);
      });
    }

    // Revalidate paths (game pages unchanged until a correction is approved)
    revalidatePath("/dashboard/submissions");

    triggerPusherEvent(PUSHER_EVENTS.SUBMISSIONS_UPDATED);

    return NextResponse.json({ correction }, { status: 201 });
  } catch (error) {
    safeLog.error("Error submitting correction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET - Fetch corrections (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;
    const { user } = auth;

    const identifier = getClientIdentifier(request, user.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = sanitizeString(searchParams.get("status") || "", 50);
    const gameSlug = sanitizeString(searchParams.get("gameSlug") || "", 200);
    const userId = sanitizeString(searchParams.get("userId") || "", 50);

    // Regular users can only see their own corrections
    if (!canReviewCorrections(user)) {
      const { getCorrectionsByUser } = await import(
        "@/lib/crowdsource-service-mongodb"
      );
      if (userId && userId !== user.id) {
        // Viewing another user's profile: don't expose their submissions
        return NextResponse.json({ corrections: [] });
      }
      const corrections = await getCorrectionsByUser(user.id);
      return NextResponse.json({ corrections });
    }

    // For reviewers and admins, handle filtering
    if (status === "pending") {
      const corrections = await getPendingCorrections();
      return NextResponse.json({ corrections });
    }

    if (gameSlug) {
      const { getCorrectionsByGame } = await import(
        "@/lib/crowdsource-service-mongodb"
      );
      const corrections = await getCorrectionsByGame(gameSlug);
      return NextResponse.json({ corrections });
    }

    if (userId) {
      const { getCorrectionsByUser } = await import(
        "@/lib/crowdsource-service-mongodb"
      );
      const corrections = await getCorrectionsByUser(userId);
      return NextResponse.json({ corrections });
    }

    // Return all corrections by default for reviewers/admins (for stats and full view)
    // Limit to 1000 corrections to prevent memory issues
    const corrections = await getAllCorrections(1000);
    return NextResponse.json(
      { corrections },
      {
        headers: {
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    safeLog.error("Error fetching corrections:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

