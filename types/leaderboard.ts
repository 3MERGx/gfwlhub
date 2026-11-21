/**
 * Leaderboard-specific types (contributors ranked by approval rate and submissions).
 */

export interface LeaderboardUser {
  id: string;
  name: string;
  avatar: string | null;
  role: "user" | "reviewer" | "admin";
  submissionsCount: number;
  approvedCount: number;
  rejectedCount: number;
  reviewedCount: number;
  approvalRate: number;
  rank: number;
}

export type SortField =
  | "rank"
  | "name"
  | "submissions"
  | "approved"
  | "approvalRate";

export type SortOrder = "asc" | "desc";
