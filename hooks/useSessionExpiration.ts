"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/toast-context";
import { signOutDueToSessionEnd } from "@/lib/session-signout";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 1 * 60 * 1000; // 1 minute before expiration
const CHECK_INTERVAL = 10 * 1000;

/**
 * Track session expiration and show a warning before signing out.
 */
export function useSessionExpiration() {
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const lastActivityRef = useRef(Date.now());
  const warningShownRef = useRef(false);
  const hasLoggedOutRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const showToastRef = useRef(showToast);

  showToastRef.current = showToast;

  useEffect(() => {
    if (status !== "authenticated" || !session) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      warningShownRef.current = false;
      if (status === "unauthenticated") {
        hasLoggedOutRef.current = false;
      }
      return;
    }

    const markActivity = () => {
      lastActivityRef.current = Date.now();
      warningShownRef.current = false;
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((event) => {
      window.addEventListener(event, markActivity, { passive: true });
    });

    const checkExpiration = () => {
      const timeSinceActivity = Date.now() - lastActivityRef.current;
      const timeUntilExpiration = INACTIVITY_TIMEOUT - timeSinceActivity;

      if (
        timeUntilExpiration <= WARNING_TIME &&
        timeUntilExpiration > 0 &&
        !warningShownRef.current
      ) {
        warningShownRef.current = true;
        showToastRef.current(
          "Your session will expire in 1 minute due to inactivity. Move your mouse or click anywhere to stay logged in.",
          60000,
          "error"
        );
      }

      if (timeSinceActivity >= INACTIVITY_TIMEOUT && !hasLoggedOutRef.current) {
        hasLoggedOutRef.current = true;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        showToastRef.current(
          "Your session has expired due to inactivity. Please sign in again.",
          5000,
          "error"
        );
        void signOutDueToSessionEnd("session_expired");
      }
    };

    checkExpiration();
    intervalRef.current = setInterval(checkExpiration, CHECK_INTERVAL);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, markActivity);
      });
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [status, session]);
}
