"use client";

import { useEffect, useId, useRef, useState } from "react";
import AnchoredPopover from "@/components/AnchoredPopover";

interface QueueCountItem {
  label: string;
  value: number;
  tone?: "default" | "warning" | "success" | "danger";
  /** Shown via (i) — use for jargon like Superseded, not obvious labels. */
  description?: string;
}

interface QueueCountsProps {
  items: QueueCountItem[];
}

const TONE_CLASS: Record<NonNullable<QueueCountItem["tone"]>, string> = {
  default: "text-[rgb(var(--text-primary))]",
  warning: "text-warning",
  success: "text-success",
  danger: "text-danger",
};

function StatHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 160);
  };

  useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      const popover = document.getElementById(tooltipId);
      if (rootRef.current && target && rootRef.current.contains(target)) {
        return;
      }
      if (popover && target && popover.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
    };
  }, [open, tooltipId]);

  return (
    <span
      ref={rootRef}
      className="stat-info"
      onMouseEnter={() => {
        clearCloseTimer();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className="stat-info-btn"
        aria-label="What this means"
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onFocus={() => {
          clearCloseTimer();
          setOpen(true);
        }}
        onBlur={scheduleClose}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          clearCloseTimer();
          const pointerType =
            "pointerType" in event.nativeEvent
              ? event.nativeEvent.pointerType
              : "mouse";
          if (pointerType === "touch") {
            setOpen((current) => !current);
            return;
          }
          setOpen(true);
        }}
      >
        i
      </button>
      <AnchoredPopover
        open={open}
        anchorRef={rootRef}
        id={tooltipId}
        className="stat-info-tip-panel"
        onMouseEnter={() => {
          clearCloseTimer();
          setOpen(true);
        }}
        onMouseLeave={scheduleClose}
      >
        {text}
      </AnchoredPopover>
    </span>
  );
}

export default function QueueCounts({ items }: QueueCountsProps) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5">
      {items.map((item) => (
        <div key={item.label} className="min-w-[4.5rem]">
          <p className="dashboard-label mb-0.5 inline-flex items-center">
            {item.label}
            {item.description ? <StatHint text={item.description} /> : null}
          </p>
          <p
            className={`dashboard-stat-value text-lg ${TONE_CLASS[item.tone ?? "default"]}`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
