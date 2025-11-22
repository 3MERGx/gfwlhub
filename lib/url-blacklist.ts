/**
 * URL Blacklist for blocking known malicious domains
 * This list should be regularly updated with known malicious domains
 */

// Known malicious domains (add more as needed)
const MALICIOUS_DOMAINS = [
  // Common malicious file hosting domains
  "malware.com",
  "virus-distribution.com",
  "phishing-site.com",
  // Add more domains as you discover them
];

// Suspicious patterns that might indicate malicious URLs
const SUSPICIOUS_PATTERNS = [
  /bit\.ly/i, // URL shorteners (can be used to hide malicious links)
  /tinyurl\.com/i,
  /t\.co/i,
  /goo\.gl/i,
  // Add more patterns as needed
];

/**
 * Extracts the domain from a URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Checks if a URL is blacklisted
 * @param url The URL to check
 * @returns Object with isBlocked boolean and reason string
 */
export function isUrlBlacklisted(url: string): {
  isBlocked: boolean;
  reason?: string;
} {
  if (!url || typeof url !== "string") {
    return { isBlocked: false };
  }

  const domain = extractDomain(url);
  if (!domain) {
    return { isBlocked: false };
  }

  // Check against malicious domains list
  for (const maliciousDomain of MALICIOUS_DOMAINS) {
    if (domain === maliciousDomain || domain.endsWith(`.${maliciousDomain}`)) {
      return {
        isBlocked: true,
        reason: `Domain "${domain}" is on the blacklist`,
      };
    }
  }

  // Check against suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(url)) {
      return {
        isBlocked: true,
        reason: "URL shorteners are not allowed for security reasons",
      };
    }
  }

  return { isBlocked: false };
}

/**
 * Validates a URL and checks if it's blacklisted
 * @param url The URL to validate
 * @returns Object with isValid, isBlocked, and reason
 */
export function validateUrl(url: string): {
  isValid: boolean;
  isBlocked: boolean;
  reason?: string;
} {
  // First check if it's a valid URL format
  try {
    new URL(url);
  } catch {
    return {
      isValid: false,
      isBlocked: false,
      reason: "Invalid URL format",
    };
  }

  // Then check if it's blacklisted
  const blacklistCheck = isUrlBlacklisted(url);
  if (blacklistCheck.isBlocked) {
    return {
      isValid: true,
      isBlocked: true,
      reason: blacklistCheck.reason,
    };
  }

  return {
    isValid: true,
    isBlocked: false,
  };
}
