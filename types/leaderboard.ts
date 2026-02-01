/**
 * Leaderboard-specific types (contributors ranked by approval rate and submissions).
 */

export interface LeaderboardUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: "user" | "reviewer" | "admin";
  status: "active" | "suspended";
  submissionsCount: number;
  approvedCount: number;
  rejectedCount: number;
  reviewedCount: number;
  approvalRate: number;
  createdAt: Date;
  lastLoginAt: Date;
  rank: number;
}

export type SortField =
  | "rank"
  | "name"
  | "submissions"
  | "approved"
  | "approvalRate";

export type SortOrder = "asc" | "desc";
