"use client";

import { useSessionExpiration } from "@/hooks/useSessionExpiration";
import { useApiInterceptor } from "@/hooks/useApiInterceptor";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast-context";

/**
 * Component that tracks session expiration and shows warnings
 * Also intercepts API responses to detect 401 errors and auto-logout
 * Handles session errors (e.g., SessionInvalidated) from NextAuth
 * Should be placed in the root layout to work across all pages
 */
export default function SessionExpirationWarning() {
  useSessionExpiration();
  useApiInterceptor();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const hasHandledErrorRef = useRef(false);

  // Handle session errors (e.g., when role changes)
  useEffect(() => {
    if (session?.error && !hasHandledErrorRef.current) {
      hasHandledErrorRef.current = true;
      
      let message = "Your session has been invalidated. Please sign in again.";
      if (session.error === "SessionInvalidated") {
        message = "Your account permissions have changed. Please sign in again to access your updated permissions.";
      } else if (session.error === "SessionExpired") {
        message = "Your session has expired. Please sign in again.";
      }

      showToast(message, 5000, "error");
      
      // Sign out after a brief delay
      setTimeout(() => {
        signOut({ callbackUrl: "/auth/signin?reason=session_invalidated" }).finally(() => {
          hasHandledErrorRef.current = false;
        });
      }, 1000);
    } else if (!session?.error) {
      // Reset flag when error is cleared
      hasHandledErrorRef.current = false;
    }
  }, [session?.error, showToast]);

  return null; // This component doesn't render anything, it just runs the hooks
}

