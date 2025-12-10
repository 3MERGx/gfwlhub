// User roles and permissions
export type UserRole = "user" | "reviewer" | "admin";

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
  provider: "github" | "discord" | "google";
  providerId: string;
  createdAt: Date;
  lastLoginAt: Date;
  submissionsCount: number;
  approvedCount: number;
  rejectedCount: number;
}

// Correction submission
export type CorrectionStatus = "pending" | "approved" | "rejected" | "modified" | "superseded";

export type CorrectionField =
  | "title"
  | "description"
  | "releaseDate"
  | "developer"
  | "publisher"
  | "genres"
  | "platforms"
  | "activationType"
  | "status"
  | "imageUrl"
  | "instructions"
  | "knownIssues"
  | "communityTips"
  | "discordLink"
  | "redditLink"
  | "wikiLink"
  | "steamDBLink"
  | "purchaseLink"
  | "gogDreamlistLink"
  | "downloadLink"
  | "additionalDRM"
  | "playabilityStatus"
  | "isUnplayable"
  | "communityAlternativeName"
  | "communityAlternativeUrl"
  | "communityAlternativeDownloadLink"
  | "remasteredName"
  | "remasteredPlatform";

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
  finalValue?: any; // If modified by reviewer
}

// Audit log for tracking changes
export type AuditLogAction = "create" | "update" | "delete";

export interface AuditLog {
  id: string;
  gameId: string;
  gameSlug: string;
  gameTitle: string;
  field: CorrectionField;
  oldValue: any;
  newValue: any;
  changedBy: string; // User ID (reviewer/admin who approved the change)
  changedByName: string;
  changedByRole: UserRole;
  changedAt: Date;
  correctionId?: string; // Link to original correction if from crowdsource
  notes?: string;
  // Submitter information (original person who suggested the correction)
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
  provider: "github" | "discord" | "google";
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
    remasteredName?: string;
    remasteredPlatform?: string;
  };

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
