"use client";

import { memo, type ReactNode } from "react";

interface DownloadLinkReviewProps {
  url: string;
  children?: ReactNode;
}

function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function DownloadLinkReview({ url, children }: DownloadLinkReviewProps) {
  const host = hostnameFromUrl(url);

  return (
    <div className="download-review">
      <div className="flex flex-wrap items-center gap-2">
        {host ? <span className="download-review-host">{host}</span> : null}
        <span className="text-xs text-[rgb(var(--text-muted))]">
          External download
        </span>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-[rgb(var(--color-primary))] hover:underline break-all"
      >
        {url}
      </a>
      {children}
    </div>
  );
}

export default memo(DownloadLinkReview);
