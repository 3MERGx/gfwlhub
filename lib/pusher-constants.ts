/**
 * Pusher channel and event names for real-time updates.
 * Use a single channel to avoid per-page channel limits.
 */
export const PUSHER_CHANNEL = "gfwlhub";

export const PUSHER_EVENTS = {
  /** Corrections (submissions) created or reviewed */
  SUBMISSIONS_UPDATED: "submissions-updated",
  /** Game submissions created or reviewed */
  GAME_SUBMISSIONS_UPDATED: "game-submissions-updated",
  /** FAQ submissions created, approved, or rejected */
  FAQ_SUBMISSIONS_UPDATED: "faq-submissions-updated",
  /** Reviewer applications submitted, approved, or rejected */
  REVIEWER_APPLICATIONS_UPDATED: "reviewer-applications-updated",
  /** Game data changed (publish, toggle, correction applied). Payload: { slug?: string } */
  GAME_UPDATED: "game-updated",
  /** FAQ list changed (approve, reorder, create, update, delete) */
  FAQ_UPDATED: "faq-updated",
  /** Dashboard users list changed (ban, restore, update) */
  USERS_UPDATED: "users-updated",
  /** Dashboard games list changed (add, toggle, publish) */
  GAMES_UPDATED: "games-updated",
} as const;

export type PusherEventName =
  (typeof PUSHER_EVENTS)[keyof typeof PUSHER_EVENTS];
