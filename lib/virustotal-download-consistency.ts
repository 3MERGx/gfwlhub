import { createHash } from "crypto";

const VT_GUI_URL =
  /^https?:\/\/(www\.)?virustotal\.com\/gui\/url\/([^/?#]+)/i;
const VT_GUI_FILE =
  /^https?:\/\/(www\.)?virustotal\.com\/gui\/file\/([^/?#]+)/i;

export type VirusTotalDownloadValidation =
  | { ok: true }
  | { ok: true; warning: string }
  | { ok: false; message: string };

function sha256HexOfString(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** VirusTotal API `/urls/{id}` uses URL-safe base64 (no padding) of the raw SHA-256 digest bytes. */
function sha256DigestBase64Url(value: string): string {
  const digest = createHash("sha256").update(value, "utf8").digest();
  return digest
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * VirusTotal may fingerprint slightly different spellings of the same resource.
 * Try a small set of candidates derived from the stored download URL.
 */
/** Canonical VirusTotal GUI link for a **URL scan** of this exact address (matches VT website `/gui/url/{sha256hex}`). */
export function buildVirusTotalGuiUrlForUrlScan(canonicalUrl: string): string {
  const hex = createHash("sha256")
    .update(canonicalUrl.trim(), "utf8")
    .digest("hex");
  return `https://www.virustotal.com/gui/url/${hex}/detection`;
}

export function virusTotalUrlCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  const out = new Set<string>();
  if (!trimmed) return [];

  out.add(trimmed);

  try {
    const parsed = new URL(trimmed);
    out.add(parsed.href);
    const decodedPath = decodeURIComponent(parsed.pathname);
    if (decodedPath !== parsed.pathname) {
      out.add(`${parsed.origin}${decodedPath}${parsed.search}${parsed.hash}`);
    }
  } catch {
    /* leave single candidate */
  }

  return [...out];
}

/**
 * Ensures a pasted VirusTotal **URL scan** (/gui/url/...) corresponds to the download link.
 * Blocks mismatched "clean" reports for unrelated URLs.
 *
 * **File reports** (/gui/file/...) cannot be tied to a URL without downloading the file;
 * those return ok + a warning so reviewers can still save scans of installers when URL scans are unavailable.
 */
export function validateDownloadLinkMatchesVirusTotalGui(
  downloadLink: string | undefined | null,
  virusTotalUrl: string | undefined | null
): VirusTotalDownloadValidation {
  const dl =
    typeof downloadLink === "string" ? downloadLink.trim() : "";
  const vt =
    typeof virusTotalUrl === "string" ? virusTotalUrl.trim() : "";

  if (!vt) {
    return { ok: true };
  }

  if (!dl) {
    return {
      ok: false,
      message:
        "A VirusTotal URL is set but the download link is missing. Add the matching download URL or clear the VirusTotal field.",
    };
  }

  const fileMatch = vt.match(VT_GUI_FILE);
  if (fileMatch) {
    const token = fileMatch[2];
    if (/^[a-f0-9]{64}$/i.test(token)) {
      return {
        ok: true,
        warning:
          "VirusTotal link is a file (/gui/file/) report. This cannot be automatically matched to the download URL—use a URL scan (/gui/url/) targeting the exact download address when possible.",
      };
    }
    return {
      ok: false,
      message: "Unrecognized VirusTotal file report link format.",
    };
  }

  const urlMatch = vt.match(VT_GUI_URL);
  if (!urlMatch) {
    return {
      ok: false,
      message:
        "VirusTotal URL must be a standard report (virustotal.com/gui/url/... or .../gui/file/...).",
    };
  }

  const reportToken = urlMatch[2];
  const candidates = virusTotalUrlCandidates(dl);
  if (candidates.length === 0) {
    return { ok: false, message: "Download link is not a valid URL." };
  }

  const tokenLower = reportToken.toLowerCase();

  for (const candidate of candidates) {
    if (sha256HexOfString(candidate) === tokenLower) {
      return { ok: true };
    }
    if (sha256DigestBase64Url(candidate) === reportToken) {
      return { ok: true };
    }
  }

  return {
    ok: false,
    message:
      "The VirusTotal URL scan does not match this download link. Open VirusTotal, scan the exact download URL, and paste that report so users are not misled by results for a different address.",
  };
}
