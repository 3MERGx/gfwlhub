"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ReviewButtonProps = {
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

function ReviewButton({
  className,
  type = "button",
  children,
  ...props
}: ReviewButtonProps) {
  return (
    <button type={type} className={className} {...props}>
      {children}
    </button>
  );
}

export function ReviewApproveButton({
  className = "",
  ...props
}: ReviewButtonProps) {
  return (
    <ReviewButton className={`review-btn review-btn-primary ${className}`} {...props} />
  );
}

export function ReviewRejectButton({
  className = "",
  ...props
}: ReviewButtonProps) {
  return (
    <ReviewButton className={`review-btn review-btn-danger ${className}`} {...props} />
  );
}

export function ReviewGhostButton({
  className = "",
  ...props
}: ReviewButtonProps) {
  return (
    <ReviewButton className={`review-btn review-btn-ghost ${className}`} {...props} />
  );
}
