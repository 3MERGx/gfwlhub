"use client";

import Pusher from "pusher-js";
import {
  PUSHER_CHANNEL,
  PUSHER_EVENTS,
  type PusherEventName,
} from "./pusher-constants";

const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

const isConfigured =
  typeof key === "string" &&
  key.length > 0 &&
  typeof cluster === "string" &&
  cluster.length > 0;

let pusherClient: Pusher | null = null;

/**
 * Get Pusher client for browser. Returns null if env vars are not set.
 * Safe to call in SSR; returns null until client-side.
 */
export function getPusherClient(): Pusher | null {
  if (typeof window === "undefined") return null;
  if (!isConfigured) return null;
  if (!pusherClient) {
    pusherClient = new Pusher(key!, {
      cluster: cluster!,
    });
  }
  return pusherClient;
}

export { PUSHER_CHANNEL, PUSHER_EVENTS };
export type { PusherEventName };
