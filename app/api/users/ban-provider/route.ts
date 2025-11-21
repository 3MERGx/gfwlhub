import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { addBannedProvider } from "@/lib/crowdsource-service-mongodb";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only admins can ban providers
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { userId, provider, providerAccountId, reason, notes } = body;

    if (!provider || !providerAccountId || !reason) {
      return NextResponse.json(
        { error: "Provider, provider account ID, and reason are required" },
        { status: 400 }
      );
    }

    // Add to banned providers collection
    await addBannedProvider({
      provider,
      providerAccountId,
      userId,
      reason,
      notes,
      bannedBy: session.user.id,
      bannedByName: session.user.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error banning provider:", error);
    return NextResponse.json(
      { error: "Failed to ban provider" },
      { status: 500 }
    );
  }
}

