import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { revalidatePath } from "next/cache";
import { validateCSRFToken } from "@/lib/csrf";

// POST - Add a new game to the database (admin only)
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const session = await getServerSession(authOptions);
    const identifier = getClientIdentifier(request, session?.user?.id);
    if (!rateLimiters.admin.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Only admins can add games
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      title,
      slug,
      activationType,
      status,
      description,
      releaseDate,
      developer,
      publisher,
      genres,
      platforms,
      wikiLink,
      imageUrl,
      discordLink,
      redditLink,
      steamDBLink,
      downloadLink,
      fileName,
      purchaseLink,
      gogDreamlistLink,
      instructions,
      virusTotalUrl,
      knownIssues,
      communityTips,
      additionalDRM,
      playabilityStatus,
      isUnplayable,
      communityAlternativeName,
      communityAlternativeUrl,
      communityAlternativeDownloadLink,
      remasteredName,
      remasteredPlatform,
    } = body;

    // Sanitize and validate required fields
    const sanitizedTitle = sanitizeString(String(title || ""), 500);
    const sanitizedSlug = sanitizeString(String(slug || ""), 200);
    const sanitizedActivationType = sanitizeString(String(activationType || ""), 50);
    const sanitizedStatus = sanitizeString(String(status || ""), 50);
    const sanitizedDescription = sanitizeString(String(description || ""), 5000);
    const sanitizedReleaseDate = sanitizeString(String(releaseDate || ""), 100);
    const sanitizedDeveloper = sanitizeString(String(developer || ""), 200);
    const sanitizedPublisher = sanitizeString(String(publisher || ""), 200);

    // Validate required fields
    if (!sanitizedTitle || !sanitizedSlug || !sanitizedActivationType || !sanitizedStatus) {
      return NextResponse.json(
        { error: "Missing required fields: title, slug, activationType, status" },
        { status: 400 }
      );
    }

    // Validate activationType
    const validActivationTypes = ["Legacy (5x5)", "Legacy (Per-Title)", "SSA"];
    if (!validActivationTypes.includes(sanitizedActivationType)) {
      return NextResponse.json(
        { error: "Invalid activationType. Must be one of: Legacy (5x5), Legacy (Per-Title), SSA" },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ["supported", "testing", "unsupported"];
    if (!validStatuses.includes(sanitizedStatus)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: supported, testing, unsupported" },
        { status: 400 }
      );
    }

    const db = await getGFWLDatabase();
    const gamesCollection = db.collection("Games");

    // Check if game with this slug already exists
    const existingGame = await gamesCollection.findOne({ slug: sanitizedSlug });
    if (existingGame) {
      return NextResponse.json(
        { error: "A game with this slug already exists" },
        { status: 409 }
      );
    }

    // Build game document
    const game: Record<string, unknown> = {
      title: sanitizedTitle,
      slug: sanitizedSlug,
      activationType: sanitizedActivationType,
      status: sanitizedStatus,
      featureEnabled: false,
      readyToPublish: false,
    };

    // Add optional fields if provided
    if (sanitizedDescription) game.description = sanitizedDescription;
    if (sanitizedReleaseDate) game.releaseDate = sanitizedReleaseDate;
    if (sanitizedDeveloper) game.developer = sanitizedDeveloper;
    if (sanitizedPublisher) game.publisher = sanitizedPublisher;
    if (genres && Array.isArray(genres)) {
      game.genres = genres.map((g: unknown) => sanitizeString(String(g || ""), 100)).filter(Boolean);
    }
    if (platforms && Array.isArray(platforms)) {
      game.platforms = platforms.map((p: unknown) => sanitizeString(String(p || ""), 100)).filter(Boolean);
    }
    if (wikiLink) game.wikiLink = sanitizeString(String(wikiLink), 500);
    if (imageUrl) game.imageUrl = sanitizeString(String(imageUrl), 500);
    if (discordLink) game.discordLink = sanitizeString(String(discordLink), 500);
    if (redditLink) game.redditLink = sanitizeString(String(redditLink), 500);
    if (steamDBLink) game.steamDBLink = sanitizeString(String(steamDBLink), 500);
    if (downloadLink) game.downloadLink = sanitizeString(String(downloadLink), 500);
    if (fileName) game.fileName = sanitizeString(String(fileName), 200);
    if (purchaseLink) game.purchaseLink = sanitizeString(String(purchaseLink), 500);
    if (gogDreamlistLink) game.gogDreamlistLink = sanitizeString(String(gogDreamlistLink), 500);
    if (instructions && Array.isArray(instructions)) {
      game.instructions = instructions.map((i: unknown) => sanitizeString(String(i || ""), 1000)).filter(Boolean);
    }
    if (virusTotalUrl) game.virusTotalUrl = sanitizeString(String(virusTotalUrl), 500);
    if (knownIssues && Array.isArray(knownIssues)) {
      game.knownIssues = knownIssues.map((i: unknown) => sanitizeString(String(i || ""), 1000)).filter(Boolean);
    }
    if (communityTips && Array.isArray(communityTips)) {
      game.communityTips = communityTips.map((t: unknown) => sanitizeString(String(t || ""), 1000)).filter(Boolean);
    }
    if (additionalDRM) game.additionalDRM = sanitizeString(String(additionalDRM), 500);
    if (playabilityStatus) {
      const validPlayabilityStatuses = ["playable", "unplayable", "community_alternative", "remastered_available"];
      if (validPlayabilityStatuses.includes(String(playabilityStatus))) {
        game.playabilityStatus = playabilityStatus;
      }
    }
    if (typeof isUnplayable === "boolean") game.isUnplayable = isUnplayable;
    if (communityAlternativeName) game.communityAlternativeName = sanitizeString(String(communityAlternativeName), 200);
    if (communityAlternativeUrl) game.communityAlternativeUrl = sanitizeString(String(communityAlternativeUrl), 500);
    if (communityAlternativeDownloadLink) game.communityAlternativeDownloadLink = sanitizeString(String(communityAlternativeDownloadLink), 500);
    if (remasteredName) game.remasteredName = sanitizeString(String(remasteredName), 200);
    if (remasteredPlatform) game.remasteredPlatform = sanitizeString(String(remasteredPlatform), 100);

    // Insert the game
    const result = await gamesCollection.insertOne(game);

    // Revalidate paths
    revalidatePath("/dashboard/games");
    revalidatePath(`/games/${sanitizedSlug}`);
    revalidatePath("/");
    revalidatePath("/supported-games");
    // Revalidate API route cache
    revalidatePath("/api/games");

    return NextResponse.json({
      success: true,
      gameId: result.insertedId.toString(),
      slug: sanitizedSlug,
    });
  } catch (error) {
    safeLog.error("Error adding game:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

