export function formatReviewDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Compact relative time for review headers (full timestamp stays in title). */
export function formatReviewRelativeTime(date: Date | string): string {
  const then = new Date(date).getTime();
  if (Number.isNaN(then)) return "";

  const diffSec = Math.round((Date.now() - then) / 1000);
  const absSec = Math.abs(diffSec);
  const future = diffSec < 0;

  let label: string;
  if (absSec < 45) {
    return future ? "in a moment" : "just now";
  } else if (absSec < 90) {
    label = "1 min";
  } else if (absSec < 3600) {
    label = `${Math.round(absSec / 60)} min`;
  } else if (absSec < 5400) {
    label = "1 hour";
  } else if (absSec < 86400) {
    label = `${Math.round(absSec / 3600)} hours`;
  } else if (absSec < 172800) {
    label = "1 day";
  } else if (absSec < 2592000) {
    label = `${Math.round(absSec / 86400)} days`;
  } else {
    return formatReviewDateTime(date);
  }

  return future ? `in ${label}` : `${label} ago`;
}
