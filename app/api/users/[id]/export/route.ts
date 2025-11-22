import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET - Export user data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    // Users can only export their own data
    if (!session || session.user.id !== id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getGFWLDatabase();
    const usersCollection = db.collection("users");
    const correctionsCollection = db.collection("corrections");
    const gameSubmissionsCollection = db.collection("gameSubmissions");

    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's corrections
    const corrections = await correctionsCollection
      .find({ submittedBy: id })
      .toArray();

    // Get user's game submissions
    const gameSubmissions = await gameSubmissionsCollection
      .find({ submittedBy: id })
      .toArray();

    // Prepare export data
    const exportData = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        version: "1.0",
        description: "Complete export of your GFWL Hub account data including account information, statistics, all corrections, game submissions, and settings.",
      },
      account: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        provider: user.providerInfo?.provider,
      },
      statistics: {
        submissionsCount: user.submissionsCount || 0,
        approvedCount: user.approvedCount || 0,
        rejectedCount: user.rejectedCount || 0,
        totalCorrections: corrections.length,
        totalGameSubmissions: gameSubmissions.length,
      },
      corrections: corrections.map((c) => ({
        id: c._id.toString(),
        gameId: c.gameId,
        field: c.field,
        oldValue: c.oldValue,
        newValue: c.newValue,
        status: c.status,
        submittedAt: c.submittedAt,
        reviewedAt: c.reviewedAt,
        reviewedBy: c.reviewedBy,
      })),
      gameSubmissions: gameSubmissions.map((gs) => ({
        id: gs._id.toString(),
        gameName: gs.gameName,
        status: gs.status,
        submittedAt: gs.submittedAt,
        reviewedAt: gs.reviewedAt,
        reviewedBy: gs.reviewedBy,
      })),
      settings: user.settings || {},
    };

    // Return as JSON download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="gfwl-hub-data-${id}-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error("Error exporting user data:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}

