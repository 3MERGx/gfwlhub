import { NextRequest, NextResponse } from "next/server";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { isNsfwDomainBlocked } from "@/lib/nsfw-blacklist";

export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const identifier = getClientIdentifier(request);
    if (!rateLimiters.api.isAllowed(identifier)) {
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
    "www.pcgamingwiki.com",
    "images.igdb.com",
    "steamcdn-a.akamaihd.net",
    "cdn.akamai.steamstatic.com",
    // SteamGridDB domains
    "steamgriddb.com",
    "www.steamgriddb.com",
    "cdn.steamgriddb.com",
    "cdn2.steamgriddb.com",
    // OAuth provider image domains
    "lh3.googleusercontent.com",
    "googleusercontent.com",
    "avatars.githubusercontent.com",
    "githubusercontent.com",
    "cdn.discordapp.com",
    "discordapp.com",
    "discord.com",
  ];

  const isAllowed = allowedDomains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );

  if (!isAllowed) {
    return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
  }

    // Fetch the image with timeout (10 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
    const imageResponse = await fetch(sanitizedImageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GFWLHub/1.0)",
      },
        signal: controller.signal,
    });

      clearTimeout(timeoutId);

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: imageResponse.status }
      );
    }

      // Check content-length header for file size (max 10MB)
      const contentLength = imageResponse.headers.get("content-length");
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB
      if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
        return NextResponse.json(
          { error: "Image file too large. Maximum size is 10MB" },
          { status: 413 }
        );
      }

    // Get the image data
    const imageBuffer = await imageResponse.arrayBuffer();
      
      // Double-check actual size (in case content-length was missing)
      if (imageBuffer.byteLength > maxSizeBytes) {
        return NextResponse.json(
          { error: "Image file too large. Maximum size is 10MB" },
          { status: 413 }
        );
      }

      // Validate image dimensions (optional - can be expensive, so we'll skip for now)
      // For production, consider using sharp or similar to validate dimensions
      
    const contentType =
      imageResponse.headers.get("content-type") || "image/jpeg";

    // Return the image with appropriate headers
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
      if (error instanceof Error && error.name === "AbortError") {
        return NextResponse.json(
          { error: "Image fetch timeout. Please try again." },
          { status: 408 }
        );
      }
      safeLog.error("Error proxying image:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  } catch (error) {
    safeLog.error("Error proxying image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
