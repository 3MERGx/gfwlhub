import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import {
  getUserEligibilityDetails,
  getUserByEmail,
} from "@/lib/crowdsource-service-mongodb";
import { safeLog } from "@/lib/security";

// GET - Get user's eligibility status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getUserByEmail(session.user.email!);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const eligibility = await getUserEligibilityDetails(user.id);
    return NextResponse.json(eligibility);
  } catch (error) {
    safeLog.error("Error fetching eligibility:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

