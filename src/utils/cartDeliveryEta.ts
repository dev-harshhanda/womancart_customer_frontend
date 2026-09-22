const DELIVERY_ETA_KEYS = [
  "expected_delivery_date",
  "expected_delivery_time",
  "delivery_time",
  "delivery_eta",
  "arrival_time",
] as const;

function pickEtaFromRecord(record: unknown): string {
  if (!record || typeof record !== "object") return "";
  const r = record as Record<string, unknown>;
  for (const key of DELIVERY_ETA_KEYS) {
    const raw = r[key];
    if (raw == null) continue;
    const val = String(raw).trim();
    if (!val || val === "0" || val.toLowerCase() === "null") continue;
    return val;
  }
  return "";
}

/** Resolve arrival ETA from `GET node:/cart/list` response (cart-level, then line items). */
export function getCartDeliveryEtaLabel(cartData: unknown): string {
  const data = (cartData as { data?: unknown } | null | undefined)?.data;
  if (!data || typeof data !== "object") return "";

  const cartLevel = pickEtaFromRecord(data);
  if (cartLevel) return cartLevel;

  const items = Array.isArray((data as { items?: unknown[] }).items)
    ? (data as { items: unknown[] }).items
    : [];

  for (const item of items) {
    const sources = [
      item,
      (item as { item?: unknown })?.item,
      (item as { product?: unknown })?.product,
      (item as { variation?: unknown })?.variation,
    ];
    for (const source of sources) {
      const eta = pickEtaFromRecord(source);
      if (eta) return eta;
    }
  }

  return "";
}
