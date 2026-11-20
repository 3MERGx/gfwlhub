import { NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  canManageUsers,
  canReviewCorrections,
  getUserByEmail,
  getUserById,
} from "@/lib/crowdsource-service-mongodb";
import type { User } from "@/types/crowdsource";

export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function sessionExpiredResponse(
  code: "SessionExpired" | "SessionInvalidated"
) {
  return NextResponse.json({ error: "Session expired", code }, { status: 401 });
}

export function hasValidSession(session: Session | null): session is Session {
  return Boolean(
    session &&
      !session.error &&
      session.user?.id &&
      session.user.id.length > 0
  );
}

export async function getValidSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  return hasValidSession(session) ? session : null;
}

type AuthFailure = { ok: false; response: NextResponse };
type AuthSuccess = { ok: true; session: Session; user: User };
export type AuthResult = AuthFailure | AuthSuccess;

export async function requireSession(): Promise<AuthResult> {
  const session = await getServerSession(authOptions);
  if (
    session?.error === "SessionExpired" ||
    session?.error === "SessionInvalidated"
  ) {
    return { ok: false, response: sessionExpiredResponse(session.error) };
  }

  if (!hasValidSession(session)) {
    return { ok: false, response: unauthorizedResponse() };
  }

  let user = await getUserById(session.user.id);
  if (!user && session.user.email) {
    user = await getUserByEmail(session.user.email);
  }

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "User not found" }, { status: 404 }),
    };
  }

  return { ok: true, session, user };
}

export async function requireReviewer(): Promise<AuthResult> {
  const result = await requireSession();
  if (!result.ok) {
    return result;
  }
  if (!canReviewCorrections(result.user)) {
    return { ok: false, response: forbiddenResponse() };
  }
  return result;
}

export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireSession();
  if (!result.ok) {
    return result;
  }
  if (!canManageUsers(result.user)) {
    return { ok: false, response: forbiddenResponse() };
  }
  return result;
}
