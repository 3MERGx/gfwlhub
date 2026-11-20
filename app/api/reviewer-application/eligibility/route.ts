import { NextResponse } from "next/server";
import { getUserEligibilityDetails } from "@/lib/crowdsource-service-mongodb";
import { safeLog } from "@/lib/security";
import { requireSession } from "@/lib/api-auth";

// GET - Get user's eligibility status
export async function GET() {
  try {
    const auth = await requireSession();
    if (!auth.ok) return auth.response;

    const eligibility = await getUserEligibilityDetails(auth.user.id);
    return NextResponse.json(eligibility);
  } catch (error) {
    safeLog.error("Error fetching eligibility:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
