"use client";

import { FaShieldAlt, FaSpinner } from "react-icons/fa";
import { formatReviewDateTime } from "@/lib/format-review-date";
import type {
  CorrectionVirusTotalScan,
  GameDownloadLinkField,
} from "@/types/crowdsource";

export interface VirusTotalScanResult {
  url: string;
  malicious: number;
  harmless: number;
  suspicious: number;
  total: number;
  reportUrl?: string;
  scannedAt?: string;
  source?: "submit" | "review";
}

export function scanResultFromSaved(
  url: string,
  scan?: CorrectionVirusTotalScan | null,
  linkedReportUrl?: string
): VirusTotalScanResult | null {
  if (scan?.reportUrl) {
    return {
      url,
      malicious: scan.malicious || 0,
      harmless: scan.harmless || 0,
      suspicious: scan.suspicious || 0,
      total: scan.total || 0,
      reportUrl: scan.reportUrl,
      scannedAt: scan.scannedAt
        ? new Date(scan.scannedAt).toISOString()
        : undefined,
      source: scan.source,
    };
  }
  if (linkedReportUrl) {
    return {
      url,
      malicious: 0,
      harmless: 0,
      suspicious: 0,
      total: 0,
      reportUrl: linkedReportUrl,
      source: "submit",
    };
  }
  return null;
}

interface VirusTotalScanPanelProps {
  url: string;
  csrfToken: string | null;
  scanningUrl: string | null;
  setScanningUrl: (url: string | null) => void;
  scanResult: VirusTotalScanResult | null;
  setScanResult: (result: VirusTotalScanResult | null) => void;
  setError: (error: string) => void;
  correctionId?: string;
  gameSubmissionId?: string;
  field?: GameDownloadLinkField;
  onScanPersisted?: (scan: CorrectionVirusTotalScan) => void;
}

export default function VirusTotalScanPanel({
  url,
  csrfToken,
  scanningUrl,
  setScanningUrl,
  scanResult,
  setScanResult,
  setError,
  correctionId,
  gameSubmissionId,
  field,
  onScanPersisted,
}: VirusTotalScanPanelProps) {
  const activeResult =
    scanResult && scanResult.url === url ? scanResult : null;
  const flagged = activeResult
    ? activeResult.malicious + activeResult.suspicious
    : 0;
  const isClean = flagged === 0;
  const hasEngineCounts = Boolean(activeResult && activeResult.total > 0);

  const runScan = async () => {
    setScanningUrl(url);
    try {
      const response = await fetch("/api/virustotal/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        body: JSON.stringify({
          url,
          action: "scan",
          ...(correctionId ? { correctionId } : {}),
          ...(gameSubmissionId ? { gameSubmissionId } : {}),
          ...(field ? { field } : {}),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Failed to scan URL");
        return;
      }

      const scanData = await response.json();
      const persisted = scanData.virusTotalScan as
        | CorrectionVirusTotalScan
        | undefined;

      if (persisted?.reportUrl) {
        const next: VirusTotalScanResult = {
          url,
          malicious: persisted.malicious || 0,
          harmless: persisted.harmless || 0,
          suspicious: persisted.suspicious || 0,
          total: persisted.total || 0,
          reportUrl: persisted.reportUrl,
          scannedAt: persisted.scannedAt
            ? new Date(persisted.scannedAt).toISOString()
            : new Date().toISOString(),
          source: persisted.source || "review",
        };
        setScanResult(next);
        onScanPersisted?.(persisted);
        return;
      }

      if (scanData.report?.data?.attributes) {
        const attrs = scanData.report.data.attributes;
        const stats = attrs.last_analysis_stats || attrs.stats;

        if (!stats) {
          setError(
            "Scan results are not yet available. Please try again in a moment."
          );
          return;
        }

        const rawId =
          typeof scanData.report?.data?.id === "string"
            ? scanData.report.data.id
            : "";
        let reportId = /^[a-f0-9]{64}$/i.test(rawId) ? rawId : "";
        if (!reportId) {
          const digest = await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(url.trim())
          );
          reportId = Array.from(new Uint8Array(digest))
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
        }
        setScanResult({
          url,
          malicious: stats.malicious || 0,
          harmless: stats.harmless || 0,
          suspicious: stats.suspicious || 0,
          total:
            (stats.malicious || 0) +
            (stats.harmless || 0) +
            (stats.suspicious || 0) +
            (stats.undetected || 0),
          reportUrl: `https://www.virustotal.com/gui/url/${reportId}/detection`,
          scannedAt: new Date().toISOString(),
          source: "review",
        });
      } else if (scanData.analysisId) {
        setError(
          "Scan submitted but results not yet available. Please try again in a moment."
        );
      } else {
        setError("Unexpected response format from VirusTotal API");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan URL");
    } finally {
      setScanningUrl(null);
    }
  };

  return (
    <div className="pt-2 border-t border-[rgb(var(--border-color))]">
      <div className="flex items-center gap-2 mb-2">
        <FaShieldAlt className="text-blue-400" size={16} />
        <span className="text-sm font-medium text-[rgb(var(--text-primary))]">
          VirusTotal Security Scan
        </span>
      </div>
      {scanningUrl === url ? (
        <div className="flex items-center gap-2 text-sm text-[rgb(var(--text-secondary))]">
          <FaSpinner className="animate-spin" size={14} />
          <span>Scanning URL...</span>
        </div>
      ) : activeResult ? (
        <div
          className={`p-3 bg-[rgb(var(--bg-card-alt))] rounded-lg border-l-4 space-y-2 ${
            hasEngineCounts
              ? isClean
                ? "border-green-500"
                : "border-red-500"
              : "border-blue-500"
          }`}
        >
          <div className="space-y-1 text-sm">
            {hasEngineCounts ? (
              <>
                <p
                  className={`font-semibold ${
                    isClean ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {isClean
                    ? "No threats detected"
                    : `${flagged} of ${activeResult.total} engines flagged this URL`}
                </p>
                <p className="text-xs text-[rgb(var(--text-muted))]">
                  {activeResult.malicious} malicious ·{" "}
                  {activeResult.suspicious} suspicious
                  {activeResult.total > 0
                    ? ` · ${activeResult.total} engines checked`
                    : ""}
                </p>
              </>
            ) : (
              <p className="font-semibold text-blue-300">
                VirusTotal report already linked
              </p>
            )}
            {activeResult.scannedAt && (
              <p className="text-xs text-[rgb(var(--text-muted))]">
                Saved {formatReviewDateTime(activeResult.scannedAt)}
                {activeResult.source === "submit"
                  ? " (at submit)"
                  : activeResult.source === "review"
                    ? " (by reviewer)"
                    : ""}
              </p>
            )}
          </div>
          <div className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-500/30 rounded p-2">
            VirusTotal results are not a guarantee of safety. Proceed with
            caution.
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {activeResult.reportUrl && (
              <a
                href={activeResult.reportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline inline-block"
              >
                View full report on VirusTotal →
              </a>
            )}
            <button
              type="button"
              onClick={runScan}
              className="text-xs text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] underline"
            >
              {hasEngineCounts ? "Rescan" : "Load engine results"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={runScan}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
        >
          <FaShieldAlt size={12} />
          Scan URL with VirusTotal
        </button>
      )}
    </div>
  );
}
