import type { ObjectId } from "mongodb";
import { toObjectId } from "@/lib/mongo-sanitize";
import { sanitizeString } from "@/lib/security";
import type { OAuthProvider } from "@/types/crowdsource";

export const OAUTH_PROVIDERS = ["github", "discord", "google"] as const;

export type SanitizedCorrectionValue = string | string[] | boolean | null;

/** Values a reviewer may apply when modifying a correction. */
export type ReviewFinalValue = string | number | boolean | string[] | null;

/**
 * Sanitize and convert a path/query/body id to a Mongo ObjectId.
 */
export function parseObjectIdParam(
  value: unknown,
  maxLength: number = 50
): ObjectId | null {
  return toObjectId(sanitizeString(String(value ?? ""), maxLength));
}

/**
 * Sanitize a string and require it to be one of the allowed values.
 */
export function parseEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  maxLength: number = 50
): T | null {
  const sanitized = sanitizeString(String(value ?? ""), maxLength);
  return (allowed as readonly string[]).includes(sanitized)
    ? (sanitized as T)
    : null;
}

export function parseOAuthProvider(value: unknown): OAuthProvider | null {
  return parseEnum(value, OAUTH_PROVIDERS, 20);
}

/**
 * Parse a pagination limit with default and max bounds.
 * Invalid or missing values return `defaultLimit`.
 */
export function parseClampedLimit(
  value: unknown,
  options?: { defaultLimit?: number; min?: number; max?: number }
): number {
  const defaultLimit = options?.defaultLimit ?? 100;
  const min = options?.min ?? 1;
  const max = options?.max ?? 1000;

  if (value === undefined || value === null || value === "") {
    return defaultLimit;
  }

  const parsed =
    typeof value === "number" ? value : parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < min) {
    return defaultLimit;
  }

  return Math.min(Math.floor(parsed), max);
}

/**
 * Parse an ISO/date string and require it to fall within [minMs, maxMs].
 * Defaults: 1 minute in the past through 2 years in the future.
 */
export function parseIsoDateInRange(
  value: unknown,
  options?: { minMs?: number; maxMs?: number }
): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const trimmed = sanitizeString(value, 40);
  const parsed = new Date(trimmed);
  const timestamp = parsed.getTime();
  if (Number.isNaN(timestamp)) {
    return null;
  }

  const now = Date.now();
  const minMs = options?.minMs ?? now - 60_000;
  const maxMs = options?.maxMs ?? now + 2 * 365 * 24 * 60 * 60 * 1000;
  if (timestamp < minMs || timestamp > maxMs) {
    return null;
  }

  return parsed;
}

/**
 * Type-check and sanitize a correction old/new value.
 * Rejects objects, numbers, and other unexpected types.
 */
export function sanitizeCorrectionValue(
  value: unknown,
  field: string
):
  | { ok: true; value: SanitizedCorrectionValue }
  | { ok: false; error: string } {
  if (value === undefined || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value === "string") {
    return { ok: true, value: sanitizeString(value, 5000) };
  }

  if (Array.isArray(value)) {
    return {
      ok: true,
      value: value
        .filter((item): item is string => typeof item === "string")
        .map((item) => sanitizeString(item, 500)),
    };
  }

  if (typeof value === "boolean" && field === "isUnplayable") {
    return { ok: true, value };
  }

  return { ok: false, error: "Invalid value type" };
}

/**
 * Type-check and sanitize a reviewer finalValue.
 * Accepts string | number | boolean | string[] | null; drops non-string array items.
 */
export function sanitizeReviewFinalValue(
  value: unknown
):
  | { ok: true; value: ReviewFinalValue | undefined }
  | { ok: false; error: string } {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (value === null) {
    return { ok: true, value: null };
  }

  if (typeof value === "string") {
    return { ok: true, value: sanitizeString(value, 5000) };
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return { ok: false, error: "Invalid finalValue type" };
    }
    return { ok: true, value };
  }

  if (typeof value === "boolean") {
    return { ok: true, value };
  }

  if (Array.isArray(value)) {
    return {
      ok: true,
      value: value
        .filter((item): item is string => typeof item === "string")
        .map((item) => sanitizeString(item, 500)),
    };
  }

  return { ok: false, error: "Invalid finalValue type" };
}
