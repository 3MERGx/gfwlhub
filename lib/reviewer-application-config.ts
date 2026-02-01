/**
 * Configuration for reviewer application eligibility requirements
 * These can be overridden via environment variables
 *
 * SECURITY NOTE: These values are used server-side for validation.
 * Client-side display of these values is for UX only - actual validation
 * happens in the API routes (e.g., /api/reviewer-application/route.ts)
 * which call userEligibleForReviewer() server-side. Users cannot bypass
 * these requirements by modifying client-side code.
 */

export const REVIEWER_APPLICATION_CONFIG = {
  MIN_CORRECTIONS_SUBMITTED: parseInt(
    process.env.MIN_CORRECTIONS_SUBMITTED || "20",
    10
  ),
  MIN_CORRECTIONS_ACCEPTED: parseInt(
    process.env.MIN_CORRECTIONS_ACCEPTED || "10",
    10
  ),
  MIN_ACCOUNT_AGE_DAYS: parseInt(process.env.MIN_ACCOUNT_AGE_DAYS || "7", 10),
  // Cooldown period after rejection before user can re-apply (in days)
  REAPPLICATION_COOLDOWN_DAYS: parseInt(
    process.env.REAPPLICATION_COOLDOWN_DAYS || "30",
    10
  ),
  // Minimum approval rate (0–1) among reviewed corrections to be eligible
  MIN_APPROVAL_RATE: parseFloat(
    process.env.MIN_APPROVAL_RATE || "0.8"
  ),
} as const;
