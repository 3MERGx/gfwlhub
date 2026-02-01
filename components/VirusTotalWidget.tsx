"use client";

import { FaExternalLinkAlt, FaShieldAlt } from "react-icons/fa";

interface VirusTotalWidgetProps {
  fileHash?: string;
  virusTotalUrl?: string;
}

export default function VirusTotalWidget({
  fileHash,
  virusTotalUrl,
}: VirusTotalWidgetProps) {
  // Use the provided URL if available, otherwise construct one from the hash
  const vtUrl =
    virusTotalUrl ||
    (fileHash
      ? `https://www.virustotal.com/gui/file/${fileHash}/detection`
      : "");

  if (!vtUrl) {
    return null;
  }

  return (
    <div className="bg-[rgb(var(--bg-card))] p-4 rounded-lg border border-[rgb(var(--border-color))]">
      <div className="flex items-center mb-3">
        <FaShieldAlt className="text-[#107c10] mr-2" size={20} />
        <h4 className="text-[rgb(var(--text-primary))] font-medium">VirusTotal Security Check</h4>
      </div>

      <p className="text-[rgb(var(--text-secondary))] text-sm mb-4">
        This file has been scanned with VirusTotal&apos;s multi-engine antivirus
        scanner. Check the results to ensure the file is safe before
        downloading.
      </p>

      <a
        href={vtUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center bg-[#107c10] hover:bg-[#0d6b0d] text-white px-4 py-2 rounded-md transition-colors text-sm focus:ring-2 focus:ring-[#107c10]/50 focus:outline-none"
        aria-label="View VirusTotal report (opens in new tab)"
      >
        View VirusTotal Report <FaExternalLinkAlt className="ml-2" size={14} />
      </a>
    </div>
  );
}
