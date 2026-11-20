import { redirect, forbidden } from "next/navigation";
import { getValidSession } from "@/lib/api-auth";
import type { Session } from "next-auth";

async function requireSignedInPage(callbackPath: string): Promise<Session> {
  const session = await getValidSession();
  if (!session) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }
  return session;
}

/**
 * Server-side gate for reviewer/admin pages.
 */
export async function requireStaffPage(
  callbackPath: string
): Promise<Session> {
  const session = await requireSignedInPage(callbackPath);
  const role = session.user.role;
  if (role !== "reviewer" && role !== "admin") {
    forbidden();
  }
  return session;
}

/**
 * Server-side gate for admin-only pages.
 */
export async function requireAdminPage(
  callbackPath: string
): Promise<Session> {
  const session = await requireStaffPage(callbackPath);
  if (session.user.role !== "admin") {
    forbidden();
  }
  return session;
}
