import { NextRequest, NextResponse } from "next/server";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";

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

  const hostname = url.hostname.toLowerCase();

  // Blacklist NSFW and unsafe domains
  const blacklistedDomains = [
    "pornhub.com",
    "xvideos.com",
    "xhamster.com",
    "redtube.com",
    "youporn.com",
    "tube8.com",
    "spankwire.com",
    "keezmovies.com",
    "extremetube.com",
    "4chan.org",
    "4cdn.org",
    "i.4cdn.org",
    "8chan.co",
    "8kun.top",
    "b-ok.org",
    "libgen.is",
    "libgen.rs",
    "z-lib.org",
  ];

  // Check if domain or any subdomain is blacklisted
  const isBlacklisted = blacklistedDomains.some((domain) => {
    return (
      hostname === domain ||
      hostname.endsWith(`.${domain}`) ||
      hostname.startsWith(`${domain}.`)
    );
  });

  if (isBlacklisted) {
    return NextResponse.json(
      { error: "Domain is blacklisted" },
      { status: 403 }
    );
  }

  // Whitelist allowed domains for security
  const allowedDomains = [
    "pcgamingwiki.com",
    "thumbnails.pcgamingwiki.com",
    "www.pcgamingwiki.com",
    "images.igdb.com",
    "steamcdn-a.akamaihd.net",
    "cdn.akamai.steamstatic.com",
  ];

  const isAllowed = allowedDomains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );

  if (!isAllowed) {
    return NextResponse.json({ error: "Domain not allowed" }, { status: 403 });
  }

    // Fetch the image
    const imageResponse = await fetch(sanitizedImageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GFWLHub/1.0)",
      },
    });

    if (!imageResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch image" },
        { status: imageResponse.status }
      );
    }

    // Get the image data
    const imageBuffer = await imageResponse.arrayBuffer();
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
  } catch (error) {
    safeLog.error("Error proxying image:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
