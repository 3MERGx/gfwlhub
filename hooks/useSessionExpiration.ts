"use client";

import { useEffect, useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useToast } from "@/components/ui/toast-context";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const WARNING_TIME = 1 * 60 * 1000; // 1 minute before expiration (in milliseconds)
const CHECK_INTERVAL = 10 * 1000; // Check every 10 seconds

/**
 * Hook to track session expiration and show warnings
 * Shows a warning 1 minute before session expires due to inactivity
 * Automatically signs out user when session expires
 */
export function useSessionExpiration() {
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [warningShown, setWarningShown] = useState(false);
  const [hasLoggedOut, setHasLoggedOut] = useState(false);
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

  // Note: We don't need to monitor session status changes here because:
  // 1. When session expires on backend, the session callback returns null
  // 2. NextAuth automatically updates the session status to "unauthenticated"
  // 3. The API interceptor will catch 401 errors from API calls and sign out
  // 4. Client-side inactivity timeout is handled by the expiration check below

  // Check for expiration and show warnings
  useEffect(() => {
    // Always clear intervals on unmount or when status changes
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
      // Reset logout flag when session is cleared
      if (status === "unauthenticated") {
        setHasLoggedOut(false);
      }
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

      // Session expired - automatically sign out
      if (timeSinceActivity >= INACTIVITY_TIMEOUT && !hasLoggedOut) {
        setHasLoggedOut(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        // Show message and sign out
        showToast(
          "Your session has expired due to inactivity. Please sign in again.",
          5000,
          "error"
        );
        // Sign out after a brief delay to show the toast
        const signOutTimeout = setTimeout(() => {
          signOut({ callbackUrl: "/auth/signin?reason=session_expired" }).catch(() => {
            // Ignore errors from signOut (e.g., if already signing out)
          });
        }, 500);
        
        // Store timeout ref for cleanup
        warningTimeoutRef.current = signOutTimeout as unknown as NodeJS.Timeout;
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
  }, [status, session, lastActivity, warningShown, showToast, hasLoggedOut, signOut]);

  // Reset warning when activity detected
  useEffect(() => {
    if (lastActivity > 0 && warningShown) {
      // User became active again, reset warning
      setWarningShown(false);
    }
  }, [lastActivity, warningShown]);
}

