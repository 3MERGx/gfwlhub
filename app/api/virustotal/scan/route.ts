import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import { scanUrl, getScanReport, getUrlReport } from "@/lib/virustotal";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only reviewers and admins can scan URLs
    if (!session || (session.user.role !== "reviewer" && session.user.role !== "admin")) {
      return NextResponse.json(
        { error: "Unauthorized. Reviewers and admins only." },
        { status: 401 }
      );
    }

    const { url, action } = await request.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
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
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    if (action === "scan") {
      // First check if URL was already scanned (this uses the API but doesn't count as a scan)
      const checkResult = await getUrlReport(url, apiKey);
      
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
      console.log(`[VirusTotal] Submitting new scan for URL: ${url}`);
      const scanResult = await scanUrl(url, apiKey);
      
      if (!scanResult.success) {
        console.error(`[VirusTotal] Scan submission failed: ${scanResult.error}`);
        return NextResponse.json(
          { error: scanResult.error || "Failed to scan URL" },
          { status: 500 }
        );
      }

      console.log(`[VirusTotal] Scan submitted, analysis ID: ${scanResult.analysisId}`);

      // Wait a moment for the scan to process, then get results
      // Note: In production, you might want to poll or use webhooks
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const reportResult = await getScanReport(scanResult.analysisId!, apiKey);
      
      if (!reportResult.success) {
        console.error(`[VirusTotal] Failed to get scan results: ${reportResult.error}`);
        return NextResponse.json(
          { 
            error: reportResult.error || "Failed to get scan results",
            analysisId: scanResult.analysisId,
            message: "URL submitted for scanning. Results may take a moment to process. Please try again in a few seconds."
          },
          { status: 202 } // Accepted but processing
        );
      }

      console.log(`[VirusTotal] Scan results retrieved successfully`);
      return NextResponse.json({
        success: true,
        analysisId: scanResult.analysisId,
        report: reportResult.report,
        fromCache: false, // This was a new scan
      });
    } else if (action === "check") {
      // Check if URL was already scanned
      const reportResult = await getUrlReport(url, apiKey);
      
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
    } else {
      return NextResponse.json(
        { error: "Invalid action. Use 'scan' or 'check'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("VirusTotal scan error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

