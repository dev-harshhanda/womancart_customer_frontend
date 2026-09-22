/**
 * Client-side sessionStorage helper for slug → numeric ID mappings.
 *
 * When URL builders generate clean URLs (no ?category_id=, ?product_id=, etc.)
 * they persist the slug→ID mapping here so that destination pages can resolve
 * the numeric ID needed by the backend API without exposing it in the URL bar.
 *
 * Data lives in sessionStorage:
 *   • Preserved on page refresh within the same tab.
 *   • Cleared when the user opens a new tab (sessionStorage is per-tab).
 *
 * Pages have additional fallbacks (category tree lookup, brand list lookup,
 * search API) for cases where the mapping is not yet cached (e.g. a
 * bookmarked or directly-shared URL opened in a fresh tab).
 */

const STORE_KEY_PREFIX = "wc_idmap";
export type IdType = "category" | "brand" | "product" | "kit";

function storeKey(type: IdType): string {
  return `${STORE_KEY_PREFIX}:${type}`;
}

/**
 * Persist a slug → id mapping.
 * Safe to call on the server (no-op when window is unavailable).
 */
export function saveSlugId(
  type: IdType,
  slug: string,
  id: string | number,
): void {
  if (
    typeof window === "undefined" ||
    !slug ||
    id === undefined ||
    id === null ||
    id === ""
  )
    return;
  try {
    const key = storeKey(type);
    const map: Record<string, string> = JSON.parse(
      sessionStorage.getItem(key) ?? "{}",
    );
    map[slug] = String(id);
    sessionStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* ignore – storage may be full or unavailable */
  }
}

/**
 * Look up a previously stored slug → id mapping.
 * Returns null when not found or on the server.
 */
export function lookupSlugId(type: IdType, slug: string): string | null {
  if (typeof window === "undefined" || !slug) return null;
  try {
    const key = storeKey(type);
    const map: Record<string, string> = JSON.parse(
      sessionStorage.getItem(key) ?? "{}",
    );
    return map[slug] ?? null;
  } catch {
    return null;
  }
}
