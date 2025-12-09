/**
 * NSFW and unsafe domain blacklist
 * Used to prevent NSFW content and unsafe domains from being submitted
 */

// NSFW adult content domains
const NSFW_DOMAINS = [
  "pornhub.com",
  "xvideos.com",
  "xhamster.com",
  "redtube.com",
  "youporn.com",
  "tube8.com",
  "spankwire.com",
  "keezmovies.com",
  "extremetube.com",
  "porn.com",
  "xnxx.com",
  "xvideo.com",
  "spankbang.com",
  "pornhd.com",
  "porn300.com",
  "pornhubpremium.com",
  "onlyfans.com",
  "chaturbate.com",
  "livejasmin.com",
  "stripchat.com",
];

// Unsafe/controversial image hosting and forum domains
const UNSAFE_DOMAINS = [
  "4chan.org",
  "4cdn.org",
  "i.4cdn.org",
  "8chan.co",
  "8kun.top",
  "8ch.net",
  "endchan.net",
];

// File sharing domains that may host malicious content
const FILE_SHARING_DOMAINS = [
  "b-ok.org",
  "libgen.is",
  "libgen.rs",
  "z-lib.org",
  "libgen.li",
  "libgen.st",
];

// Combine all blacklisted domains
const BLACKLISTED_DOMAINS = [
  ...NSFW_DOMAINS,
  ...UNSAFE_DOMAINS,
  ...FILE_SHARING_DOMAINS,
];

/**
 * Checks if a URL is from a blacklisted NSFW or unsafe domain
 * @param url The URL to check
 * @returns Object with isBlocked boolean and reason string
 */
export function isNsfwDomainBlocked(url: string): {
  isBlocked: boolean;
  reason?: string;
} {
  if (!url || typeof url !== "string") {
    return { isBlocked: false };
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Check if domain or any subdomain is blacklisted
    const isBlacklisted = BLACKLISTED_DOMAINS.some((domain) => {
      return (
        hostname === domain ||
        hostname.endsWith(`.${domain}`) ||
        hostname.startsWith(`${domain}.`)
      );
    });

    if (isBlacklisted) {
      // Determine which category it belongs to for better error message
      if (NSFW_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
        return {
          isBlocked: true,
          reason: "NSFW/adult content domains are not allowed",
        };
      }
      if (UNSAFE_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
        return {
          isBlocked: true,
          reason: "This domain is not allowed for security reasons",
        };
      }
      if (FILE_SHARING_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
        return {
          isBlocked: true,
          reason: "File sharing domains are not allowed",
        };
      }
      return {
        isBlocked: true,
        reason: "This domain is not allowed",
      };
    }

    return { isBlocked: false };
  } catch {
    // Invalid URL format - let other validation handle this
    return { isBlocked: false };
  }
}

/**
 * Checks if a URL appears to be a direct download link (file extension or download pattern)
 * @param url The URL to check
 * @returns Object with isDirectDownload boolean and reason string
 */
export function isDirectDownloadLink(url: string): {
  isDirectDownload: boolean;
  reason?: string;
} {
  if (!url || typeof url !== "string") {
    return { isDirectDownload: false };
  }

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.toLowerCase();
    const searchParams = urlObj.searchParams;

    // Common file extensions that indicate direct downloads
    const downloadExtensions = [
      ".exe",
      ".zip",
      ".rar",
      ".7z",
      ".tar",
      ".gz",
      ".bz2",
      ".iso",
      ".dmg",
      ".pkg",
      ".deb",
      ".rpm",
      ".msi",
      ".bin",
      ".run",
      ".sh",
      ".bat",
      ".cmd",
      ".ps1",
      ".app",
      ".apk",
      ".ipa",
    ];

    // Check if URL ends with a download extension
    const hasDownloadExtension = downloadExtensions.some((ext) =>
      pathname.endsWith(ext)
    );

    // Check for common download patterns in path or query params
    const downloadPatterns = [
      /\/download\//i,
      /\/dl\//i,
      /\/file\//i,
      /\/files\//i,
      /download=true/i,
      /download=1/i,
      /action=download/i,
      /attachment/i,
    ];

    const hasDownloadPattern =
      downloadPatterns.some((pattern) => pattern.test(url)) ||
      searchParams.has("download") ||
      searchParams.has("dl");

    if (hasDownloadExtension || hasDownloadPattern) {
      return {
        isDirectDownload: true,
        reason: "Direct download links are not allowed in this field. Use the dedicated download link field instead.",
      };
    }

    return { isDirectDownload: false };
  } catch {
    // Invalid URL format - let other validation handle this
    return { isDirectDownload: false };
  }
}

