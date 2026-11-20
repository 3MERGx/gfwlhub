import { NextResponse } from "next/server";
import { safeLog } from "@/lib/security";
import type { ApiErrorBody } from "@/types/api";

export const INTERNAL_ERROR_MESSAGE = "Internal server error";

/**
 * Return a JSON error body with a stable, user-safe message.
 */
export function jsonError(
  message: string,
  status: number
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Log the full error server-side and return a generic 500 to the client.
 * Never pass error.message, stack traces, or third-party bodies to the client.
 */
export function internalError(
  context: string,
  error: unknown
): NextResponse<ApiErrorBody> {
  safeLog.error(context, error);
  return jsonError(INTERNAL_ERROR_MESSAGE, 500);
}
