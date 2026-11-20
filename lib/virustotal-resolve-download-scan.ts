import {
  getUrlReport,
  scanUrl,
  summarizeVirusTotalUrlReport,
  virusTotalApiUrlIdentifier,
  VT_URL_NOT_FOUND,
  type VirusTotalScanSummary,
} from "@/lib/virustotal";
import { buildVirusTotalGuiUrlForUrlScan } from "@/lib/virustotal-download-consistency";
import { safeLog } from "@/lib/security";

interface AnalysisPollJson {
  data?: {
    attributes?: {
      status?: string;
    };
  };
}

const POLL_INTERVAL_MS = 2000;
/** Keep under typical serverless HTTP limits; URL usually exists after one poll. */
const POLL_MAX_MS = 45000;

const VT_RESOLVE_PUBLIC_ERRORS = {
  lookupFailed: "Could not look up this URL on VirusTotal. Try again later.",
  scanRefused:
    "VirusTotal could not scan this URL right now. Try again in a minute.",
  pollFailed: "VirusTotal scan could not be completed. Try again later.",
  analysisFailed: "VirusTotal analysis failed for this URL.",
  timeout:
    "Timed out waiting for VirusTotal to finish scanning this URL. Try again in a minute.",
  reportMissing:
    "Scan finished but the URL report could not be loaded. Try again shortly.",
} as const;

async function pollAnalysisUntilComplete(
  analysisId: string,
  apiKey: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const deadline = Date.now() + POLL_MAX_MS;
  while (Date.now() < deadline) {
    const response = await fetch(
      `https://www.virustotal.com/api/v3/analyses/${encodeURIComponent(analysisId)}`,
      {
        method: "GET",
        headers: {
          "x-apikey": apiKey,
        },
      }
    );

    if (!response.ok) {
      safeLog.error("VirusTotal analysis poll failed:", {
        status: response.status,
        analysisId,
      });
      return {
        ok: false,
        error: VT_RESOLVE_PUBLIC_ERRORS.pollFailed,
      };
    }

    const json = (await response.json()) as AnalysisPollJson;
    const status = json.data?.attributes?.status;

    if (status === "completed") {
      return { ok: true };
    }
    if (status === "failure") {
      return {
        ok: false,
        error: VT_RESOLVE_PUBLIC_ERRORS.analysisFailed,
      };
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return {
    ok: false,
    error: VT_RESOLVE_PUBLIC_ERRORS.timeout,
  };
}

/**
 * Ensures the download URL exists in VirusTotal (submit scan if needed), then returns
 * the canonical GUI report link for that URL scan (derived from the same string VT uses).
 */
export async function resolveVirusTotalGuiUrlForDownloadLink(
  downloadUrl: string,
  apiKey: string
): Promise<
  | { ok: true; guiUrl: string; scan?: VirusTotalScanSummary }
  | { ok: false; error: string }
> {
  const canonical = downloadUrl.trim();

  let existing = await getUrlReport(canonical, apiKey);

  if (!existing.success) {
    const isNotFound = existing.error === VT_URL_NOT_FOUND;

    if (!isNotFound) {
      safeLog.error("VirusTotal URL lookup failed:", existing.error);
      return {
        ok: false,
        error: VT_RESOLVE_PUBLIC_ERRORS.lookupFailed,
      };
    }

    safeLog.log(
      `[VirusTotal] URL not in VT cache, submitting scan url_id=${virusTotalApiUrlIdentifier(canonical).slice(0, 12)}…`
    );

    const scan = await scanUrl(canonical, apiKey);
    if (!scan.success || !scan.analysisId) {
      safeLog.error("VirusTotal scan refused:", scan.error);
      return {
        ok: false,
        error: VT_RESOLVE_PUBLIC_ERRORS.scanRefused,
      };
    }

    const polled = await pollAnalysisUntilComplete(scan.analysisId, apiKey);
    if (!polled.ok) {
      return { ok: false, error: polled.error };
    }

    existing = await getUrlReport(canonical, apiKey);
    if (!existing.success) {
      safeLog.error("VirusTotal report missing after scan:", existing.error);
      return {
        ok: false,
        error: VT_RESOLVE_PUBLIC_ERRORS.reportMissing,
      };
    }
  }

  const guiUrl = buildVirusTotalGuiUrlForUrlScan(canonical);
  const scan = existing.report
    ? summarizeVirusTotalUrlReport(existing.report, guiUrl) || undefined
    : undefined;
  return { ok: true, guiUrl, scan };
}
