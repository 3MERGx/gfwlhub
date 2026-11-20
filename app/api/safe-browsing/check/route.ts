import { NextRequest, NextResponse } from "next/server";
import { checkUrlSafety } from "@/lib/google-safe-browsing";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";
import { requireSession } from "@/lib/api-auth";
import { internalError, jsonError } from "@/lib/api-error";
import { readCsrfToken, validateCSRFToken } from "@/lib/csrf";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const identifier = getClientIdentifier(request, auth.user.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return jsonError("Too many requests. Please try again later.", 429);
    }

    const body = await request.json();
    const csrfToken = readCsrfToken(request, body);
    if (!(await validateCSRFToken(csrfToken))) {
      return jsonError("Invalid CSRF token", 403);
    }

    const { url } = body;

    // Sanitize and validate URL
    const sanitizedUrl = sanitizeString(String(url || ""), 2000);
    if (!sanitizedUrl || typeof url !== "string") {
      return jsonError("URL is required", 400);
    }

    const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
    if (!apiKey) {
      safeLog.error(
        "Google Safe Browsing API key not found in environment variables"
      );
      return jsonError(
        "URL safety check is temporarily unavailable. Please try again later.",
        503
      );
    }

    // Validate URL format
    try {
      new URL(sanitizedUrl);
    } catch {
      return jsonError("Invalid URL format", 400);
    }

    const result = await checkUrlSafety(sanitizedUrl, apiKey);

    if (!result.success) {
      safeLog.error("Google Safe Browsing check failed:", result.error);
      return jsonError(
        "Failed to check URL. Please try again later.",
        503
      );
    }

    return NextResponse.json({
      isSafe: result.isSafe,
      threatType: result.threatType,
    });
  } catch (error) {
    return internalError("Google Safe Browsing check error:", error);
  }
}
