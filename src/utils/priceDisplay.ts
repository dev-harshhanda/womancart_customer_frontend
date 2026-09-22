/**
 * Strikethrough MRP should only appear when MRP is strictly greater than the selling price.
 */
export function showMrpAsCutPrice(
  mrp: string | number | null | undefined,
  sellingPrice: string | number | null | undefined,
): boolean {
  const m = Number(mrp);
  const s = Number(sellingPrice);
  if (!Number.isFinite(m) || !Number.isFinite(s) || m <= 0) {
    return false;
  }
  return m > s;
}
