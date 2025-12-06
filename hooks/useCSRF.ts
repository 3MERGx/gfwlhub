"use client";

import { useState, useEffect } from "react";

/**
 * Custom hook to fetch and manage CSRF token
 */
export function useCSRF() {
  const [csrfToken, setCsrfToken] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  return { csrfToken, loading };
}

