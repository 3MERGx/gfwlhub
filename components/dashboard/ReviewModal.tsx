"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { FaTimes } from "react-icons/fa";
import StatusPill from "@/components/dashboard/StatusPill";
import {
  formatReviewDateTime,
  formatReviewRelativeTime,
} from "@/lib/format-review-date";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleId?: string;
  descriptionId?: string;
  status?: string;
  submittedBy?: ReactNode;
  submittedAt?: Date | string | null;
  maxWidthClass?: string;
  closeOnEscape?: boolean;
  children: ReactNode;
  /** Review notes / errors. On small screens these sit in the scroll body. */
  notes?: ReactNode;
  /** Approve / reject / close. Always pinned. */
  actions?: ReactNode;
  /** Unsplit fallback (e.g. custom decision content). */
  decision?: ReactNode;
}

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function ReviewModal({
  isOpen,
  onClose,
  title,
  titleId,
  descriptionId,
  status,
  submittedBy,
  submittedAt,
  maxWidthClass = "max-w-5xl",
  closeOnEscape = true,
  children,
  notes,
  actions,
  decision,
}: ReviewModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const autoTitleId = useId();
  const headingId = titleId ?? autoTitleId;
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 1024px)").matches
      : false
  );

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const submittedAtDate =
    submittedAt != null ? new Date(submittedAt) : null;
  const submittedAtValid =
    submittedAtDate != null && !Number.isNaN(submittedAtDate.getTime());

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      previousFocusRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!closeOnEscape) return;
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((element) => !element.hasAttribute("disabled"));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  const handleOverlayClick = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) onClose();
    },
    [onClose]
  );

  const handlePanelKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape" && closeOnEscape) {
        event.stopPropagation();
      }
    },
    [closeOnEscape]
  );

  if (!isOpen) return null;

  return (
    <div className="review-modal-overlay" onClick={handleOverlayClick}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={`review-modal-panel ${maxWidthClass}`}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handlePanelKeyDown}
      >
        <header className="review-modal-header">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <h2
                id={headingId}
                className="text-base sm:text-lg font-semibold text-[rgb(var(--text-primary))] break-words pr-1"
              >
                {title}
              </h2>
              {status ? (
                <div className="pt-0.5">
                  <StatusPill status={status} />
                </div>
              ) : null}
            </div>
            {(submittedBy || submittedAtValid) && (
              <p className="mt-1 text-xs sm:text-sm text-[rgb(var(--text-secondary))] flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                {submittedBy}
                {submittedBy && submittedAtValid ? (
                  <span aria-hidden="true">·</span>
                ) : null}
                {submittedAtValid && submittedAtDate ? (
                  <time
                    dateTime={submittedAtDate.toISOString()}
                    title={formatReviewDateTime(submittedAtDate)}
                  >
                    {formatReviewRelativeTime(submittedAtDate)}
                  </time>
                ) : null}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="review-modal-close"
            aria-label="Close"
          >
            <FaTimes size={16} aria-hidden />
          </button>
        </header>

        <div className="review-modal-body">
          <div id={descriptionId} className="review-modal-content">
            {children}
            {notes && !isDesktop ? (
              <div className="review-modal-notes-mobile">{notes}</div>
            ) : null}
          </div>
          {actions || (notes && isDesktop) || decision ? (
            <aside className="review-modal-decision">
              {notes || actions ? (
                <>
                  {isDesktop ? (
                    <p className="review-modal-decision-label">Decision</p>
                  ) : null}
                  {notes && isDesktop ? (
                    <div className="review-modal-notes-desktop">{notes}</div>
                  ) : null}
                  {actions ? (
                    <div className="review-modal-actions">{actions}</div>
                  ) : null}
                </>
              ) : (
                decision
              )}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
