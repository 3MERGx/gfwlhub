"use client";

import { useEffect, useRef } from "react";
import {
  getPusherClient,
  PUSHER_CHANNEL,
  type PusherEventName,
} from "@/lib/pusher-client";

/**
 * Subscribe to a Pusher event on the app channel and run a callback when it fires.
 * Unbinds on unmount. No-op if Pusher is not configured.
 */
export function usePusherChannel(
  eventName: PusherEventName,
  onEvent: (data?: Record<string, unknown>) => void
): void {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(PUSHER_CHANNEL);

    const handler = (data?: Record<string, unknown>) => {
      callbackRef.current(data);
    };

    channel.bind(eventName, handler);

    return () => {
      channel.unbind(eventName, handler);
    };
  }, [eventName]);
}
