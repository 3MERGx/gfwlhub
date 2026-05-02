import { revalidatePath } from "next/cache";

/**
 * Invalidate Next.js cached routes that surface Games collection data for `slug`.
 * Call after MongoDB writes that change the game document for this slug.
 */
export function revalidateGameDerivedPaths(slug: string): void {
  const trimmed = slug.trim();
  if (!trimmed) return;

  revalidatePath(`/games/${trimmed}`);
  revalidatePath("/supported-games");
  revalidatePath("/api/games");
  revalidatePath(`/api/games/${trimmed}`);
}
