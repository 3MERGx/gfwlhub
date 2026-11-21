import type { ReactNode } from "react";

type StatusTone =
  | "pending"
  | "approved"
  | "rejected"
  | "modified"
  | "superseded"
  | "blocked"
  | "neutral";

const TONE_BY_STATUS: Record<string, StatusTone> = {
  pending: "pending",
  approved: "approved",
  modified: "modified",
  rejected: "rejected",
  blocked: "blocked",
  restricted: "pending",
  superseded: "superseded",
  enabled: "approved",
  disabled: "rejected",
  active: "approved",
  suspended: "pending",
};

interface StatusPillProps {
  status: string;
  label?: string;
  children?: ReactNode;
}

export default function StatusPill({ status, label, children }: StatusPillProps) {
  const tone = TONE_BY_STATUS[status] ?? "neutral";
  const text =
    children ??
    label ??
    `${status.charAt(0).toUpperCase()}${status.slice(1)}`;

  return <span className={`status-pill status-pill-${tone}`}>{text}</span>;
}
