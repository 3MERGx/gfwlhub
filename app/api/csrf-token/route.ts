import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getCSRFToken } from "@/lib/csrf";

/**
 * GET /api/csrf-token
 * Returns a CSRF token for authenticated users
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const token = await getCSRFToken();

  return NextResponse.json({ csrfToken: token });
}

