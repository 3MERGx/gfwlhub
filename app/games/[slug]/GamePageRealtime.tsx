"use client";

import { useRouter } from "next/navigation";
import { usePusherChannel } from "@/hooks/usePusherChannel";
import { PUSHER_EVENTS } from "@/lib/pusher-client";

/**
 * Subscribes to game-updated events and refreshes the page when this game's data changes.
 * Renders nothing. Place once in the game slug page layout or content.
 */
export default function GamePageRealtime({ slug }: { slug: string }) {
  const router = useRouter();

  usePusherChannel(PUSHER_EVENTS.GAME_UPDATED, (data) => {
    const payloadSlug = data?.slug;
    if (payloadSlug === undefined || payloadSlug === slug) {
      router.refresh();
    }
  });

  return null;
}
