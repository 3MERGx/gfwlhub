import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";

// PATCH - Toggle featureEnabled for a game (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // Only admins can toggle features
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const body = await request.json();
    const { featureEnabled } = body;

    // Validate featureEnabled
    if (typeof featureEnabled !== "boolean") {
      return NextResponse.json(
        { error: "featureEnabled must be a boolean" },
        { status: 400 }
      );
    }

    const db = await getGFWLDatabase();
    const gamesCollection = db.collection("Games"); // Use capital G to match games-service

    // Generate update ID (timestamp-based)
    const updateId = `${Date.now()}-${slug}`;
    
    // Create update history entry (for feature toggles, admin is both submitter and reviewer)
    const updateHistoryEntry = {
      updateId,
      timestamp: new Date(),
      submitter: {
        id: session.user.id,
        name: session.user.name || "Unknown",
      },
      reviewer: {
        id: session.user.id,
        name: session.user.name || "Unknown",
      },
      field: "featureEnabled",
      updateType: "featureToggle" as const,
      notes: `Feature ${featureEnabled ? "enabled" : "disabled"} by admin`,
    };

    // Update existing game document with featureEnabled flag and update history
    await gamesCollection.updateOne(
      { slug },
      {
        $set: {
          featureEnabled,
          updatedAt: new Date(),
          updatedBy: session.user.id,
          updatedByName: session.user.name || "Unknown",
        },
        $push: {
          updateHistory: updateHistoryEntry,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      }
    );

    return NextResponse.json({ success: true, featureEnabled });
  } catch (error) {
    console.error("Error toggling game feature:", error);
    return NextResponse.json(
      { error: "Failed to toggle game feature" },
      { status: 500 }
    );
  }
}

