"use client";

import { FaCheckCircle, FaTimesCircle, FaSpinner } from "react-icons/fa";
import { useEffect, useState } from "react";
import { isTrustedUrl } from "@/lib/url-whitelist";
import { safeLog } from "@/lib/security";
import { useCSRF } from "@/hooks/useCSRF";

interface UrlSafetyIndicatorProps {
  url: string;
  className?: string;
}

export default function UrlSafetyIndicator({
  url,
  className = "",
}: UrlSafetyIndicatorProps) {
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
          safeLog.error("Safe Browsing API error:", data);
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
      } catch (err) {
        safeLog.error("Safe Browsing check error:", err);
        setError("Failed to check URL. Please try again later.");
        setIsSafe(null);
      } finally {
        setIsChecking(false);
      }
    }, 1000); // Wait 1 second after user stops typing

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
      <div className={`flex items-center gap-2 text-xs ${className}`}>
        <FaSpinner className="animate-spin text-blue-400" size={14} />
        <span className="text-[rgb(var(--text-secondary))]">Checking safety...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex flex-col gap-1 text-xs ${className}`}>
        <span className="text-[rgb(var(--text-muted))]">Unable to verify</span>
        <span className="text-[rgb(var(--text-muted))] text-[10px] opacity-75">
          {error}
        </span>
      </div>
    );
  }

  if (isSafe === null) {
    return null;
  }

  if (isSafe) {
    return (
      <div className={`flex items-center gap-2 text-xs ${className}`}>
        <FaCheckCircle className="text-green-500" size={14} />
        <span className="text-green-500">Safe URL</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      <FaTimesCircle className="text-red-500" size={14} />
      <span className="text-red-500">
        Unsafe URL
        {threatType && ` (${threatType})`}
      </span>
    </div>
  );
}

