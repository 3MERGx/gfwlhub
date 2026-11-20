import { NextRequest, NextResponse } from "next/server";
import {
  scanUrl,
  getScanReport,
  getUrlReport,
  summarizeVirusTotalUrlReport,
} from "@/lib/virustotal";
import { buildVirusTotalGuiUrlForUrlScan } from "@/lib/virustotal-download-consistency";
import {
  safeLog,
  sanitizeString,
  rateLimiters,
  getClientIdentifier,
} from "@/lib/security";
import { requireReviewer } from "@/lib/api-auth";
import { internalError, jsonError } from "@/lib/api-error";
import { readCsrfToken, validateCSRFToken } from "@/lib/csrf";
import { saveCorrectionVirusTotalScan } from "@/lib/crowdsource-service-mongodb";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireReviewer();
    if (!auth.ok) return auth.response;

    const identifier = getClientIdentifier(request, auth.user.id);
    if (!rateLimiters.api.isAllowed(identifier)) {
      return jsonError("Too many requests. Please try again later.", 429);
    }

    if (!rateLimiters.virusTotal.isAllowed(identifier)) {
      return jsonError(
        "Too many VirusTotal requests. Wait a minute before scanning again (free tier limit).",
        429
      );
    }

    const body = await request.json();
    const csrfToken = readCsrfToken(request, body);
    if (!(await validateCSRFToken(csrfToken))) {
      return jsonError("Invalid CSRF token", 403);
    }

    const { url, action, correctionId } = body;

    // Sanitize and validate inputs
    const sanitizedUrl = sanitizeString(String(url || ""), 2000);
    const sanitizedAction = action ? sanitizeString(String(action), 50) : "scan";
    const sanitizedCorrectionId =
      typeof correctionId === "string"
        ? sanitizeString(correctionId, 64)
        : "";

    if (!sanitizedUrl || typeof url !== "string") {
      return jsonError("URL is required", 400);
    }

    if (!["scan", "check"].includes(sanitizedAction)) {
      return jsonError("Invalid action. Use 'scan' or 'check'", 400);
    }

    const apiKey = process.env.VIRUSTOTAL_API_KEY;
    if (!apiKey) {
      safeLog.error("VirusTotal API key not configured");
      return jsonError(
        "URL scanning is temporarily unavailable. Please try again later.",
        503
      );
    }

    // Validate URL format
    try {
      new URL(sanitizedUrl);
    } catch {
      return jsonError("Invalid URL format", 400);
    }

    const persistScan = async (report: NonNullable<
      Awaited<ReturnType<typeof getUrlReport>>["report"]
    >) => {
      if (!sanitizedCorrectionId) return undefined;
      const summary =
        summarizeVirusTotalUrlReport(
          report,
          buildVirusTotalGuiUrlForUrlScan(sanitizedUrl)
        ) || null;
      if (!summary) return undefined;

      const saved = await saveCorrectionVirusTotalScan(
        sanitizedCorrectionId,
        sanitizedUrl,
        {
          ...summary,
          scannedAt: new Date(),
          source: "review",
        }
      );
      if (!saved.ok) {
        safeLog.error(
          "[VirusTotal] Failed to persist scan on correction:",
          saved.error
        );
        return undefined;
      }
      return saved.correction.virusTotalScan;
    };

    if (sanitizedAction === "scan") {
      // First check if URL was already scanned (this uses the API but doesn't count as a scan)
      const checkResult = await getUrlReport(sanitizedUrl, apiKey);

      if (checkResult.success && checkResult.report) {
        const virusTotalScan = await persistScan(checkResult.report);
        return NextResponse.json({
          success: true,
          report: checkResult.report,
          fromCache: true,
          virusTotalScan,
        });
      }

      // URL not in database, submit for scanning (this WILL use API quota)
      safeLog.log(`[VirusTotal] Submitting new scan for URL: ${sanitizedUrl}`);
      const scanResult = await scanUrl(sanitizedUrl, apiKey);

      if (!scanResult.success) {
        safeLog.error(
          `[VirusTotal] Scan submission failed: ${scanResult.error}`
        );
        return jsonError("Failed to scan URL. Please try again later.", 503);
      }

      safeLog.log(
        `[VirusTotal] Scan submitted, analysis ID: ${scanResult.analysisId}`
      );

      // Wait a moment for the scan to process, then get results
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const reportResult = await getScanReport(scanResult.analysisId!, apiKey);

      if (!reportResult.success || !reportResult.report) {
        safeLog.error(
          `[VirusTotal] Failed to get scan results: ${reportResult.error}`
        );
        return NextResponse.json(
          {
            error:
              "URL submitted for scanning. Results may take a moment to process. Please try again in a few seconds.",
            analysisId: scanResult.analysisId,
          },
          { status: 202 }
        );
      }

      safeLog.log(`[VirusTotal] Scan results retrieved successfully`);
      const virusTotalScan = await persistScan(reportResult.report);
      return NextResponse.json({
        success: true,
        analysisId: scanResult.analysisId,
        report: reportResult.report,
        fromCache: false,
        virusTotalScan,
      });
    } else if (sanitizedAction === "check") {
      const reportResult = await getUrlReport(sanitizedUrl, apiKey);

      if (!reportResult.success || !reportResult.report) {
        safeLog.error(`[VirusTotal] Check failed: ${reportResult.error}`);
        return jsonError("No scan report found for this URL", 404);
      }

      const virusTotalScan = await persistScan(reportResult.report);
      return NextResponse.json({
        success: true,
        report: reportResult.report,
        virusTotalScan,
      });
    }

    return jsonError("Invalid action. Use 'scan' or 'check'", 400);
  } catch (error) {
    return internalError("VirusTotal scan error:", error);
  }
}
