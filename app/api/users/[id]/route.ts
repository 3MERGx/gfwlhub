import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { getGFWLDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { deleteUserAndAnonymizeContent } from "@/lib/crowdsource-service-mongodb";

// GET - Get user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // Must be signed in to view profiles
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const db = await getGFWLDatabase();
    const usersCollection = db.collection("users");

    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return user data
    return NextResponse.json({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.image,
      role: user.role || "user",
      status: user.status || "active",
      provider: user.providerInfo?.provider || "unknown",
      submissionsCount: user.submissionsCount || 0,
      approvedCount: user.approvedCount || 0,
      rejectedCount: user.rejectedCount || 0,
      createdAt: user.createdAt || new Date(),
      providerInfo: user.providerInfo,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PATCH - Update user role or status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // Only admins can update users
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { role, status, suspendedUntil } = body;

    // Validate that at least one field is being updated
    if (!role && !status) {
      return NextResponse.json(
        { error: "Must provide role or status to update" },
        { status: 400 }
      );
    }

    // Validate role if provided
    if (role && !["user", "reviewer", "admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Validate status if provided
    if (status && !["active", "suspended", "restricted", "blocked"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    const db = await getGFWLDatabase();
    const usersCollection = db.collection("users");

    // Check if user exists
    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Security: Only developers can change admin roles
    // Regular admins cannot change other admins' roles or promote to admin
    if (role) {
      const isDeveloper = (() => {
        const devEmails =
          process.env.DEVELOPER_EMAILS?.split(",").map((e) => e.trim()) || [];
        return session.user.email && devEmails.includes(session.user.email);
      })();

      // If target user is admin, only developers can change their role
      if (user.role === "admin" && !isDeveloper) {
        return NextResponse.json(
          {
            error:
              "Only developers can change admin roles. Regular admins cannot modify other admins.",
          },
          { status: 403 }
        );
      }

      // If promoting to admin, only developers can do this
      if (role === "admin" && !isDeveloper) {
        return NextResponse.json(
          {
            error:
              "Only developers can promote users to admin. Regular admins can only promote to reviewer.",
          },
          { status: 403 }
        );
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (role) {
      updateData.role = role;
    }

    if (status) {
      updateData.status = status;

      // If setting to active or restricted, remove suspendedUntil
      if (status === "active" || status === "restricted") {
        await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $unset: { suspendedUntil: "" } }
        );
      }

      // If suspending, set the suspendedUntil date
      if (status === "suspended" && suspendedUntil) {
        updateData.suspendedUntil = new Date(suspendedUntil);
      }
    }

    // Update user
    await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE - Delete user account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Users can only delete their own account
    if (session.user.id !== id) {
      return NextResponse.json(
        { error: "You can only delete your own account" },
        { status: 403 }
      );
    }

    // Call the soft delete function (marks as deleted, keeps provider info for tracking)
    await deleteUserAndAnonymizeContent(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
