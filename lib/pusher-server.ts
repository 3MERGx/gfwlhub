import Pusher from "pusher";
import {
  PUSHER_CHANNEL,
  PUSHER_EVENTS,
  type PusherEventName,
} from "./pusher-constants";

const appId = process.env.PUSHER_APP_ID;
const key = process.env.PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.PUSHER_CLUSTER;

const isConfigured =
  typeof appId === "string" &&
  appId.length > 0 &&
  typeof key === "string" &&
  key.length > 0 &&
  typeof secret === "string" &&
  secret.length > 0 &&
  typeof cluster === "string" &&
  cluster.length > 0;

let pusherServer: Pusher | null = null;

function getPusherServer(): Pusher | null {
  if (!isConfigured) return null;
  if (!pusherServer) {
    pusherServer = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  }
  return pusherServer;
}

/**
 * Trigger a real-time event from the server. No-op if Pusher env vars are not set.
 */
export function triggerPusherEvent(
  event: PusherEventName,
  data?: Record<string, unknown>
): void {
  const pusher = getPusherServer();
  if (!pusher) return;
  pusher
    .trigger(PUSHER_CHANNEL, event, data ?? {})
    .catch((err) => {
      // Only log in dev or if you have a logger that respects NODE_ENV
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.warn("[Pusher] trigger failed:", err);
      }
    });
}

export { PUSHER_CHANNEL, PUSHER_EVENTS };
