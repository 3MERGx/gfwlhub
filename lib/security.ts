/**
 * Security Utilities
 * 
 * Provides secure logging, input validation, XSS prevention, and rate limiting
 */

/**
 * Safe logger that only logs in development or when explicitly enabled
 * Prevents sensitive data exposure in production logs
 */
export const safeLog = {
  log: (...args: unknown[]) => {
    if (
      process.env.NODE_ENV === "development" ||
      process.env.DEBUG_ENABLED === "true"
    ) {
      console.log(...args);
    }
  },

  error: (...args: unknown[]) => {
    // Always log errors, but sanitize sensitive data
    if (
      process.env.NODE_ENV === "development" ||
      process.env.DEBUG_ENABLED === "true"
    ) {
      console.error(...args);
    } else {
      // In production, log minimal error info
      const sanitized = args.map((arg) => {
        if (typeof arg === "string") {
          // Remove potential sensitive data patterns
          return arg.replace(/token|password|secret|key|auth/gi, "[REDACTED]");
        }
        return arg;
      });
      console.error(...sanitized);
    }
  },

  warn: (...args: unknown[]) => {
    if (
      process.env.NODE_ENV === "development" ||
      process.env.DEBUG_ENABLED === "true"
    ) {
      console.warn(...args);
    }
  },

  info: (...args: unknown[]) => {
    if (
      process.env.NODE_ENV === "development" ||
      process.env.DEBUG_ENABLED === "true"
    ) {
      console.info(...args);
    }
  },
};

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitizes string input by removing potentially dangerous characters
 * @param input - Input string to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeString(
  input: string,
  maxLength: number = 1000
): string {
  if (!input || typeof input !== "string") return "";
  // Trim and limit length
  let sanitized = input.trim().slice(0, maxLength);
  // Remove null bytes and control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
  return sanitized;
}

/**
 * Escapes HTML special characters to prevent XSS attacks
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Sanitizes markdown-formatted text by escaping HTML while preserving
 * markdown formatting (bold, italic) that will be converted to safe HTML
 */
export function sanitizeMarkdownHtml(text: string): string {
  // First escape all HTML
  let sanitized = escapeHtml(text);
  // Then convert markdown to HTML (safe because we've already escaped)
  sanitized = sanitized
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>");
  return sanitized;
}

/**
 * Simple in-memory rate limiter
 * Note: For production at scale, consider using Redis or a dedicated rate limiting service
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter((time) => now - time < this.windowMs);
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }
}

// Create rate limiters for different endpoints
// In development, use more lenient limits to account for React Strict Mode double renders
const isDevelopment = process.env.NODE_ENV === "development";
const devMultiplier = isDevelopment ? 5 : 1; // 5x more lenient in development

export const rateLimiters = {
  // General API endpoints: 30 requests per minute (150 in dev) - increased for dashboard polling
  api: new RateLimiter(60000, 30 * devMultiplier),
  // Auth endpoints: 5 requests per minute (25 in dev)
  auth: new RateLimiter(60000, 5 * devMultiplier),
  // Upload endpoints: 5 requests per minute (25 in dev)
  upload: new RateLimiter(60000, 5 * devMultiplier),
  // Admin endpoints: 20 requests per minute (100 in dev)
  admin: new RateLimiter(60000, 20 * devMultiplier),
};

/**
 * Get client identifier from request (IP address or user ID)
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  // Try to get IP from headers (works on Vercel and most platforms)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";
  return `ip:${ip}`;
}

/**
 * Validates request body size to prevent DoS attacks via large payloads
 * @param request - Next.js request object
 * @param maxSizeBytes - Maximum allowed size in bytes (default: 1MB for JSON)
 * @returns Object with isValid flag and error message if invalid
 */
export function validateRequestBodySize(
  request: Request,
  maxSizeBytes: number = 1024 * 1024 // 1MB default
): { isValid: boolean; error?: string } {
  const contentLength = request.headers.get("content-length");
  
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (isNaN(size) || size > maxSizeBytes) {
      return {
        isValid: false,
        error: `Request body too large. Maximum size is ${Math.round(maxSizeBytes / 1024)}KB`,
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Safely parses JSON from request body with size validation
 * @param request - Next.js request object
 * @param maxSizeBytes - Maximum allowed size in bytes (default: 1MB)
 * @returns Parsed JSON object or throws error
 */
export async function parseRequestBody<T = unknown>(
  request: Request,
  maxSizeBytes: number = 1024 * 1024 // 1MB default
): Promise<T> {
  // Validate size before parsing
  const validation = validateRequestBodySize(request, maxSizeBytes);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }
  
  // Parse JSON
  return await request.json();
}

