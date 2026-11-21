"use client";

type SignOutListener = (signingOut: boolean) => void;

const listeners = new Set<SignOutListener>();
let signingOut = false;

export function isSessionSigningOut(): boolean {
  return signingOut;
}

export function subscribeSessionSigningOut(listener: SignOutListener): () => void {
  listeners.add(listener);
  listener(signingOut);
  return () => {
    listeners.delete(listener);
  };
}

export function beginSessionSignOut(): boolean {
  if (signingOut) return false;
  signingOut = true;
  listeners.forEach((listener) => listener(true));
  return true;
}

/**
 * Hide signed-in UI immediately, then clear the NextAuth session.
 * Protected routes navigate to sign-in; public pages stay so the toast and
 * Sign In button can appear together instead of a stale avatar.
 */
export async function signOutDueToSessionEnd(reason: string): Promise<void> {
  beginSessionSignOut();
  try {
    const { signOut } = await import("next-auth/react");
    await signOut({ redirect: false });
  } catch {
    // Header is already in the signed-out state even if NextAuth throws.
  }
  if (typeof window === "undefined") return;

  const path = window.location.pathname;
  const onProtectedPage =
    path.startsWith("/dashboard") ||
    path.startsWith("/settings") ||
    path.startsWith("/become-reviewer");

  if (onProtectedPage) {
    window.location.replace(`/auth/signin?reason=${encodeURIComponent(reason)}`);
  }
}
