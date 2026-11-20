import { NextResponse } from "next/server";
import { getCSRFToken } from "@/lib/csrf";
import { getValidSession, unauthorizedResponse } from "@/lib/api-auth";
import { internalError } from "@/lib/api-error";

/**
 * GET /api/csrf-token
 * Returns a CSRF token for authenticated users
 */
export async function GET() {
  try {
    const session = await getValidSession();

    if (!session) {
      return unauthorizedResponse();
    }

    const token = await getCSRFToken();

    return NextResponse.json({ csrfToken: token });
  } catch (error) {
    return internalError("Error generating CSRF token:", error);
  }
}
