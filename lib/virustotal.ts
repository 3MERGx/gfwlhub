import { createHash } from "crypto";
import { safeLog } from "@/lib/security";

/**
 * VirusTotal API Integration
 * Free tier: 500 requests/day, 4 requests/minute
 */

/** Control-flow sentinel: URL has never been scanned (safe to return to clients). */
export const VT_URL_NOT_FOUND = "URL not found in VirusTotal database";

const VT_PUBLIC_ERRORS = {
  scanFailed: "Failed to scan URL. Please try again later.",
  reportFailed: "Failed to get scan results. Please try again later.",
  checkFailed: "Failed to check URL. Please try again later.",
  unexpected: "VirusTotal request failed. Please try again later.",
} as const;

/**
 * Path segment for GET /v3/urls/{url_id}.
 * VirusTotal accepts the SHA-256 hex of the UTF-8 URL (same token as /gui/url/{id}).
 * Base64 of the digest bytes is rejected with BadRequestError "Wrong URL id".
 */
export function virusTotalApiUrlIdentifier(canonicalUrl: string): string {
  return createHash("sha256")
    .update(canonicalUrl.trim(), "utf8")
    .digest("hex");
}

export interface VirusTotalScanResponse {
  data: {
    type: string;
    id: string;
    links: {
      self: string;
    };
  };
}

export interface VirusTotalReportResponse {
  data: {
    type: string;
    id: string;
    attributes: {
      status?: "completed" | "queued" | "in-progress";
      stats?: {
        harmless: number;
        malicious: number;
        suspicious: number;
        undetected: number;
        timeout: number;
      };
      last_analysis_stats?: {
        harmless: number;
        malicious: number;
        suspicious: number;
        undetected: number;
        timeout: number;
      };
      results?: Record<string, {
        category: string;
        result: string;
        method: string;
        engine_name: string;
      }>;
      url?: string;
    };
  };
}

export interface VirusTotalError {
  error: {
    code: string;
    message: string;
  };
}

export interface VirusTotalScanSummary {
  reportUrl: string;
  malicious: number;
  suspicious: number;
  harmless: number;
  total: number;
}

/**
 * Normalize VT URL/analysis report attributes into a compact scan summary.
 */
export function summarizeVirusTotalUrlReport(
  report: VirusTotalReportResponse,
  fallbackReportUrl?: string
): VirusTotalScanSummary | null {
  const attrs = report?.data?.attributes;
  if (!attrs) return null;
  const stats = attrs.last_analysis_stats || attrs.stats;
  if (!stats) return null;

  const malicious = stats.malicious || 0;
  const suspicious = stats.suspicious || 0;
  const harmless = stats.harmless || 0;
  const undetected = stats.undetected || 0;
  const total = malicious + suspicious + harmless + undetected;

  const rawId = typeof report.data?.id === "string" ? report.data.id : "";
  // URL object ids are 64-char hex; analysis ids look like u-{hex}-{stamp} and must not be used in /gui/url/
  const urlObjectId = /^[a-f0-9]{64}$/i.test(rawId) ? rawId : null;
  const reportUrl =
    fallbackReportUrl ||
    (urlObjectId
      ? `https://www.virustotal.com/gui/url/${urlObjectId}/detection`
      : "");

  if (!reportUrl) return null;

  return {
    reportUrl,
    malicious,
    suspicious,
    harmless,
    total,
  };
}

/**
 * Submit a URL to VirusTotal for scanning
 * @param url The URL to scan
 * @param apiKey VirusTotal API key
 * @returns Analysis ID for retrieving results
 */
export async function scanUrl(
  url: string,
  apiKey: string
): Promise<{ success: boolean; analysisId?: string; error?: string }> {
  try {
    const response = await fetch("https://www.virustotal.com/api/v3/urls", {
      method: "POST",
      headers: {
        "x-apikey": apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ url }),
    });

    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = { status: response.status };
      }
      safeLog.error("VirusTotal scanUrl API error:", errorData);
      return {
        success: false,
        error: VT_PUBLIC_ERRORS.scanFailed,
      };
    }

    const data = (await response.json()) as VirusTotalScanResponse;
    // Extract analysis ID from the self link
    const analysisId = data.data.id;
    return { success: true, analysisId };
  } catch (error) {
    safeLog.error("VirusTotal scanUrl unexpected error:", error);
    return {
      success: false,
      error: VT_PUBLIC_ERRORS.unexpected,
    };
  }
}

/**
 * Get scan results from VirusTotal
 * @param analysisId The analysis ID from scanUrl
 * @param apiKey VirusTotal API key
 * @returns Scan report with detection results
 */
export async function getScanReport(
  analysisId: string,
  apiKey: string
): Promise<{ success: boolean; report?: VirusTotalReportResponse; error?: string }> {
  try {
    // The analysis ID is already a base64 URL, but we need to use it directly
    const response = await fetch(
      `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
      {
        method: "GET",
        headers: {
          "x-apikey": apiKey,
        },
      }
    );

    if (!response.ok) {
      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = { status: response.status };
      }
      safeLog.error("VirusTotal getScanReport API error:", errorData);
      return {
        success: false,
        error: VT_PUBLIC_ERRORS.reportFailed,
      };
    }

    const data = (await response.json()) as VirusTotalReportResponse;
    return { success: true, report: data };
  } catch (error) {
    safeLog.error("VirusTotal getScanReport unexpected error:", error);
    return {
      success: false,
      error: VT_PUBLIC_ERRORS.unexpected,
    };
  }
}

/**
 * Get URL report directly (if URL was scanned before)
 * @param url The URL to check
 * @param apiKey VirusTotal API key
 * @returns URL report if available
 */
export async function getUrlReport(
  url: string,
  apiKey: string
): Promise<{ success: boolean; report?: VirusTotalReportResponse; error?: string }> {
  try {
    const urlId = virusTotalApiUrlIdentifier(url.trim());

    const response = await fetch(
      `https://www.virustotal.com/api/v3/urls/${urlId}`,
      {
        method: "GET",
        headers: {
          "x-apikey": apiKey,
        },
      }
    );

    if (!response.ok) {
      // If URL not found (404), it means it hasn't been scanned before
      if (response.status === 404) {
        return {
          success: false,
          error: VT_URL_NOT_FOUND,
        };
      }

      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = { status: response.status };
      }
      safeLog.error("VirusTotal getUrlReport API error:", errorData);
      return {
        success: false,
        error: VT_PUBLIC_ERRORS.checkFailed,
      };
    }

    const data = (await response.json()) as VirusTotalReportResponse;
    return { success: true, report: data };
  } catch (error) {
    safeLog.error("VirusTotal getUrlReport unexpected error:", error);
    return {
      success: false,
      error: VT_PUBLIC_ERRORS.unexpected,
    };
  }
}

