import { NextRequest, NextResponse } from "next/server";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { isNsfwDomainBlocked } from "@/lib/nsfw-blacklist";
import { expandImageUrlCandidates } from "@/lib/image-utils";

const ALLOWED_IMAGE_CONTENT_TYPES: Record<string, string> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/gif": "image/gif",
  "image/webp": "image/webp",
  "image/avif": "image/avif",
};

function parseAllowedImageContentType(header: string | null): string | null {
  if (!header) return null;
  const mediaType = sanitizeString(header, 100).split(";")[0].trim().toLowerCase();
  return ALLOWED_IMAGE_CONTENT_TYPES[mediaType] ?? null;
}

function fetchHeadersForImageUrl(imageUrl: string): HeadersInit {
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  };
  try {
    const host = new URL(imageUrl).hostname.toLowerCase();
    if (host.endsWith("pcgamingwiki.com")) {
      headers.Referer = "https://www.pcgamingwiki.com/";
    } else if (host.endsWith("steamgriddb.com")) {
      headers.Referer = "https://www.steamgriddb.com/";
    } else if (host.endsWith("wikimedia.org") || host.endsWith("wikipedia.org")) {
      headers.Referer = "https://www.wikipedia.org/";
    }
  } catch {
    // ignore
  }
  return headers;
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(request);
    if (!rateLimiters.imageProxy.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get("url");

    // Sanitize and validate URL
    const sanitizedImageUrl = imageUrl ? sanitizeString(String(imageUrl), 2000) : "";

    if (!sanitizedImageUrl) {
      return NextResponse.json(
        { error: "Missing url parameter" },
        { status: 400 }
      );
    }

    // Validate that it's a valid URL
    let url: URL;
    try {
      url = new URL(sanitizedImageUrl);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

  // Check NSFW and unsafe domains using shared blacklist
  const nsfwCheck = isNsfwDomainBlocked(sanitizedImageUrl);
  if (nsfwCheck.isBlocked) {
    return NextResponse.json(
      { error: nsfwCheck.reason || "Domain is blacklisted" },
      { status: 403 }
    );
  }

  const hostname = url.hostname.toLowerCase();

  // Whitelist allowed domains for security
  const allowedDomains = [
    "pcgamingwiki.com",
    "thumbnails.pcgamingwiki.com",
    "images.pcgamingwiki.com",
    "www.pcgamingwiki.com",
    "upload.wikimedia.org",
    "wikimedia.org",
    "images.igdb.com",
    "steamcdn-a.akamaihd.net",
    "cdn.akamai.steamstatic.com",
    // SteamGridDB domains
    "steamgriddb.com",
    "www.steamgriddb.com",
    "cdn.steamgriddb.com",
    "cdn2.steamgriddb.com",
    // TrueAchievements box art
    "trueachievements.com",
    "www.trueachievements.com",
    // Google image CDN (e.g. encrypted-tbn0.gstatic.com for thumbnails)
    "gstatic.com",
    "encrypted-tbn0.gstatic.com",
    // OAuth provider image domains
    "lh3.googleusercontent.com",
    "googleusercontent.com",
    "avatars.githubusercontent.com",
    "githubusercontent.com",
    "cdn.discordapp.com",
    "discordapp.com",
    "discord.com",
    // Internet Archive (box art hosted with game dumps, e.g. *.archive.org)
    "archive.org",
  ];

  const isAllowed = allowedDomains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );

  if (!isAllowed) {
    return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
  }

    const urlCandidates = expandImageUrlCandidates(sanitizedImageUrl);
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB
    let lastStatus = 502;
    let lastError: unknown;

    for (const candidateUrl of urlCandidates) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const imageResponse = await fetch(candidateUrl, {
          headers: fetchHeadersForImageUrl(candidateUrl),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!imageResponse.ok) {
          lastStatus = imageResponse.status;
          continue;
        }

        const contentLength = imageResponse.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
          return NextResponse.json(
            { error: "Image file too large. Maximum size is 10MB" },
            { status: 413 }
          );
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        if (imageBuffer.byteLength > maxSizeBytes) {
          return NextResponse.json(
            { error: "Image file too large. Maximum size is 10MB" },
            { status: 413 }
          );
        }

        const contentType = parseAllowedImageContentType(
          imageResponse.headers.get("content-type")
        );
        if (!contentType) {
          lastStatus = 400;
          continue;
        }

        return new NextResponse(imageBuffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
            "Access-Control-Allow-Origin": "*",
          },
        });
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        lastError = error;
        if (error instanceof Error && error.name === "AbortError") {
          lastStatus = 408;
          continue;
        }
        safeLog.error("Error proxying image candidate:", {
          candidateUrl,
          error,
        });
      }
    }

    if (lastStatus === 408) {
      return NextResponse.json(
        { error: "Image fetch timeout. Please try again." },
        { status: 408 }
      );
    }

    if (lastError) {
      safeLog.error("Error proxying image:", lastError);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: lastStatus || 502 }
    );
  } catch (error) {
    safeLog.error("Error proxying image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
