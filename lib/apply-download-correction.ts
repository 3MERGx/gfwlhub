import {
  buildVirusTotalGuiUrlForUrlScan,
  isDownloadLinkField,
  validateDownloadLinkMatchesVirusTotalGui,
  virusTotalFieldForDownloadField,
} from "@/lib/virustotal-download-consistency";
import { resolveVirusTotalGuiUrlForDownloadLink } from "@/lib/virustotal-resolve-download-scan";
import { rateLimiters, getClientIdentifier, safeLog } from "@/lib/security";
import type { Correction } from "@/types/crowdsource";

type ApplyDownloadResult =
  | {
      ok: true;
      downloadVtField: string | null;
      effectiveAutoVt?: string;
      vtWarning?: string;
    }
  | { ok: false; status: number; error: string };

/**
 * Resolve/validate VirusTotal pairing for download-link corrections.
 * Always stores the canonical GUI URL derived from the applied download URL
 * when a scan is available, so hash mismatches from analysis IDs can't block approve.
 */
export async function prepareDownloadVirusTotalForCorrection(options: {
  correction: Correction;
  valueToApply: unknown;
  isClearing: boolean;
  status: "approved" | "modified" | "rejected";
  request: Request;
  reviewerId: string;
  existingGame: Record<string, unknown>;
}): Promise<ApplyDownloadResult> {
  const {
    correction,
    valueToApply,
    isClearing,
    status,
    request,
    reviewerId,
    existingGame,
  } = options;

  const downloadVtField = isDownloadLinkField(correction.field)
    ? virusTotalFieldForDownloadField(correction.field)
    : null;

  if (!downloadVtField && correction.field !== "virusTotalUrl") {
    return { ok: true, downloadVtField: null };
  }

  let effectiveAutoVt: string | undefined =
    correction.autoVirusTotalUrl || correction.virusTotalScan?.reportUrl;

  if (
    isDownloadLinkField(correction.field) &&
    !isClearing &&
    typeof valueToApply === "string"
  ) {
    const appliedTrim = valueToApply.trim();
    if (/^https?:\/\//i.test(appliedTrim)) {
      const apiKey = process.env.VIRUSTOTAL_API_KEY;
      const submittedTrim = String(correction.newValue ?? "").trim();
      const mustRefreshVt =
        status === "modified" && appliedTrim !== submittedTrim;
      if (apiKey && (mustRefreshVt || !effectiveAutoVt)) {
        const vtIdentifier = getClientIdentifier(request, reviewerId);
        if (!rateLimiters.virusTotal.isAllowed(vtIdentifier)) {
          return {
            ok: false,
            status: 429,
            error:
              "Too many VirusTotal scans in a short period. Try again in a minute.",
          };
        }
        const resolved = await resolveVirusTotalGuiUrlForDownloadLink(
          appliedTrim,
          apiKey
        );
        if (!resolved.ok) {
          return { ok: false, status: 422, error: resolved.error };
        }
        effectiveAutoVt = resolved.guiUrl;
      }

      // Canonicalize: GUI URL must be the SHA-256 of the exact applied download URL.
      if (effectiveAutoVt || correction.virusTotalScan) {
        effectiveAutoVt = buildVirusTotalGuiUrlForUrlScan(appliedTrim);
      }
    }
  }

  const pairDownloadField = downloadVtField
    ? correction.field
    : "downloadLink";
  const pairVtField = downloadVtField || "virusTotalUrl";
  let mergedDownload = existingGame[pairDownloadField] as string | undefined;
  let mergedVt = existingGame[pairVtField] as string | undefined;

  if (isDownloadLinkField(correction.field)) {
    mergedDownload = isClearing
      ? undefined
      : typeof valueToApply === "string"
        ? valueToApply
        : String(valueToApply ?? "");
    if (!isClearing && effectiveAutoVt) {
      mergedVt = effectiveAutoVt;
    } else if (isClearing) {
      mergedVt = undefined;
    }
  }
  if (correction.field === "virusTotalUrl") {
    mergedVt = isClearing
      ? undefined
      : typeof valueToApply === "string"
        ? valueToApply
        : String(valueToApply ?? "");
  }

  const vtConsistency = validateDownloadLinkMatchesVirusTotalGui(
    mergedDownload,
    mergedVt
  );
  if (!vtConsistency.ok) {
    return { ok: false, status: 400, error: vtConsistency.message };
  }

  let vtWarning: string | undefined;
  if ("warning" in vtConsistency && vtConsistency.warning) {
    vtWarning = vtConsistency.warning;
    safeLog.warn(
      `[VT consistency] ${correction.gameSlug}: ${vtConsistency.warning}`
    );
  }

  return {
    ok: true,
    downloadVtField,
    effectiveAutoVt: isClearing ? undefined : effectiveAutoVt,
    vtWarning,
  };
}
