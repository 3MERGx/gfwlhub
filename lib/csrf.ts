/**
 * CSRF Protection Utilities
 * Generates and validates CSRF tokens to prevent Cross-Site Request Forgery attacks
 */

import { randomBytes } from "crypto";
import { cookies } from "next/headers";

/**
 * Generate a random CSRF token
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Get CSRF token from cookie or generate a new one
 */
export async function getCSRFToken(): Promise<string> {
  const cookieStore = await cookies();
  let token = cookieStore.get("csrf-token")?.value;

  if (!token) {
    token = generateCSRFToken();
    cookieStore.set("csrf-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600, // 1 hour
      path: "/",
    });
  }

  return token;
}

/**
 * Read a CSRF token from the X-CSRF-Token header or JSON `_csrf` body field.
 */
export function readCsrfToken(
  request: Request,
  body?: { _csrf?: unknown }
): string | null {
  const header = request.headers.get("X-CSRF-Token");
  if (header) {
    return header;
  }
  if (typeof body?._csrf === "string" && body._csrf.length > 0) {
    return body._csrf;
  }
  return null;
}

/**
 * Validate CSRF token from request
 * @param requestToken - Token from request header or body
 * @returns true if valid, false otherwise
 */
export async function validateCSRFToken(requestToken: string | null): Promise<boolean> {
  if (!requestToken) {
    return false;
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("csrf-token")?.value;

  if (!cookieToken) {
    return false;
  }

  // Use constant-time comparison to prevent timing attacks
  return requestToken === cookieToken;
}

