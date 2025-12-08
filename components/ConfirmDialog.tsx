"use client";

import { useEffect, useRef } from "react";
import { FaExclamationTriangle, FaTimes } from "react-icons/fa";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      // Focus the dialog
      const firstFocusable = dialogRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      firstFocusable?.focus();
    } else {
      // Restore focus when dialog closes
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter" && e.target === dialogRef.current) {
        onConfirm();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onConfirm, onCancel]);

  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      confirm: "bg-red-600 hover:bg-red-700 text-white",
      icon: "text-red-500",
      border: "border-red-500/30",
    },
    warning: {
      confirm: "bg-yellow-600 hover:bg-yellow-700 text-white",
      icon: "text-yellow-500",
      border: "border-yellow-500/30",
    },
    info: {
      confirm: "bg-blue-600 hover:bg-blue-700 text-white",
      icon: "text-blue-500",
      border: "border-blue-500/30",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div
        ref={dialogRef}
        className={`bg-[rgb(var(--bg-card))] rounded-lg max-w-md w-full border ${styles.border} shadow-xl`}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[rgb(var(--border-color))]">
          <div className="flex items-center gap-3">
            <FaExclamationTriangle className={styles.icon} size={20} />
            <h3
              id="confirm-dialog-title"
              className="text-lg font-bold text-[rgb(var(--text-primary))]"
            >
              {title}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] transition-colors p-1"
            aria-label="Close dialog"
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p
            id="confirm-dialog-message"
            className="text-[rgb(var(--text-secondary))]"
          >
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-[rgb(var(--border-color))]">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-[rgb(var(--bg-card-alt))] hover:bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] rounded-lg border border-[rgb(var(--border-color))] transition-colors"
            aria-label={cancelText}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg transition-colors ${styles.confirm}`}
            aria-label={confirmText}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

