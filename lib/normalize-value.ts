/**
 * Normalized comparison for "same value" validation and dashboard indicators.
 * Treats values as equivalent when they differ only by case, trimming, or spaces
 * (e.g. "FASA Studios" vs "FASAStudios" vs "fasa studios").
 */

/**
 * Normalize a string for comparison: trim, lowercase, collapse multiple spaces to one.
 */
export function normalizeStringForComparison(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Normalize a string with all spaces removed (catches "FASA Studios" vs "FASAStudios").
 */
export function normalizeStringNoSpaces(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

/**
 * Two strings are effectively the same if they match after normalization
 * or after removing spaces (so "FASA Studios" and "FASAStudios" match).
 */
export function stringsAreEffectivelySame(a: string, b: string): boolean {
  if (a === b) return true;
  const aNorm = normalizeStringForComparison(a);
  const bNorm = normalizeStringForComparison(b);
  if (aNorm === bNorm) return true;
  const aNoSpaces = normalizeStringNoSpaces(a);
  const bNoSpaces = normalizeStringNoSpaces(b);
  return aNoSpaces === bNoSpaces;
}

/**
 * Compare two values (string, number, boolean, array, null/undefined).
 * Returns true if they represent the same content after normalization.
 */
export function valuesAreEffectivelySame(
  a: unknown,
  b: unknown
): boolean {
  // Strict equality first
  if (a === b) return true;

  // Both null/undefined/empty string
  const aEmpty = a === null || a === undefined || a === "";
  const bEmpty = b === null || b === undefined || b === "";
  if (aEmpty && bEmpty) return true;
  if (aEmpty || bEmpty) return false;

  // Strings
  if (typeof a === "string" && typeof b === "string") {
    return stringsAreEffectivelySame(a, b);
  }

  // Arrays (e.g. platforms, genres)
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    const aNorm = a.map((item) =>
      typeof item === "string" ? normalizeStringForComparison(item) : String(item)
    ).sort();
    const bNorm = b.map((item) =>
      typeof item === "string" ? normalizeStringForComparison(item) : String(item)
    ).sort();
    return aNorm.every((val, i) => val === bNorm[i]);
  }

  // Numbers, booleans, other: strict equality only
  return false;
}
