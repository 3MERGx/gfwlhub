"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { useToast } from "@/components/ui/toast-context";

// Global flag to prevent multiple simultaneous signOut calls
let isSigningOut = false;

function isSessionDeadError(data: unknown): boolean {
  if (!data || typeof data !== "object") {
    return false;
  }
  const body = data as { error?: unknown; code?: unknown };
  const code = typeof body.code === "string" ? body.code : "";
  const errorMessage =
    typeof body.error === "string" ? body.error.toLowerCase() : "";

  return (
    code === "SessionExpired" ||
    code === "SessionInvalidated" ||
    errorMessage === "session expired" ||
    errorMessage.includes("session invalidated")
  );
}

/**
 * Hook that intercepts API responses to detect true session expiry
 * and signs the user out. Generic 401 Unauthorized (e.g. missing email
 * on a still-valid JWT) must not force logout.
 */
export function useApiInterceptor() {
  const { showToast } = useToast();
  const hasLoggedOutRef = useRef(false);

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      let url = "";
      if (typeof args[0] === "string") {
        url = args[0];
      } else if (args[0] instanceof URL) {
        url = args[0].toString();
      } else if (args[0] && typeof args[0] === "object" && "url" in args[0]) {
        url = (args[0] as { url: string }).url;
      }
      if (url.includes("/api/auth/")) {
        return response;
      }

      if (response.status === 401 && !hasLoggedOutRef.current) {
        const clonedResponse = response.clone();
        clonedResponse
          .json()
          .then((data) => {
            if (!isSessionDeadError(data)) {
              return;
            }
            if (isSigningOut) {
              return;
            }
            hasLoggedOutRef.current = true;
            isSigningOut = true;
            showToast(
              "Your session has expired. Please sign in again.",
              5000,
              "error"
            );
            setTimeout(() => {
              signOut({
                callbackUrl: "/auth/signin?reason=session_expired",
              }).finally(() => {
                isSigningOut = false;
              });
            }, 500);
          })
          .catch(() => {
            // Unparseable 401 is not treated as session death.
          });
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
      hasLoggedOutRef.current = false;
    };
  }, [showToast]);
}
