import { NextResponse } from "next/server";

export async function GET() {
  // Get all environment variables that start with FEATURE_GAME_
  const featureFlags: Record<string, boolean> = {};

  // In a real app, you'd get these from your environment
  // For this example, we'll hardcode Shadowrun as enabled
  featureFlags["FEATURE_GAME_SHADOWRUN"] = true;

  return NextResponse.json(featureFlags);
}
