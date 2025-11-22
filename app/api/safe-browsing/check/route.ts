import { NextRequest, NextResponse } from "next/server";
import { checkUrlSafety } from "@/lib/google-safe-browsing";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
    if (!apiKey) {
      console.error("Google Safe Browsing API key not found in environment variables");
      return NextResponse.json(
        { error: "Google Safe Browsing API key not configured. Please add GOOGLE_SAFE_BROWSING_API_KEY to your .env.local file." },
        { status: 500 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const result = await checkUrlSafety(url, apiKey);

    if (!result.success) {
      console.error("Google Safe Browsing check failed:", result.error);
      
      // Check if it's a permission/restriction error
      if (result.error?.includes("403") || result.error?.includes("PERMISSION_DENIED") || result.error?.includes("referer")) {
        return NextResponse.json(
          { 
            error: "API key restrictions are blocking server-side requests. Please remove HTTP referrer restrictions from your Google Cloud API key, or create a new key without referrer restrictions for server-side use.",
            details: result.error
          },
          { status: 403 }
        );
      }
      
      return NextResponse.json(
        { error: result.error || "Failed to check URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      isSafe: result.isSafe,
      threatType: result.threatType,
    });
  } catch (error) {
    console.error("Google Safe Browsing check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

