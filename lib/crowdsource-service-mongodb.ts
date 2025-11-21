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
} from "@/types/crowdsource";
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

export async function getAllCorrections(): Promise<Correction[]> {
  const client = await clientPromise;
  const db = client.db("GFWL");
  const corrections = await db
    .collection("corrections")
    .find({})
    .sort({ submittedAt: -1 })
    .toArray();
  return corrections.map(toCorrection);
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
  const query = db.collection("auditLogs").find({}).sort({ changedAt: -1 });

  if (limit) {
    query.limit(limit);
  }

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