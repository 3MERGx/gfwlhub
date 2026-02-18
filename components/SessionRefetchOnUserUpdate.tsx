"use client";

import { useSession } from "next-auth/react";
import { usePusherChannel } from "@/hooks/usePusherChannel";
import { PUSHER_EVENTS } from "@/lib/pusher-client";

/**
 * When a user's role or permissions are updated (e.g. by an admin), the server
 * triggers USERS_UPDATED with { userId }. If that userId is the current user,
 * we refetch the session so role/access updates are reflected without re-login.
 * Must be rendered inside SessionProvider.
 */
export function SessionRefetchOnUserUpdate() {
  const { data: session, update } = useSession();

  usePusherChannel(PUSHER_EVENTS.USERS_UPDATED, (data) => {
    const updatedUserId = data?.userId;
    if (
      typeof updatedUserId === "string" &&
      session?.user?.id &&
      updatedUserId === session.user.id
    ) {
      update();
    }
  });

  return null;
}
