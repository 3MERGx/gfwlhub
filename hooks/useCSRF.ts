"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

/**
 * Custom hook to fetch and manage CSRF token
 * Only fetches token when user is authenticated
 */
export function useCSRF() {
  const { data: session, status } = useSession();
  const [csrfToken, setCsrfToken] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch CSRF token if user is authenticated
    if (status === "unauthenticated") {
      setLoading(false);
      return;
    }

    if (status !== "authenticated" || !session) {
      return;
    }

    async function fetchToken() {
      try {
        const response = await fetch("/api/csrf-token");
        if (response.ok) {
          const data = await response.json();
          setCsrfToken(data.csrfToken);
        }
      } catch (error) {
        console.error("Failed to fetch CSRF token:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchToken();
  }, [session, status]);

  return { csrfToken, loading };
}

