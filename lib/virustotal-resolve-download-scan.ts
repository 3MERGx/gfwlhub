import {
  getUrlReport,
  scanUrl,
  virusTotalApiUrlIdentifier,
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
      return {
        ok: false,
        error: `VirusTotal analysis poll failed (HTTP ${response.status})`,
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
        error: "VirusTotal analysis failed for this URL.",
      };
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return {
    ok: false,
    error:
      "Timed out waiting for VirusTotal to finish scanning this URL. Try again in a minute.",
  };
}

/**
 * Ensures the download URL exists in VirusTotal (submit scan if needed), then returns
 * the canonical GUI report link for that URL scan (derived from the same string VT uses).
 */
export async function resolveVirusTotalGuiUrlForDownloadLink(
  downloadUrl: string,
  apiKey: string
): Promise<{ ok: true; guiUrl: string } | { ok: false; error: string }> {
  const canonical = downloadUrl.trim();

  let existing = await getUrlReport(canonical, apiKey);

  if (!existing.success) {
    const isNotFound =
      existing.error === "URL not found in VirusTotal database";

    if (!isNotFound) {
      return {
        ok: false,
        error:
          existing.error ||
          "Could not look up this URL on VirusTotal. Try again later.",
      };
    }

    safeLog.log(
      `[VirusTotal] URL not in VT cache, submitting scan url_id=${virusTotalApiUrlIdentifier(canonical).slice(0, 12)}…`
    );

    const scan = await scanUrl(canonical, apiKey);
    if (!scan.success || !scan.analysisId) {
      return {
        ok: false,
        error:
          scan.error ||
          "VirusTotal refused to scan this URL (rate limit or invalid URL).",
      };
    }

    const polled = await pollAnalysisUntilComplete(scan.analysisId, apiKey);
    if (!polled.ok) {
      return { ok: false, error: polled.error };
    }

    existing = await getUrlReport(canonical, apiKey);
    if (!existing.success) {
      return {
        ok: false,
        error:
          existing.error ||
          "Scan finished but the URL report could not be loaded. Try again shortly.",
      };
    }
  }

  const guiUrl = buildVirusTotalGuiUrlForUrlScan(canonical);
  return { ok: true, guiUrl };
}
