import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";

// GET - Export user data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const session = await getServerSession(authOptions);
    const identifier = getClientIdentifier(request, session?.user?.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const { id } = await params;
    const sanitizedId = sanitizeString(String(id || ""), 50);

    // Users can only export their own data
    if (!session || session.user.id !== sanitizedId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!sanitizedId || !ObjectId.isValid(sanitizedId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const db = await getGFWLDatabase();
    const usersCollection = db.collection("users");
    const correctionsCollection = db.collection("corrections");
    const gameSubmissionsCollection = db.collection("gameSubmissions");
    const auditLogsCollection = db.collection("auditLogs");

    const user = await usersCollection.findOne({ _id: new ObjectId(sanitizedId) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's corrections (all fields)
    const corrections = await correctionsCollection
      .find({ submittedBy: sanitizedId })
      .sort({ submittedAt: -1 }) // Most recent first
      .toArray();

    // Get user's game submissions (all fields)
    const gameSubmissions = await gameSubmissionsCollection
      .find({ submittedBy: sanitizedId })
      .sort({ submittedAt: -1 }) // Most recent first
      .toArray();

    // Get audit logs where user was the submitter or changer
    const auditLogs = await auditLogsCollection
      .find({
        $or: [
          { submittedBy: sanitizedId },
          { changedBy: sanitizedId },
        ],
      })
      .sort({ changedAt: -1 }) // Most recent first
      .toArray();

    // Prepare export data with all fields
    const exportData = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        version: "2.0",
        description: "Complete export of your GFWL Hub account data including account information, statistics, all corrections, game submissions, audit logs, and settings.",
        dataIncluded: [
          "Account information and profile",
          "Account statistics",
          "All correction submissions (with full details)",
          "All game submissions (with full proposed data)",
          "Audit logs (where you were submitter or reviewer)",
          "Account settings and preferences",
        ],
      },
      account: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image || null,
        role: user.role || "user",
        status: user.status || "active",
        provider: user.providerInfo?.provider || null,
        providerAccountId: user.providerInfo?.providerAccountId || null,
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
        lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toISOString() : null,
        updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : null,
      },
      statistics: {
        submissionsCount: user.submissionsCount || 0,
        approvedCount: user.approvedCount || 0,
        rejectedCount: user.rejectedCount || 0,
        totalCorrections: corrections.length,
        totalGameSubmissions: gameSubmissions.length,
        totalAuditLogs: auditLogs.length,
        correctionsByStatus: {
          pending: corrections.filter((c) => c.status === "pending").length,
          approved: corrections.filter((c) => c.status === "approved").length,
          rejected: corrections.filter((c) => c.status === "rejected").length,
          modified: corrections.filter((c) => c.status === "modified").length,
        },
        gameSubmissionsByStatus: {
          pending: gameSubmissions.filter((gs) => gs.status === "pending").length,
          approved: gameSubmissions.filter((gs) => gs.status === "approved").length,
          rejected: gameSubmissions.filter((gs) => gs.status === "rejected").length,
        },
      },
      corrections: corrections.map((c) => ({
        id: c._id.toString(),
        gameId: c.gameId || null,
        gameSlug: c.gameSlug || null,
        gameTitle: c.gameTitle || null,
        field: c.field || null,
        oldValue: c.oldValue ?? null,
        newValue: c.newValue ?? null,
        finalValue: c.finalValue ?? null, // If modified by reviewer
        reason: c.reason || null,
        status: c.status || "pending",
        submittedAt: c.submittedAt ? new Date(c.submittedAt).toISOString() : null,
        submittedByName: c.submittedByName || null,
        reviewedBy: c.reviewedBy || null,
        reviewedByName: c.reviewedByName || null,
        reviewedAt: c.reviewedAt ? new Date(c.reviewedAt).toISOString() : null,
        reviewNotes: c.reviewNotes || null,
      })),
      gameSubmissions: gameSubmissions.map((gs) => ({
        id: gs._id.toString(),
        gameSlug: gs.gameSlug || null,
        gameTitle: gs.gameTitle || null,
        status: gs.status || "pending",
        proposedData: gs.proposedData || {},
        submitterNotes: gs.submitterNotes || null,
        submittedAt: gs.submittedAt ? new Date(gs.submittedAt).toISOString() : null,
        submittedByName: gs.submittedByName || null,
        reviewedBy: gs.reviewedBy || null,
        reviewedByName: gs.reviewedByName || null,
        reviewedAt: gs.reviewedAt ? new Date(gs.reviewedAt).toISOString() : null,
        reviewNotes: gs.reviewNotes || null,
        publishedByName: gs.publishedByName || null,
        publishedAt: gs.publishedAt ? new Date(gs.publishedAt).toISOString() : null,
      })),
      auditLogs: auditLogs.map((log) => ({
        id: log._id.toString(),
        gameId: log.gameId || null,
        gameSlug: log.gameSlug || null,
        gameTitle: log.gameTitle || null,
        field: log.field || null,
        oldValue: log.oldValue ?? null,
        newValue: log.newValue ?? null,
        action: log.action || null,
        changedBy: log.changedBy || null,
        changedByName: log.changedByName || null,
        changedByRole: log.changedByRole || null,
        changedAt: log.changedAt ? new Date(log.changedAt).toISOString() : null,
        submittedBy: log.submittedBy || null,
        submittedByName: log.submittedByName || null,
        correctionId: log.correctionId || null,
        notes: log.notes || null,
      })),
      settings: user.settings || {},
    };

    // Return as JSON download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="gfwl-hub-data-${sanitizedId}-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    safeLog.error("Error exporting user data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

