import { createHash } from "crypto";

/**
 * VirusTotal API Integration
 * Free tier: 500 requests/day, 4 requests/minute
 */

/**
 * Path segment for GET /v3/urls/{url_id} — URL-safe base64 (no padding) of the **raw SHA-256 digest**
 * of the UTF-8 URL string (not base64 of the URL itself). See VirusTotal API v3 docs.
 */
export function virusTotalApiUrlIdentifier(canonicalUrl: string): string {
  const digest = createHash("sha256").update(canonicalUrl, "utf8").digest();
  return digest
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
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
      const errorData = (await response.json()) as VirusTotalError;
      return {
        success: false,
        error: errorData.error?.message || `HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as VirusTotalScanResponse;
    // Extract analysis ID from the self link
    const analysisId = data.data.id;
    return { success: true, analysisId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
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
      const errorData = (await response.json()) as VirusTotalError;
      return {
        success: false,
        error: errorData.error?.message || `HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as VirusTotalReportResponse;
    return { success: true, report: data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
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
          error: "URL not found in VirusTotal database",
        };
      }
      
      const errorData = (await response.json()) as VirusTotalError;
      return {
        success: false,
        error: errorData.error?.message || `HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as VirusTotalReportResponse;
    return { success: true, report: data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

