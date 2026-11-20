import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { internalError } from "@/lib/api-error";

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const featureFlags: Record<string, boolean> = {};
    featureFlags["FEATURE_GAME_SHADOWRUN"] = true;

    return NextResponse.json(featureFlags, {
      headers: {
        "Cache-Control": "private, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    return internalError("Error fetching feature flags:", error);
  }
}
