"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/toast-context";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const WARNING_TIME = 1 * 60 * 1000; // 1 minute before expiration (in milliseconds)
const CHECK_INTERVAL = 10 * 1000; // Check every 10 seconds

/**
 * Hook to track session expiration and show warnings
 * Shows a warning 1 minute before session expires due to inactivity
 */
export function useSessionExpiration() {
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [warningShown, setWarningShown] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track user activity
  useEffect(() => {
    if (status !== "authenticated" || !session) {
      return;
    }

    const updateActivity = () => {
      setLastActivity(Date.now());
      setWarningShown(false);
    };

    // Track various user activities
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [status, session]);

  // Check for expiration and show warnings
  useEffect(() => {
    if (status !== "authenticated" || !session) {
      // Clear intervals if not authenticated
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
      setWarningShown(false);
      return;
    }

    const checkExpiration = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;
      const timeUntilExpiration = INACTIVITY_TIMEOUT - timeSinceActivity;

      // Show warning 1 minute before expiration
      if (timeUntilExpiration <= WARNING_TIME && timeUntilExpiration > 0 && !warningShown) {
        setWarningShown(true);
        showToast(
          "Your session will expire in 1 minute due to inactivity. Move your mouse or click anywhere to stay logged in.",
          60000, // Show for 60 seconds
          "error"
        );
      }

      // Session expired (handled by NextAuth, but we can log it)
      if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
        // NextAuth will handle the logout automatically
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    // Check immediately
    checkExpiration();

    // Set up interval to check periodically
    intervalRef.current = setInterval(checkExpiration, CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
    };
  }, [status, session, lastActivity, warningShown, showToast]);

  // Reset warning when activity detected
  useEffect(() => {
    if (lastActivity > 0 && warningShown) {
      // User became active again, reset warning
      setWarningShown(false);
    }
  }, [lastActivity, warningShown]);
}

