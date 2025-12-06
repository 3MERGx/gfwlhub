import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { safeLog, rateLimiters, getClientIdentifier } from "@/lib/security";

// Helper to convert MongoDB user to our User format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toUser(doc: any) {
  // Provider info is stored as an object: providerInfo: { provider, providerAccountId, type }
  const providerInfo = doc.providerInfo || {};
  
  return {
    id: doc._id.toString(),
    name: doc.name || doc.email?.split("@")[0] || "Unknown",
    email: doc.email,
    avatar: doc.image, // Use Google image field
    role: doc.role || "user",
    status: doc.status || "active",
    provider: providerInfo.provider || "google",
    providerId: providerInfo.providerAccountId || "N/A",
    createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
    lastLoginAt: doc.lastLoginAt ? new Date(doc.lastLoginAt) : new Date(),
    submissionsCount: doc.submissionsCount || 0,
    approvedCount: doc.approvedCount || 0,
    rejectedCount: doc.rejectedCount || 0,
    suspendedUntil: doc.suspendedUntil ? new Date(doc.suspendedUntil) : undefined,
    deletedAt: doc.deletedAt ? new Date(doc.deletedAt) : undefined,
    anonymizedAt: doc.anonymizedAt ? new Date(doc.anonymizedAt) : undefined,
    archivedName: doc.archivedName, // Admin-only: original name before deletion
    providerInfo: doc.providerInfo ? {
      provider: doc.providerInfo.provider,
      providerAccountId: doc.providerInfo.providerAccountId,
    } : undefined,
  };
}

export async function GET(request: Request) {
  try {
    // Rate limiting
    const session = await getServerSession(authOptions);
    const identifier = getClientIdentifier(request, session?.user?.id);
    if (!rateLimiters.admin.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Check authentication
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getGFWLDatabase();
    
    // Get all users - provider info is stored directly in user document
    const users = await db.collection("users").find({}).toArray();

    // Map users (provider is already in user document)
    const usersWithProvider = users.map((user) => toUser(user));

    return NextResponse.json(
      usersWithProvider,
      {
        headers: {
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    safeLog.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

