/**
 * Total units in cart: sum of each line's `qty` (defaults to 1 if missing).
 * Matches cart page "X Items in cart" / billing summaries.
 */
export function sumCartLineQuantities(items: unknown): number {
  if (!Array.isArray(items)) {
    return 0;
  }
  return items.reduce(
    (sum, item: { qty?: unknown }) => sum + (Number(item?.qty) || 1),
    0,
  );
}
