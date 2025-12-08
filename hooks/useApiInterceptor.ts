"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { useToast } from "@/components/ui/toast-context";

// Global flag to prevent multiple simultaneous signOut calls
let isSigningOut = false;

/**
 * Hook that intercepts API responses to detect 401 (Unauthorized) errors
 * and automatically signs out the user when their session expires
 */
export function useApiInterceptor() {
  const { showToast } = useToast();
  const hasLoggedOutRef = useRef(false);

  useEffect(() => {
    // Store original fetch
    const originalFetch = window.fetch;

    // Override fetch to intercept responses
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      // Don't intercept NextAuth internal API calls
      let url = '';
      if (typeof args[0] === 'string') {
        url = args[0];
      } else if (args[0] instanceof URL) {
        url = args[0].toString();
      } else if (args[0] && typeof args[0] === 'object' && 'url' in args[0]) {
        url = (args[0] as { url: string }).url;
      }
      if (url.includes('/api/auth/')) {
        return response;
      }

      // Check if response is 401 Unauthorized
      if (response.status === 401 && !hasLoggedOutRef.current) {
        hasLoggedOutRef.current = true;
        // Clone the response to read it without consuming it
        const clonedResponse = response.clone();
        
        // Try to parse error message
        clonedResponse.json().then((data) => {
          // Only auto-logout if it's a session expiration issue
          // Some 401s might be for other reasons (wrong credentials, etc.)
          const errorMessage = data?.error?.toLowerCase() || "";
          if (
            errorMessage.includes("unauthorized") ||
            errorMessage.includes("session") ||
            errorMessage.includes("expired") ||
            errorMessage.includes("invalid")
          ) {
            if (!isSigningOut) {
              isSigningOut = true;
              showToast(
                "Your session has expired. Please sign in again.",
                5000,
                "error"
              );
              // Sign out after a brief delay
              setTimeout(() => {
                signOut({ callbackUrl: "/auth/signin?reason=session_expired" }).finally(() => {
                  isSigningOut = false;
                });
              }, 500);
            }
          } else {
            // Reset flag if it's not a session issue
            hasLoggedOutRef.current = false;
          }
        }).catch(() => {
          // If we can't parse the response, still sign out for 401
          // as it's likely a session issue (but only for non-NextAuth routes)
          if (!url.includes('/api/auth/') && !isSigningOut) {
            isSigningOut = true;
            showToast(
              "Your session has expired. Please sign in again.",
              5000,
              "error"
            );
            setTimeout(() => {
              signOut({ callbackUrl: "/auth/signin?reason=session_expired" }).finally(() => {
                isSigningOut = false;
              });
            }, 500);
          } else {
            hasLoggedOutRef.current = false;
          }
        });
      }

      return response;
    };

    // Cleanup: restore original fetch
    return () => {
      window.fetch = originalFetch;
      hasLoggedOutRef.current = false;
    };
  }, [showToast, signOut]);
}

