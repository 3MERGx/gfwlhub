"use client";

import { FaCheckCircle, FaTimesCircle, FaSpinner } from "react-icons/fa";
import { useEffect, useState } from "react";
import { isTrustedUrl } from "@/lib/url-whitelist";
import { useCSRF } from "@/hooks/useCSRF";

interface InlineUrlSafetyIndicatorProps {
  url: string;
}

/**
 * Compact inline version of URL safety indicator for use within text
 * Shows only an icon with a tooltip
 */
export default function InlineUrlSafetyIndicator({
  url,
}: InlineUrlSafetyIndicatorProps) {
  const { csrfToken, loading: csrfLoading } = useCSRF();
  const [isChecking, setIsChecking] = useState(false);
  const [isSafe, setIsSafe] = useState<boolean | null>(null);
  const [threatType, setThreatType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when URL changes
    setIsSafe(null);
    setThreatType(null);
    setError(null);

    // Only check if URL is valid
    if (!url || url.trim() === "") {
      return;
    }

    // Check if it's a valid URL
    try {
      new URL(url);
    } catch {
      // Not a valid URL, don't check
      return;
    }

    // Check if URL is from a trusted domain (whitelist)
    if (isTrustedUrl(url)) {
      setIsSafe(true);
      return;
    }

    if (csrfLoading || !csrfToken) {
      return;
    }

    // Debounce the check for non-trusted URLs
    const timeoutId = setTimeout(async () => {
      setIsChecking(true);
      try {
        const response = await fetch("/api/safe-browsing/check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(
            typeof data.error === "string"
              ? data.error
              : "Failed to check URL. Please try again later."
          );
          setIsSafe(null);
        } else {
          const data = await response.json();
          setIsSafe(data.isSafe);
          setThreatType(data.threatType || null);
        }
      } catch {
        setError("Failed to check URL. Please try again later.");
        setIsSafe(null);
      } finally {
        setIsChecking(false);
      }
    }, 1000); // Wait 1 second after URL is detected

    return () => clearTimeout(timeoutId);
  }, [url, csrfToken, csrfLoading]);

  if (!url || url.trim() === "") {
    return null;
  }

  // Check if it's a valid URL
  try {
    new URL(url);
  } catch {
    return null;
  }

  if (isChecking) {
    return (
      <span className="inline-flex items-center" title="Checking URL safety...">
        <FaSpinner className="animate-spin text-blue-400" size={12} />
      </span>
    );
  }

  if (error) {
    return (
      <span className="inline-flex items-center" title={`Unable to verify: ${error}`}>
        <span className="text-[rgb(var(--text-muted))] text-xs">⚠</span>
      </span>
    );
  }

  if (isSafe === null) {
    return null;
  }

  if (isSafe) {
    return (
      <span className="inline-flex items-center" title="Safe URL verified by Google Safe Browsing">
        <FaCheckCircle className="text-green-500" size={12} />
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center"
      title={`Unsafe URL detected${threatType ? `: ${threatType}` : ""}`}
    >
      <FaTimesCircle className="text-red-500" size={12} />
    </span>
  );
}

