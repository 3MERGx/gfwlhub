import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  createCorrection,
  getPendingCorrections,
  getAllCorrections,
  canSubmitCorrections,
  getUserByEmail,
  findRecentPendingCorrection,
} from "@/lib/crowdsource-service-mongodb";
import { getGFWLDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { CorrectionField, Correction } from "@/types/crowdsource";
import { notifyCorrectionSubmitted } from "@/lib/discord-webhook";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { validateCSRFToken } from "@/lib/csrf";

// POST - Submit a new correction
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

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await getUserByEmail(session.user.email!);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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

    // Sanitize newValue if it's a string
    let sanitizedNewValue = newValue;
    if (typeof newValue === "string") {
      sanitizedNewValue = sanitizeString(newValue, 5000);
      
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
      
      if (urlFields.includes(sanitizedField)) {
        const { isNsfwDomainBlocked, isDirectDownloadLink } = await import("@/lib/nsfw-blacklist");
        
        // Check NSFW domains
        const nsfwCheck = isNsfwDomainBlocked(sanitizedNewValue);
        if (nsfwCheck.isBlocked) {
          return NextResponse.json(
            { error: nsfwCheck.reason || "This URL is not allowed" },
            { status: 400 }
          );
        }
        
        // Check for direct download links in non-download fields
        if (sanitizedField !== "downloadLink" && sanitizedField !== "communityAlternativeDownloadLink") {
          const downloadCheck = isDirectDownloadLink(sanitizedNewValue);
          if (downloadCheck.isDirectDownload) {
            return NextResponse.json(
              { error: downloadCheck.reason || "Direct download links are not allowed in this field" },
              { status: 400 }
            );
          }
        }
      }
    } else if (Array.isArray(newValue)) {
      sanitizedNewValue = newValue.map((item) => 
        typeof item === "string" ? sanitizeString(item, 500) : item
      );
    }

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
            _id: { $ne: new ObjectId(recentCorrection.id) }, // Don't update the one we just found (it might be the same one)
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
          { _id: new ObjectId(recentCorrection.id) }
        );
        const existingMessageIds = recentCorrectionDoc?.discordMessageIds as string[] | undefined ||
          (recentCorrectionDoc?.discordMessageId ? [recentCorrectionDoc.discordMessageId as string] : null);
        
        // Also mark the recent correction itself if it's still pending
        await correctionsCollection.updateOne(
          { _id: new ObjectId(recentCorrection.id), status: "pending" },
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
          oldValue: oldValue === undefined ? null : oldValue,
          newValue: sanitizedNewValue,
          reason: sanitizedReason,
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
                { _id: new ObjectId(correction.id) },
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
        oldValue: oldValue === undefined ? null : oldValue,
        newValue: sanitizedNewValue,
        reason: sanitizedReason,
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
        { _id: new ObjectId(recentCorrection.id) }
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
        oldValue: oldValue === undefined ? null : oldValue,
        newValue: sanitizedNewValue,
        reason: sanitizedReason,
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
            { _id: new ObjectId(correction.id) },
            { $set: { discordMessageIds: messageIds } }
          );
        }
      }).catch((error) => {
        safeLog.error("Failed to send Discord notification:", error);
      });
    }

    // Revalidate paths
    revalidatePath("/dashboard/submissions");
    revalidatePath(`/games/${sanitizedGameSlug}`);
    revalidatePath("/");

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
    // Rate limiting
    const session = await getServerSession(authOptions);
    const identifier = getClientIdentifier(request, session?.user?.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const user = await getUserByEmail(session.user.email!);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = sanitizeString(searchParams.get("status") || "", 50);
    const gameSlug = sanitizeString(searchParams.get("gameSlug") || "", 200);
    const userId = sanitizeString(searchParams.get("userId") || "", 50);

    // Regular users can only see their own corrections
    if (user.role === "user") {
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

