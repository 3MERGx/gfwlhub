import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { scanUrl, getScanReport, getUrlReport } from "@/lib/virustotal";
import { safeLog, sanitizeString, rateLimiters, getClientIdentifier } from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const session = await getServerSession(authOptions);
    const identifier = getClientIdentifier(request, session?.user?.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // Only reviewers and admins can scan URLs
    if (!session || (session.user.role !== "reviewer" && session.user.role !== "admin")) {
      return NextResponse.json(
        { error: "Unauthorized. Reviewers and admins only." },
        { status: 401 }
      );
    }

    const { url, action } = await request.json();

    // Sanitize and validate inputs
    const sanitizedUrl = sanitizeString(String(url || ""), 2000);
    const sanitizedAction = action ? sanitizeString(String(action), 50) : "scan";

    if (!sanitizedUrl || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    if (!["scan", "check"].includes(sanitizedAction)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'scan' or 'check'" },
        { status: 400 }
      );
    }

    const apiKey = process.env.VIRUSTOTAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "VirusTotal API key not configured" },
        { status: 500 }
      );
    }

    // Validate URL format
    try {
      new URL(sanitizedUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    if (sanitizedAction === "scan") {
      // First check if URL was already scanned (this uses the API but doesn't count as a scan)
      const checkResult = await getUrlReport(sanitizedUrl, apiKey);
      
      if (checkResult.success && checkResult.report) {
        // URL already in database, return existing report
        // This doesn't use a scan quota, just retrieves existing data
        return NextResponse.json({
          success: true,
          report: checkResult.report,
          fromCache: true, // Indicate this is from existing data, not a new scan
        });
      }

      // URL not in database, submit for scanning (this WILL use API quota)
      safeLog.log(`[VirusTotal] Submitting new scan for URL: ${sanitizedUrl}`);
      const scanResult = await scanUrl(sanitizedUrl, apiKey);
      
      if (!scanResult.success) {
        safeLog.error(`[VirusTotal] Scan submission failed: ${scanResult.error}`);
        return NextResponse.json(
          { error: scanResult.error || "Failed to scan URL" },
          { status: 500 }
        );
      }

      safeLog.log(`[VirusTotal] Scan submitted, analysis ID: ${scanResult.analysisId}`);

      // Wait a moment for the scan to process, then get results
      // Note: In production, you might want to poll or use webhooks
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const reportResult = await getScanReport(scanResult.analysisId!, apiKey);
      
      if (!reportResult.success) {
        safeLog.error(`[VirusTotal] Failed to get scan results: ${reportResult.error}`);
        return NextResponse.json(
          { 
            error: reportResult.error || "Failed to get scan results",
            analysisId: scanResult.analysisId,
            message: "URL submitted for scanning. Results may take a moment to process. Please try again in a few seconds."
          },
          { status: 202 } // Accepted but processing
        );
      }

      safeLog.log(`[VirusTotal] Scan results retrieved successfully`);
      return NextResponse.json({
        success: true,
        analysisId: scanResult.analysisId,
        report: reportResult.report,
        fromCache: false, // This was a new scan
      });
    } else if (sanitizedAction === "check") {
      // Check if URL was already scanned
      const reportResult = await getUrlReport(sanitizedUrl, apiKey);
      
      if (!reportResult.success) {
        return NextResponse.json(
          { error: reportResult.error || "Failed to check URL" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        report: reportResult.report,
      });
    }
  } catch (error) {
    safeLog.error("VirusTotal scan error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

