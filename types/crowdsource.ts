// User roles and permissions
export type UserRole = "user" | "reviewer" | "admin";

export type OAuthProvider = "github" | "discord" | "google";

export type UserStatus =
  | "active"
  | "suspended"
  | "restricted"
  | "blocked"
  | "deleted";

// User profile
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  provider: OAuthProvider;
  providerId: string;
  createdAt: Date;
  lastLoginAt: Date;
  submissionsCount: number;
  approvedCount: number;
  rejectedCount: number;
  sessionVersion?: number;
}

// Correction submission
export type CorrectionStatus = "pending" | "approved" | "rejected" | "modified" | "superseded";

export const CORRECTION_FIELDS = [
  "title",
  "description",
  "releaseDate",
  "developer",
  "publisher",
  "genres",
  "platforms",
  "activationType",
  "status",
  "imageUrl",
  "instructions",
  "knownIssues",
  "communityTips",
  "activationNotes",
  "discordLink",
  "redditLink",
  "wikiLink",
  "steamDBLink",
  "purchaseLink",
  "gogDreamlistLink",
  "downloadLink",
  "virusTotalUrl",
  "additionalDRM",
  "playabilityStatus",
  "isUnplayable",
  "communityAlternativeName",
  "communityAlternativeUrl",
  "communityAlternativeDownloadLink",
  "remasteredName",
  "remasteredPlatform",
] as const;

export type CorrectionField = (typeof CORRECTION_FIELDS)[number];

/** Fields users may propose on a game submission (corrections plus fileName). */
export const GAME_UPDATE_FIELDS = [...CORRECTION_FIELDS, "fileName"] as const;
export type GameUpdateField = (typeof GAME_UPDATE_FIELDS)[number];

export type GameDownloadLinkField =
  | "downloadLink"
  | "communityAlternativeDownloadLink";

export const GAME_DOWNLOAD_LINK_FIELDS: readonly GameDownloadLinkField[] = [
  "downloadLink",
  "communityAlternativeDownloadLink",
];

/** Persisted VirusTotal URL-scan summary shared across reviewers. */
export interface CorrectionVirusTotalScan {
  reportUrl: string;
  malicious: number;
  suspicious: number;
  harmless: number;
  total: number;
  scannedAt: Date | string;
  source?: "submit" | "review";
}

export interface Correction {
  id: string;
  gameId: string;
  gameSlug: string;
  gameTitle: string;
  submittedBy: string; // User ID
  submittedByName: string;
  submittedAt: Date;
  field: CorrectionField;
  oldValue: any;
  newValue: any;
  reason: string; // Why they're making this change
  status: CorrectionStatus;
  reviewedBy?: string; // User ID
  reviewedByName?: string;
  reviewedAt?: Date;
  reviewNotes?: string; // Reviewer's notes
  finalValue?: string | number | boolean | string[] | null;
  /** Set server-side when submitting a downloadLink correction (VirusTotal URL scan GUI link). */
  autoVirusTotalUrl?: string;
  /** Last successful VT scan for this correction's download URL (submit or reviewer). */
  virusTotalScan?: CorrectionVirusTotalScan;
}

// Audit log for tracking changes
export type AuditLogAction = "create" | "update" | "delete";

/** Field that was changed, or submission type for game/FAQ submission reviews */
export type AuditLogField =
  | CorrectionField
  | "gameSubmission"
  | "faqSubmission";

export interface AuditLog {
  id: string;
  gameId: string;
  gameSlug: string;
  gameTitle: string;
  field: AuditLogField;
  oldValue: any;
  newValue: any;
  changedBy: string; // User ID (reviewer/admin who made the decision)
  changedByName: string;
  changedByRole: UserRole;
  changedAt: Date;
  correctionId?: string; // Link to original correction/submission if applicable
  notes?: string;
  /** When present, "rejected" means the change was not applied (e.g. rejected correction). Omitted means applied. */
  outcome?: "applied" | "rejected";
  // Submitter information (original person who suggested the change)
  submittedBy?: string; // User ID
  submittedByName?: string;
}

// Alias for compatibility
export type AuditLogEntry = AuditLog;

// Update history for games - tracks all submitters and reviewers
export interface GameUpdateHistory {
  updateId: string; // Unique ID for this update (timestamp-based or UUID)
  timestamp: Date;
  submitter: {
    id: string; // User ID
    name: string;
  };
  reviewer: {
    id: string; // User ID
    name: string;
  };
  field?: string; // For corrections (single field)
  fields?: string[]; // For game submissions (multiple fields)
  updateType: "correction" | "gameSubmission" | "featureToggle" | "adminEdit";
  notes?: string; // Review notes or admin notes
}

// Statistics for dashboard
export interface CrowdsourceStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  blockedUsers: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalChanges: number;
}

// Alias for admin dashboard
export type AdminDashboardStats = CrowdsourceStats;

// User statistics
export interface UserStats {
  userId: string;
  userName: string;
  totalSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  modifiedSubmissions: number;
  approvalRate: number; // Percentage
  lastSubmission?: Date;
  recentSubmissions: Correction[];
}

// Banned provider tracking (permanent bans)
export interface BannedProvider {
  id: string;
  provider: OAuthProvider;
  providerAccountId: string;
  userId?: string; // Original user ID if available
  userName?: string; // For reference
  reason: string;
  bannedBy: string; // Admin user ID
  bannedByName: string;
  bannedAt: Date;
  notes?: string;
}

// Leaderboard entry for community contributions
export interface LeaderboardEntry {
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole: UserRole;
  userStatus: UserStatus;
  totalSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  reviewedSubmissions: number; // approved + rejected (excludes pending)
  approvalRate: number; // Percentage
  rank: number;
  lastSubmission?: Date;
}

// Game submission (for adding complete game information)
export type GameSubmissionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "superseded";

export interface GameSubmission {
  id: string;
  gameSlug: string; // The game this submission is for
  gameTitle: string; // Original title (in case submitter corrects it)
  submittedBy: string; // User ID
  submittedByName: string;
  submittedAt: Date;
  status: GameSubmissionStatus;
  reviewedBy?: string; // User ID
  reviewedByName?: string;
  reviewedAt?: Date;
  reviewNotes?: string;

  // Submitted game data (all fields optional, user fills what they can)
  proposedData: {
    title?: string;
    description?: string;
    releaseDate?: string;
    developer?: string;
    publisher?: string;
    genres?: string[];
    platforms?: string[];
    activationType?: "Legacy (5x5)" | "Legacy (Per-Title)" | "SSA";
    status?: "supported" | "testing" | "unsupported";
    imageUrl?: string;
    discordLink?: string;
    redditLink?: string;
    wikiLink?: string;
    steamDBLink?: string;
    downloadLink?: string;
    fileName?: string;
    purchaseLink?: string;
    gogDreamlistLink?: string;
    instructions?: string[];
    virusTotalUrl?: string;
    knownIssues?: string[];
    communityTips?: string[];
    activationNotes?: string;
    additionalDRM?: string;
    playabilityStatus?:
      | "playable"
      | "unplayable"
      | "community_alternative"
      | "remastered_available";
    isUnplayable?: boolean;
    communityAlternativeName?: string;
    communityAlternativeUrl?: string;
    communityAlternativeDownloadLink?: string;
    communityAlternativeVirusTotalUrl?: string;
    remasteredName?: string;
    remasteredPlatform?: string;
  };

  /** Reviewer VirusTotal scans keyed by download-link field. */
  virusTotalScans?: Partial<
    Record<GameDownloadLinkField, CorrectionVirusTotalScan>
  >;

  // Notes from submitter
  submitterNotes?: string;

  // Original game data at time of submission (for comparison - only included in API responses)
  originalGameData?: any;

  // Current game data (for reference - only included in API responses)
  currentGameData?: any;

  // Published information (only included if game is published)
  publishedByName?: string;
  publishedAt?: Date;
}

// Reviewer Application System
export type ReviewerApplicationStatus = "pending" | "approved" | "rejected";

export interface ReviewerApplication {
  id: string;
  userId: string;
  userName?: string; // Denormalized for easier queries
  userEmail?: string; // Denormalized for easier queries
  // Required fields
  motivationText: string;
  experienceText: string; // Experience with the platform
  contributionExamples: string; // Examples of contributions
  timeAvailability?: string; // Optional: time per week
  agreedToRules: boolean; // Agreement checkbox
  // Optional fields
  languages?: string; // Languages user can read/write
  priorExperience?: string; // Prior moderation/reviewer experience
  createdAt: Date;
  status: ReviewerApplicationStatus;
  adminId?: string; // Which admin handled it
  adminName?: string; // Denormalized admin name
  decisionAt?: Date;
  adminNotes?: string; // Optional internal notes
}

export type ReviewerAction = "approve" | "reject";

export interface ReviewerActionLog {
  id: string;
  reviewerId: string;
  reviewerName?: string; // Denormalized for easier queries
  correctionId: string;
  action: ReviewerAction;
  createdAt: Date;
}
