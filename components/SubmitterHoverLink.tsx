"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FaChartBar } from "react-icons/fa";

interface SubmitterStats {
  name: string;
  avatar?: string;
  submissionsCount?: number;
  approvedCount?: number;
  rejectedCount?: number;
  statsHidden?: boolean;
}

const statsCache = new Map<string, SubmitterStats>();

interface SubmitterHoverLinkProps {
  userId: string;
  name: string;
  className?: string;
}

export default function SubmitterHoverLink({
  userId,
  name,
  className = "",
}: SubmitterHoverLinkProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SubmitterStats | null>(
    () => statsCache.get(userId) || null
  );
  const [error, setError] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !userId) return;
    if (statsCache.has(userId)) {
      setStats(statsCache.get(userId) || null);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          if (!cancelled) {
            setError(
              response.status === 403
                ? "Profile is private"
                : "Could not load profile"
            );
          }
          return;
        }
        const data = await response.json();
        const next: SubmitterStats = {
          name: data.name || name,
          avatar: data.avatar,
          submissionsCount: data.submissionsCount,
          approvedCount: data.approvedCount,
          rejectedCount: data.rejectedCount,
          statsHidden:
            typeof data.submissionsCount !== "number" &&
            typeof data.approvedCount !== "number",
        };
        statsCache.set(userId, next);
        if (!cancelled) setStats(next);
      } catch {
        if (!cancelled) setError("Could not load profile");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, userId, name]);

  const reviewedCount =
    (stats?.approvedCount ?? 0) + (stats?.rejectedCount ?? 0);
  const approvalRate =
    reviewedCount > 0
      ? (((stats?.approvedCount ?? 0) / reviewedCount) * 100).toFixed(1)
      : null;

  return (
    <span
      ref={rootRef}
      className="relative inline-flex items-center gap-1"
      onMouseEnter={() => {
        clearCloseTimer();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        clearCloseTimer();
        setOpen(true);
      }}
      onBlur={scheduleClose}
    >
      <Link
        href={`/profile/${userId}`}
        className={`${className} text-blue-400 hover:text-blue-300 hover:underline transition-colors`}
        onClick={(event) => event.stopPropagation()}
      >
        {name}
      </Link>
      <button
        type="button"
        className="inline-flex min-h-[28px] min-w-[28px] items-center justify-center rounded text-[rgb(var(--text-muted))] hover:text-[#107c10] hover:bg-[rgb(var(--bg-card-alt))] transition-colors touch-manipulation md:hidden"
        aria-label={`Show stats for ${name}`}
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          clearCloseTimer();
          setOpen((prev) => !prev);
        }}
      >
        <FaChartBar size={12} />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 bottom-full mb-2 z-40 w-56 rounded-lg border border-[rgb(var(--border-color))] bg-[rgb(var(--bg-card))] p-3 shadow-xl"
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleClose}
        >
          {loading && !stats ? (
            <span className="block text-xs text-[rgb(var(--text-muted))]">
              Loading stats…
            </span>
          ) : error ? (
            <span className="block text-xs text-[rgb(var(--text-muted))]">
              {error}
            </span>
          ) : (
            <span className="block space-y-2">
              <span className="flex items-center gap-2">
                {stats?.avatar ? (
                  <Image
                    src={stats.avatar}
                    alt=""
                    width={28}
                    height={28}
                    className="rounded-full"
                    loading="lazy"
                    unoptimized
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgb(var(--bg-card-alt))] text-xs text-[rgb(var(--text-secondary))]">
                    {(stats?.name || name).charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="text-sm font-medium text-[rgb(var(--text-primary))] truncate">
                  {stats?.name || name}
                </span>
              </span>
              {stats?.statsHidden ? (
                <span className="block text-xs text-[rgb(var(--text-muted))]">
                  Submission stats are hidden
                </span>
              ) : (
                <span className="block space-y-1 text-xs text-[rgb(var(--text-secondary))]">
                  <span className="flex justify-between gap-2">
                    <span>Submissions</span>
                    <span className="text-[rgb(var(--text-primary))]">
                      {stats?.submissionsCount ?? 0}
                    </span>
                  </span>
                  <span className="flex justify-between gap-2">
                    <span>Approval rate</span>
                    <span className="text-[rgb(var(--text-primary))]">
                      {approvalRate !== null ? `${approvalRate}%` : "N/A"}
                    </span>
                  </span>
                  <span className="flex justify-between gap-2">
                    <span>Approved / Rejected</span>
                    <span className="text-[rgb(var(--text-primary))]">
                      {stats?.approvedCount ?? 0} / {stats?.rejectedCount ?? 0}
                    </span>
                  </span>
                </span>
              )}
              <Link
                href={`/profile/${userId}`}
                className="mt-1 block text-xs text-[#107c10] hover:underline md:hidden"
                onClick={(event) => event.stopPropagation()}
              >
                View full profile
              </Link>
            </span>
          )}
        </span>
      )}
    </span>
  );
}
