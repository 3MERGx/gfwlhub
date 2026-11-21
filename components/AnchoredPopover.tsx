"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

interface AnchoredPopoverProps {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
  id?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const VIEW_MARGIN = 8;
const Z_INDEX = 80;

export default function AnchoredPopover({
  open,
  anchorRef,
  children,
  className,
  id,
  onMouseEnter,
  onMouseLeave,
}: AnchoredPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    maxWidth: number;
    maxHeight: number;
  } | null>(null);

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const rect = anchor.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxWidth = Math.max(160, viewportWidth - VIEW_MARGIN * 2);
    const maxHeight = Math.max(80, viewportHeight - VIEW_MARGIN * 2);

    const width = Math.min(popover.offsetWidth || maxWidth, maxWidth);
    const height = Math.min(popover.offsetHeight || 0, maxHeight);

    const spaceBelow = viewportHeight - rect.bottom - VIEW_MARGIN;
    const spaceAbove = rect.top - VIEW_MARGIN;
    const placeBelow = spaceBelow >= height || spaceBelow >= spaceAbove;

    let top = placeBelow
      ? rect.bottom + VIEW_MARGIN
      : rect.top - height - VIEW_MARGIN;
    top = Math.max(
      VIEW_MARGIN,
      Math.min(top, viewportHeight - height - VIEW_MARGIN)
    );

    let left = rect.left;
    if (left + width > viewportWidth - VIEW_MARGIN) {
      left = rect.right - width;
    }
    left = Math.max(
      VIEW_MARGIN,
      Math.min(left, viewportWidth - width - VIEW_MARGIN)
    );

    setCoords({ top, left, maxWidth, maxHeight });
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    place();
    const frame = window.requestAnimationFrame(place);
    const popover = popoverRef.current;
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => place())
        : null;
    if (popover) observer?.observe(popover);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place, children]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={popoverRef}
      id={id}
      role="tooltip"
      className={className}
      style={{
        position: "fixed",
        top: coords?.top ?? 0,
        left: coords?.left ?? 0,
        zIndex: Z_INDEX,
        maxWidth: coords?.maxWidth ?? "calc(100vw - 1rem)",
        maxHeight: coords?.maxHeight ?? "calc(100vh - 1rem)",
        overflow: "auto",
        visibility: coords ? "visible" : "hidden",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>,
    document.body
  );
}
