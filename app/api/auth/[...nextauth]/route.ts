import NextAuth from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-config";
import { rateLimiters, getClientIdentifier } from "@/lib/security";

const nextAuthHandler = NextAuth(authOptions);

const SENSITIVE_AUTH_ACTIONS = new Set(["signin", "callback", "signout"]);

function isSensitiveAuthRequest(req: NextRequest): boolean {
  const action = req.nextUrl.pathname.split("/").filter(Boolean)[2];
  return SENSITIVE_AUTH_ACTIONS.has(action ?? "");
}

type RouteContext = { params: Promise<{ nextauth: string[] }> };

async function handler(req: NextRequest, context: RouteContext) {
  // Rate-limit sign-in, OAuth callback, and sign-out only.
  // Session/CSRF/providers polling must not share the strict auth limiter.
  if (isSensitiveAuthRequest(req)) {
    const identifier = getClientIdentifier(req);
    if (!rateLimiters.auth.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
  }

  return nextAuthHandler(req, context);
}

export { handler as GET, handler as POST };
