/**
 * Crowdsource Service - MongoDB Implementation
 *
 * Complete MongoDB implementation for crowdsourcing functionality
 */

import {
  User,
  Correction,
  AuditLog,
  CrowdsourceStats,
  UserStats,
  UserRole,
  UserStatus,
  CorrectionStatus,
  ReviewerApplication,
  ReviewerApplicationStatus,
  ReviewerActionLog,
  ReviewerAction,
} from "@/types/crowdsource";
import { REVIEWER_APPLICATION_CONFIG } from "./reviewer-application-config";
import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";

// Helper to convert MongoDB document to User
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toUser(doc: any): User {
  return {
    ...doc,
    id: doc._id.toString(),
    createdAt: doc.createdAt || new Date(),
    lastLoginAt: doc.lastLoginAt || new Date(),
  } as User;
}

// Helper to convert MongoDB document to Correction
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCorrection(doc: any): Correction {
  return {
    ...doc,
    id: doc._id.toString(),
    submittedAt: doc.submittedAt || new Date(),
  } as Correction;
}

// Helper to convert MongoDB document to AuditLog
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAuditLog(doc: any): AuditLog {
  return {
    ...doc,
    id: doc._id.toString(),
    changedAt: doc.changedAt || new Date(),
    submittedBy: doc.submittedBy,
    submittedByName: doc.submittedByName,
  } as AuditLog;
}

// User Management
export async function getUserById(userId: string): Promise<User | null> {
  const client = await clientPromise;
  const db = client.db("GFWL");
  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(userId) });
  return user ? toUser(user) : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const client = await clientPromise;
  const db = client.db("GFWL");
  const user = await db.collection("users").findOne({ email });
  return user ? toUser(user) : null;
}

export async function createUser(
  userData: Omit<
    User,
    | "id"
    | "createdAt"
    | "lastLoginAt"
    | "submissionsCount"
    | "approvedCount"
    | "rejectedCount"
  >
): Promise<User> {
  const client = await clientPromise;
  const db = client.db("GFWL");

  const newUser = {
    ...userData,
    createdAt: new Date(),
    lastLoginAt: new Date(),
    submissionsCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
  };

  const result = await db.collection("users").insertOne(newUser);
  return toUser({ ...newUser, _id: result.insertedId });
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  const client = await clientPromise;
  const db = client.db("GFWL");
  await db
    .collection("users")
    .updateOne(
      { _id: new ObjectId(userId) },
      { $set: { lastLoginAt: new Date() } }
    );
}

export async function updateUserRole(
  userId: string,
  role: UserRole
): Promise<void> {
  const client = await clientPromise;
  const db = client.db("GFWL");
  await db
    .collection("users")
    .updateOne({ _id: new ObjectId(userId) }, { $set: { role } });
}

export async function updateUserStatus(
  userId: string,
  status: UserStatus
): Promise<void> {
  const client = await clientPromise;
  const db = client.db("GFWL");
  await db
    .collection("users")
    .updateOne({ _id: new ObjectId(userId) }, { $set: { status } });
}

export async function getAllUsers(): Promise<User[]> {
  const client = await clientPromise;
  const db = client.db("GFWL");
  const users = await db.collection("users").find({}).toArray();
  return users.map(toUser);
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  const client = await clientPromise;
  const db = client.db("GFWL");
  const users = await db.collection("users").find({ role }).toArray();
  return users.map(toUser);
}

// Correction Management
export async function createCorrection(
  correctionData: Omit<Correction, "id" | "submittedAt" | "status">
): Promise<Correction> {
  const client = await clientPromise;
  const db = client.db("GFWL");

  const newCorrection = {
    ...correctionData,
    submittedAt: new Date(),
    status: "pending" as CorrectionStatus,
  };

  const result = await db.collection("corrections").insertOne(newCorrection);

  // Update user submission count
  await db
    .collection("users")
    .updateOne(
      { _id: new ObjectId(correctionData.submittedBy) },
      { $inc: { submissionsCount: 1 } }
    );

  return toCorrection({ ...newCorrection, _id: result.insertedId });
}

export async function getCorrectionById(
  correctionId: string
): Promise<Correction | null> {
  const client = await clientPromise;
  const db = client.db("GFWL");
  const correction = await db
    .collection("corrections")
    .findOne({ _id: new ObjectId(correctionId) });
  return correction ? toCorrection(correction) : null;
}

export async function getCorrectionsByGame(
  gameSlug: string
): Promise<Correction[]> {
  const client = await clientPromise;
  const db = client.db("GFWL");
  const corrections = await db
    .collection("corrections")
    .find({ gameSlug })
    .sort({ submittedAt: -1 })
    .toArray();
  return corrections.map(toCorrection);
}

export async function getPendingCorrections(): Promise<Correction[]> {
  const client = await clientPromise;
  const db = client.db("GFWL");
  const corrections = await db
    .collection("corrections")
    .find({ status: "pending" })
    .sort({ submittedAt: 1 })
    .toArray();
  return corrections.map(toCorrection);
}

export async function getCorrectionsByUser(
  userId: string
): Promise<Correction[]> {
  const client = await clientPromise;
  const db = client.db("GFWL");
  const corrections = await db
    .collection("corrections")
    .find({ submittedBy: userId })
    .sort({ submittedAt: -1 })
    .toArray();
  return corrections.map(toCorrection);
}

export async function getAllCorrections(limit?: number): Promise<Correction[]> {
  const client = await clientPromise;
  const db = client.db("GFWL");
  // Optimize: Add limit parameter
  // Note: Create index { submittedAt: -1 } in MongoDB for better performance
  const query = db
    .collection("corrections")
    .find({})
    .sort({ submittedAt: -1 });

  // Default limit of 1000 if not specified
  if (limit) {
    query.limit(limit);
  } else {
    query.limit(1000); // Prevent loading too many at once
  }

  const corrections = await query.toArray();
  return corrections.map(toCorrection);
}

/**
 * Finds recent pending corrections from the same user for the same game
 * within a specified timeframe (default 5 minutes)
 */
export async function findRecentPendingCorrection(
  gameSlug: string,
  submittedBy: string,
  timeframeMinutes: number = 5
): Promise<Correction | null> {
  const client = await clientPromise;
  const db = client.db("GFWL");
  
  const cutoffTime = new Date(Date.now() - timeframeMinutes * 60 * 1000);
  
  const recentCorrection = await db
    .collection("corrections")
    .findOne({
      gameSlug,
      submittedBy,
      status: "pending",
      submittedAt: { $gte: cutoffTime },
    }, {
      sort: { submittedAt: -1 }, // Get the most recent one
    });
  
  return recentCorrection ? toCorrection(recentCorrection) : null;
}

export async function reviewCorrection(
  correctionId: string,
  reviewedBy: string,
  reviewedByName: string,
  status: CorrectionStatus,
  reviewNotes?: string,
  finalValue?: string | number | boolean | string[] | null
): Promise<void> {
  const client = await clientPromise;
  const db = client.db("GFWL");

  const correction = await db
    .collection("corrections")
    .findOne({ _id: new ObjectId(correctionId) });
  if (!correction) return;

  // Update correction
  await db.collection("corrections").updateOne(
    { _id: new ObjectId(correctionId) },
    {
      $set: {
        status,
        reviewedBy,
        reviewedByName,
        reviewedAt: new Date(),
        reviewNotes,
        finalValue,
      },
    }
  );

  // Update user stats
  if (status === "approved") {
    await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(correction.submittedBy) },
        { $inc: { approvedCount: 1 } }
      );
  } else if (status === "rejected") {
    await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(correction.submittedBy) },
        { $inc: { rejectedCount: 1 } }
      );
  }
}

// Audit Log Management
export async function createAuditLog(
  logData: Omit<AuditLog, "id" | "changedAt">
): Promise<AuditLog> {
  const client = await clientPromise;
  const db = client.db("GFWL");

  const newLog = {
    ...logData,
    changedAt: new Date(),
  };

  const result = await db.collection("auditLogs").insertOne(newLog);
  return toAuditLog({ ...newLog, _id: result.insertedId });
}

export async function getAuditLogsByGame(
  gameSlug: string
): Promise<AuditLog[]> {
  const client = await clientPromise;
  const db = client.db("GFWL");
  const logs = await db
    .collection("auditLogs")
    .find({ gameSlug })
    .sort({ changedAt: -1 })
    .toArray();
  return logs.map(toAuditLog);
}

export async function getAllAuditLogs(limit?: number): Promise<AuditLog[]> {
  const client = await clientPromise;
  const db = client.db("GFWL");
  // Optimize: Add default limit to prevent loading too many logs at once
  // Note: Create index { changedAt: -1 } in MongoDB for better performance
  const query = db
    .collection("auditLogs")
    .find({})
    .sort({ changedAt: -1 });

  // Default limit of 1000 if not specified to prevent memory issues
  const effectiveLimit = limit || 1000;
  query.limit(effectiveLimit);

  const logs = await query.toArray();
  return logs.map(toAuditLog);
}

// Statistics
export async function getCrowdsourceStats(): Promise<CrowdsourceStats> {
  const client = await clientPromise;
  const db = client.db("GFWL");

  const [users, corrections, auditLogs] = await Promise.all([
    db.collection("users").find({}).toArray(),
    db.collection("corrections").find({}).toArray(),
    db.collection("auditLogs").countDocuments(),
  ]);

  return {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === "active").length,
    suspendedUsers: users.filter((u) => u.status === "suspended").length,
    blockedUsers: users.filter((u) => u.status === "blocked").length,
    totalSubmissions: corrections.length,
    pendingSubmissions: corrections.filter((c) => c.status === "pending")
      .length,
    approvedSubmissions: corrections.filter((c) => c.status === "approved")
      .length,
    rejectedSubmissions: corrections.filter((c) => c.status === "rejected")
      .length,
    totalChanges: auditLogs,
  };
}

export async function getUserStats(userId: string): Promise<UserStats | null> {
  const client = await clientPromise;
  const db = client.db("GFWL");

  const user = await db
    .collection("users")
    .findOne({ _id: new ObjectId(userId) });
  if (!user) return null;

  const corrections = await db
    .collection("corrections")
    .find({ submittedBy: userId })
    .sort({ submittedAt: -1 })
    .toArray();

  const approved = corrections.filter((c) => c.status === "approved").length;
  const rejected = corrections.filter((c) => c.status === "rejected").length;
  const modified = corrections.filter((c) => c.status === "modified").length;
  const total = corrections.length;
  // Calculate approval rate excluding pending submissions
  // Only count approved + rejected in denominator
  const reviewedCount = approved + rejected;

  return {
    userId: user._id.toString(),
    userName: user.name,
    totalSubmissions: total,
    approvedSubmissions: approved,
    rejectedSubmissions: rejected,
    modifiedSubmissions: modified,
    approvalRate: reviewedCount > 0 ? (approved / reviewedCount) * 100 : 0,
    lastSubmission:
      corrections.length > 0 ? corrections[0].submittedAt : undefined,
    recentSubmissions: corrections.slice(0, 10).map(toCorrection),
  };
}

// Permission checks
export function canReviewCorrections(user: User): boolean {
  return user.role === "reviewer" || user.role === "admin";
}

export function canManageUsers(user: User): boolean {
  return user.role === "admin";
}

export function canSubmitCorrections(user: User): boolean {
  // Allow submission only if status is active or not set (for new users)
  // Blocked, suspended, restricted, and deleted users cannot submit
  return !user.status || user.status === "active";
}

// Delete user and anonymize their content
export async function deleteUserAndAnonymizeContent(
  userId: string
): Promise<void> {
  const client = await clientPromise;
  const db = client.db("GFWL");

  // 1. Anonymize correction submissions by this user
  await db.collection("corrections").updateMany(
    { submittedBy: userId },
    {
      $set: {
        submittedBy: "deleted",
        submittedByName: "Deleted Account",
      },
    }
  );

  // 2. Anonymize audit logs created by this user (as approver)
  await db.collection("auditLogs").updateMany(
    { changedBy: userId },
    {
      $set: {
        changedBy: "deleted",
        changedByName: "Deleted Account",
        changedByRole: "user",
      },
    }
  );

  // 3. Anonymize audit logs where this user was the original submitter
  await db.collection("auditLogs").updateMany(
    { submittedBy: userId },
    {
      $set: {
        submittedByName: "Deleted Account",
      },
    }
  );

  // 4. Soft delete the user account (mark as deleted, keep provider info for tracking)
  // Archive the original name and image for admin tracking purposes
  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(userId) });
  const originalName = userDoc?.name || "Unknown User";
  const originalImage = userDoc?.image || null;
  
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        status: "deleted",
        name: "Deleted Account", // Frontend display name
        archivedName: originalName, // Admin-only archived name for tracking
        archivedImage: originalImage, // Admin-only archived image for restoration
        email: `deleted_${userId}@deleted.local`,
        image: null,
        deletedAt: new Date(),
      },
    }
  );
}

// Restore a deleted user account (admin-only, within grace period)
export async function restoreDeletedUser(userId: string, adminOverride: boolean = false): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db("GFWL");
  const usersCollection = db.collection("users");

  const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

  if (!user || user.status !== "deleted" || !user.deletedAt) {
    return false; // Not a deleted user or already restored
  }

  const deletedAt = new Date(user.deletedAt);
  const now = new Date();
  const daysSinceDeletion = Math.floor(
    (now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Only allow restoration within 30-day grace period unless admin override
  if (!adminOverride && daysSinceDeletion > 30) {
    return false; // Beyond grace period
  }

  const restoredName = user.archivedName || user.name || "User";
  const restoredImage = user.archivedImage || null;

  // 1. Restore the user account
  await usersCollection.updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        status: "active",
        name: restoredName,
        image: restoredImage, // Restore archived image
        lastLoginAt: new Date(),
      },
      $unset: {
        deletedAt: "",
        suspendedUntil: "",
        archivedName: "", // Remove archived name on restoration
        archivedImage: "", // Remove archived image on restoration
      },
    }
  );

  // 2. Restore the user's name in their correction submissions
  await db.collection("corrections").updateMany(
    { submittedBy: userId },
    {
      $set: {
        submittedByName: restoredName,
      },
    }
  );

  // 3. Restore the user's name in audit logs where they were the submitter
  await db.collection("auditLogs").updateMany(
    { submittedBy: userId },
    {
      $set: {
        submittedByName: restoredName,
      },
    }
  );

  // 4. Restore the user's name in audit logs where they were the reviewer/approver
  await db.collection("auditLogs").updateMany(
    { changedBy: userId },
    {
      $set: {
        changedByName: restoredName,
      },
    }
  );

  return true;
}

// Fraud detection
export async function checkUserForFraudPattern(userId: string): Promise<{
  isSuspicious: boolean;
  reason?: string;
  rejectionRate: number;
}> {
  const stats = await getUserStats(userId);
  if (!stats) return { isSuspicious: false, rejectionRate: 0 };

  const rejectionRate =
    stats.totalSubmissions > 0
      ? (stats.rejectedSubmissions / stats.totalSubmissions) * 100
      : 0;

  // Flag if rejection rate is above 70% with at least 10 submissions
  if (rejectionRate > 70 && stats.totalSubmissions >= 10) {
    return {
      isSuspicious: true,
      reason: `High rejection rate: ${rejectionRate.toFixed(1)}%`,
      rejectionRate,
    };
  }

  return { isSuspicious: false, rejectionRate };
}

// Add a banned provider
export async function addBannedProvider(data: {
  provider: string;
  providerAccountId: string;
  userId?: string;
  reason: string;
  notes?: string;
  bannedBy: string;
  bannedByName: string;
}): Promise<void> {
  const client = await clientPromise;
  const db = client.db("GFWL");
  const bannedProvidersCollection = db.collection("bannedProviders");

  await bannedProvidersCollection.insertOne({
    provider: data.provider,
    providerAccountId: data.providerAccountId,
    userId: data.userId || null,
    reason: data.reason,
    notes: data.notes || null,
    bannedBy: data.bannedBy,
    bannedByName: data.bannedByName,
    bannedAt: new Date(),
  });
}

// Reviewer Application System

/**
 * Check if a user is eligible to apply for reviewer role
 */
export async function userEligibleForReviewer(userId: string): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user || user.role !== "user" || user.status !== "active") {
    return false;
  }

  // Check account age
  const accountAgeDays =
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  if (accountAgeDays < REVIEWER_APPLICATION_CONFIG.MIN_ACCOUNT_AGE_DAYS) {
    return false;
  }

  // Check submission counts
  if (
    user.submissionsCount < REVIEWER_APPLICATION_CONFIG.MIN_CORRECTIONS_SUBMITTED
  ) {
    return false;
  }

  if (user.approvedCount < REVIEWER_APPLICATION_CONFIG.MIN_CORRECTIONS_ACCEPTED) {
    return false;
  }

  return true;
}

/**
 * Get eligibility details for a user
 */
export async function getUserEligibilityDetails(userId: string): Promise<{
  eligible: boolean;
  accountAgeDays: number;
  submissionsCount: number;
  approvedCount: number;
  missingRequirements: string[];
}> {
  const user = await getUserById(userId);
  if (!user) {
    return {
      eligible: false,
      accountAgeDays: 0,
      submissionsCount: 0,
      approvedCount: 0,
      missingRequirements: ["User not found"],
    };
  }

  const accountAgeDays =
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  const missingRequirements: string[] = [];

  if (user.role !== "user") {
    missingRequirements.push("User must have 'user' role");
  }
  if (user.status !== "active") {
    missingRequirements.push("User account must be active");
  }
  if (accountAgeDays < REVIEWER_APPLICATION_CONFIG.MIN_ACCOUNT_AGE_DAYS) {
    missingRequirements.push(
      `Account must be at least ${REVIEWER_APPLICATION_CONFIG.MIN_ACCOUNT_AGE_DAYS} days old (currently ${Math.floor(accountAgeDays)} days)`
    );
  }
  if (
    user.submissionsCount < REVIEWER_APPLICATION_CONFIG.MIN_CORRECTIONS_SUBMITTED
  ) {
    missingRequirements.push(
      `Must have at least ${REVIEWER_APPLICATION_CONFIG.MIN_CORRECTIONS_SUBMITTED} corrections submitted (currently ${user.submissionsCount})`
    );
  }
  if (user.approvedCount < REVIEWER_APPLICATION_CONFIG.MIN_CORRECTIONS_ACCEPTED) {
    missingRequirements.push(
      `Must have at least ${REVIEWER_APPLICATION_CONFIG.MIN_CORRECTIONS_ACCEPTED} corrections accepted (currently ${user.approvedCount})`
    );
  }

  return {
    eligible: missingRequirements.length === 0,
    accountAgeDays: Math.floor(accountAgeDays),
    submissionsCount: user.submissionsCount,
    approvedCount: user.approvedCount,
    missingRequirements,
  };
}

/**
 * Create a reviewer application
 */
export async function createReviewerApplication(
  userId: string,
  motivationText: string,
  experienceText: string,
  contributionExamples: string,
  timeAvailability?: string,
  languages?: string,
  priorExperience?: string
): Promise<ReviewerApplication> {
  const client = await clientPromise;
  const db = client.db("GFWL");

  // Get user info for denormalization
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const application = {
    userId,
    userName: user.name,
    userEmail: user.email,
    motivationText,
    experienceText,
    contributionExamples,
    timeAvailability: timeAvailability || undefined,
    agreedToRules: true, // Must be true to submit
    languages: languages || undefined,
    priorExperience: priorExperience || undefined,
    createdAt: new Date(),
    status: "pending" as ReviewerApplicationStatus,
  };

  const result = await db
    .collection("reviewerApplications")
    .insertOne(application);

  return {
    ...application,
    id: result.insertedId.toString(),
  };
}

/**
 * Get user's latest reviewer application
 */
export async function getUserReviewerApplication(
  userId: string
): Promise<ReviewerApplication | null> {
  const client = await clientPromise;
  const db = client.db("GFWL");

  const application = await db
    .collection("reviewerApplications")
    .findOne(
      { userId },
      { sort: { createdAt: -1 } } // Get most recent
    );

  if (!application) {
    return null;
  }

  return {
    id: application._id.toString(),
    userId: application.userId || "",
    userName: application.userName,
    userEmail: application.userEmail,
    motivationText: application.motivationText || "",
    experienceText: application.experienceText || "",
    contributionExamples: application.contributionExamples || "",
    timeAvailability: application.timeAvailability,
    languages: application.languages,
    priorExperience: application.priorExperience,
    agreedToRules: application.agreedToRules || false,
    createdAt: application.createdAt || new Date(),
    status: application.status || "pending",
    adminId: application.adminId,
    adminName: application.adminName,
    decisionAt: application.decisionAt || undefined,
    adminNotes: application.adminNotes,
  } as ReviewerApplication;
}

/**
 * Check if user has pending application
 */
export async function hasPendingApplication(userId: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db("GFWL");

  const count = await db.collection("reviewerApplications").countDocuments({
    userId,
    status: "pending",
  });

  return count > 0;
}

/**
 * Check if user can re-apply (cooldown period check)
 */
export async function canReapplyForReviewer(
  userId: string
): Promise<{ canReapply: boolean; daysUntilReapply?: number; lastRejectionDate?: Date }> {
  const client = await clientPromise;
  const db = client.db("GFWL");

  // Get the most recent rejected application
  const lastRejected = await db
    .collection("reviewerApplications")
    .findOne(
      { userId, status: "rejected" },
      { sort: { decisionAt: -1 } }
    );

  if (!lastRejected || !lastRejected.decisionAt) {
    return { canReapply: true };
  }

  const lastRejectionDate = new Date(lastRejected.decisionAt);
  const daysSinceRejection =
    (Date.now() - lastRejectionDate.getTime()) / (1000 * 60 * 60 * 24);
  const cooldownDays = REVIEWER_APPLICATION_CONFIG.REAPPLICATION_COOLDOWN_DAYS;

  if (daysSinceRejection < cooldownDays) {
    return {
      canReapply: false,
      daysUntilReapply: Math.ceil(cooldownDays - daysSinceRejection),
      lastRejectionDate,
    };
  }

  return { canReapply: true, lastRejectionDate };
}

/**
 * Get all applications for a user (for history)
 */
export async function getUserReviewerApplicationHistory(
  userId: string
): Promise<ReviewerApplication[]> {
  const client = await clientPromise;
  const db = client.db("GFWL");

  const applications = await db
    .collection("reviewerApplications")
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  return applications.map((app) => ({
    id: app._id.toString(),
    userId: app.userId || "",
    userName: app.userName,
    userEmail: app.userEmail,
    motivationText: app.motivationText || "",
    experienceText: app.experienceText || "",
    contributionExamples: app.contributionExamples || "",
    timeAvailability: app.timeAvailability,
    languages: app.languages,
    priorExperience: app.priorExperience,
    agreedToRules: app.agreedToRules || false,
    createdAt: app.createdAt || new Date(),
    status: app.status || "pending",
    adminId: app.adminId,
    adminName: app.adminName,
    decisionAt: app.decisionAt || undefined,
    adminNotes: app.adminNotes,
  })) as ReviewerApplication[];
}

/**
 * Get all reviewer applications with optional status filter
 */
export async function getReviewerApplications(
  status?: ReviewerApplicationStatus
): Promise<ReviewerApplication[]> {
  const client = await clientPromise;
  const db = client.db("GFWL");

  const query = status ? { status } : {};
  const applications = await db
    .collection("reviewerApplications")
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  return applications.map((app) => ({
    id: app._id.toString(),
    userId: app.userId || "",
    userName: app.userName,
    userEmail: app.userEmail,
    motivationText: app.motivationText || "",
    experienceText: app.experienceText || "",
    contributionExamples: app.contributionExamples || "",
    timeAvailability: app.timeAvailability,
    languages: app.languages,
    priorExperience: app.priorExperience,
    agreedToRules: app.agreedToRules || false,
    createdAt: app.createdAt || new Date(),
    status: app.status || "pending",
    adminId: app.adminId,
    adminName: app.adminName,
    decisionAt: app.decisionAt || undefined,
    adminNotes: app.adminNotes,
  })) as ReviewerApplication[];
}

/**
 * Get reviewer application by ID
 */
export async function getReviewerApplicationById(
  id: string
): Promise<ReviewerApplication | null> {
  const client = await clientPromise;
  const db = client.db("GFWL");

  const application = await db
    .collection("reviewerApplications")
    .findOne({ _id: new ObjectId(id) });

  if (!application) {
    return null;
  }

  return {
    id: application._id.toString(),
    userId: application.userId || "",
    userName: application.userName,
    userEmail: application.userEmail,
    motivationText: application.motivationText || "",
    experienceText: application.experienceText || "",
    contributionExamples: application.contributionExamples || "",
    timeAvailability: application.timeAvailability,
    languages: application.languages,
    priorExperience: application.priorExperience,
    agreedToRules: application.agreedToRules || false,
    createdAt: application.createdAt || new Date(),
    status: application.status || "pending",
    adminId: application.adminId,
    adminName: application.adminName,
    decisionAt: application.decisionAt || undefined,
    adminNotes: application.adminNotes,
  } as ReviewerApplication;
}

/**
 * Approve a reviewer application
 */
export async function approveReviewerApplication(
  applicationId: string,
  adminId: string,
  adminName: string,
  adminNotes?: string
): Promise<void> {
  const client = await clientPromise;
  const db = client.db("GFWL");

  const application = await getReviewerApplicationById(applicationId);
  if (!application) {
    throw new Error("Application not found");
  }

  // Get user before updating to get previous role
  const usersCollection = db.collection("users");
  const user = await usersCollection.findOne({
    _id: new ObjectId(application.userId),
  });

  if (!user) {
    throw new Error("User not found");
  }

  const previousRole = user.role || "user";

  // Update application
  await db.collection("reviewerApplications").updateOne(
    { _id: new ObjectId(applicationId) },
    {
      $set: {
        status: "approved" as ReviewerApplicationStatus,
        adminId,
        adminName,
        decisionAt: new Date(),
        adminNotes: adminNotes || undefined,
      },
    }
  );

  // Update user role
  await updateUserRole(application.userId, "reviewer");

  // Add moderation log entry for the role change
  const moderationAction = {
    moderatedUser: {
      id: application.userId,
      name: user.name || application.userName || "Unknown User",
    },
    moderator: {
      id: adminId,
      name: adminName,
    },
    timestamp: new Date(),
    action: "Role changed to reviewer (from reviewer application approval)",
    reason: adminNotes || "Reviewer application approved",
    previousRole,
    newRole: "reviewer",
    applicationId: applicationId, // Link to the application
  };

  // Add moderation action to user's moderationHistory array
  await usersCollection.updateOne(
    { _id: new ObjectId(application.userId) },
    {
      $push: {
        moderationHistory: {
          $each: [moderationAction],
          $position: 0,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      },
    }
  );
}

/**
 * Reject a reviewer application
 */
export async function rejectReviewerApplication(
  applicationId: string,
  adminId: string,
  adminName: string,
  adminNotes?: string
): Promise<void> {
  const client = await clientPromise;
  const db = client.db("GFWL");

  await db.collection("reviewerApplications").updateOne(
    { _id: new ObjectId(applicationId) },
    {
      $set: {
        status: "rejected" as ReviewerApplicationStatus,
        adminId,
        adminName,
        decisionAt: new Date(),
        adminNotes: adminNotes || undefined,
      },
    }
  );
}

/**
 * Log a reviewer action (approve/reject correction)
 */
export async function logReviewerAction(
  reviewerId: string,
  reviewerName: string,
  correctionId: string,
  action: ReviewerAction
): Promise<void> {
  const client = await clientPromise;
  const db = client.db("GFWL");

  await db.collection("reviewerActionsLog").insertOne({
    reviewerId,
    reviewerName,
    correctionId,
    action,
    createdAt: new Date(),
  });
}

/**
 * Get reviewer action logs
 */
export async function getReviewerActionLogs(
  reviewerId?: string,
  limit: number = 100
): Promise<ReviewerActionLog[]> {
  const client = await clientPromise;
  const db = client.db("GFWL");

  const query = reviewerId ? { reviewerId } : {};
  const logs = await db
    .collection("reviewerActionsLog")
    .find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return logs.map((log) => ({
    id: log._id.toString(),
    reviewerId: log.reviewerId || "",
    reviewerName: log.reviewerName,
    correctionId: log.correctionId || "",
    action: log.action || "approve",
    createdAt: log.createdAt || new Date(),
  })) as ReviewerActionLog[];
}