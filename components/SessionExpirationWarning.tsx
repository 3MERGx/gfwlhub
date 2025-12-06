"use client";

import { useSessionExpiration } from "@/hooks/useSessionExpiration";

/**
 * Component that tracks session expiration and shows warnings
 * Should be placed in the root layout to work across all pages
 */
export default function SessionExpirationWarning() {
  useSessionExpiration();
  return null; // This component doesn't render anything, it just runs the hook
}

