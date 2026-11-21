/**
 * Utility functions for handling images, especially OAuth provider avatars
 * and external cover art hosts that block or rate-limit certain clients.
 */

/**
 * Get the appropriate image URL for avatars
 * Returns the URL as-is since OAuth provider domains are configured in next.config.js
 * and we're using unoptimized images which bypass Next.js optimization
 */
export function getAvatarUrl(avatar: string | null): string | null {
  // OAuth provider images are configured in next.config.js remotePatterns
  // and we use unoptimized prop, so we can use them directly
  return avatar;
}

/**
 * Cloudflare often blocks Node/Vercel fetches (and sometimes the thumbnails
 * host entirely). images.pcgamingwiki.com serves the same file for browsers.
 */
export function rewritePcGamingWikiImageUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.hostname.toLowerCase() !== "thumbnails.pcgamingwiki.com") {
      return rawUrl;
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 3) return rawUrl;

    const last = parts[parts.length - 1];
    if (/^\d+px-/i.test(last)) {
      return `https://images.pcgamingwiki.com/${parts.slice(0, -1).join("/")}`;
    }

    return `https://images.pcgamingwiki.com${parsed.pathname}`;
  } catch {
    return rawUrl;
  }
}

/**
 * Wikimedia sometimes rejects sized thumb paths. Fall back to the original file.
 * Example:
 * /wikipedia/en/thumb/7/76/Foo.jpg/220px-Foo.jpg → /wikipedia/en/7/76/Foo.jpg
 */
export function rewriteWikimediaThumbUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    if (!host.endsWith("wikimedia.org") && !host.endsWith("wikipedia.org")) {
      return rawUrl;
    }

    const match = parsed.pathname.match(
      /^(\/wikipedia\/[^/]+)\/thumb\/([^/]+\/[^/]+\/[^/]+)\/\d+px-.+$/i
    );
    if (!match) return rawUrl;

    parsed.pathname = `${match[1]}/${match[2]}`;
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

/**
 * Domains that should be fetched through /api/image-proxy from the browser.
 * Prefer browser-direct loading for hosts that block datacenter IPs (e.g. PCGamingWiki).
 */
export const IMAGE_PROXY_DOMAINS = [
  "upload.wikimedia.org",
  "wikimedia.org",
] as const;

export function shouldProxyImageUrl(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    return IMAGE_PROXY_DOMAINS.some(
      (domain) => host === domain || host.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Normalize cover URLs for display (rewrite fragile CDN paths).
 */
export function normalizeCoverImageUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) return rawUrl;
  if (!rawUrl.startsWith("http")) return rawUrl;

  let url = rewritePcGamingWikiImageUrl(rawUrl);
  url = rewriteWikimediaThumbUrl(url);
  return url;
}

/**
 * Candidate URLs to try when server-side proxying (original first, then rewrites).
 */
export function expandImageUrlCandidates(rawUrl: string): string[] {
  const candidates = [rawUrl];
  const pcgw = rewritePcGamingWikiImageUrl(rawUrl);
  if (pcgw !== rawUrl) candidates.push(pcgw);
  const wiki = rewriteWikimediaThumbUrl(rawUrl);
  if (wiki !== rawUrl) candidates.push(wiki);
  return [...new Set(candidates)];
}
