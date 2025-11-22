import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// GET - Get user settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    // Users can only view their own settings
    if (!session || session.user.id !== id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getGFWLDatabase();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return user settings (defaults if not set)
    return NextResponse.json({
      showStatistics: user.settings?.showStatistics ?? true,
      emailNotifications: user.settings?.emailNotifications ?? false,
      reviewNotifications: user.settings?.reviewNotifications ?? false,
      theme: user.settings?.theme ?? "dark",
    });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PATCH - Update user settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    // Users can only update their own settings
    if (!session || session.user.id !== id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { showStatistics, emailNotifications, reviewNotifications, theme } = body;

    const db = await getGFWLDatabase();
    const usersCollection = db.collection("users");

    // Check if user exists
    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build settings object
    const settings: Record<string, boolean | string> = {};
    if (typeof showStatistics === "boolean") {
      settings.showStatistics = showStatistics;
    }
    if (typeof emailNotifications === "boolean") {
      settings.emailNotifications = emailNotifications;
    }
    if (typeof reviewNotifications === "boolean") {
      settings.reviewNotifications = reviewNotifications;
    }
    if (typeof theme === "string" && (theme === "dark" || theme === "light")) {
      settings.theme = theme;
    }

    // Update user settings
    await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          settings: {
            ...(user.settings || {}),
            ...settings,
          },
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("Error updating user settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

