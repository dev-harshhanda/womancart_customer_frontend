declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}

export type GtmItem = {
  item_id?: string;
  item_name?: string;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  price?: number;
  quantity?: number;
};

function toStringOrUndefined(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

function toNumberOrUndefined(value: unknown): number | undefined {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function omitEmpty(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(omitEmpty);
  }
  if (value && typeof value === "object") {
    const cleaned: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (entry === undefined || entry === null || entry === "") continue;
      cleaned[key] = omitEmpty(entry);
    }
    return cleaned;
  }
  return value;
}

/** Every dataLayer push in the app must go through here (Phase 2 rule: no empty/undefined params). */
export function pushEvent(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...(omitEmpty(params) as Record<string, unknown>),
  });
}

/**
 * Maps the app's loosely-typed (mostly `any`) product/cart-line/order-line shapes
 * to the GA4 item object standard. Field names differ slightly between the PLP
 * (`Product` type), PDP (`pd`), and cart/order line items, so this reads every
 * known alias rather than assuming one shape.
 */
export function buildGtmItem(raw: any, overrides: Partial<GtmItem> = {}): GtmItem {
  const product = raw?.product ?? raw?.product_details ?? raw ?? {};
  const price = product?.price ?? raw?.price;

  return {
    item_id: toStringOrUndefined(
      product?.sku ?? product?.product_id ?? product?.id ?? raw?.product_id ?? raw?.sku,
    ),
    item_name: toStringOrUndefined(product?.product_name ?? product?.name),
    item_brand: toStringOrUndefined(product?.brand?.name),
    item_category: toStringOrUndefined(product?.category?.name),
    price: toNumberOrUndefined(
      price?.store_price ?? price?.final_price ?? product?.final_price ?? price,
    ),
    quantity: toNumberOrUndefined(raw?.qty ?? raw?.quantity) ?? 1,
    ...overrides,
  };
}

const FIRED_TRANSACTIONS_KEY = "gtmPurchaseFiredTransactionIds";

/** Phase 2 rule: `purchase` must fire exactly once per transaction_id. */
export function hasPurchaseFired(transactionId: string): boolean {
  if (typeof window === "undefined" || !transactionId) return false;
  try {
    const fired = JSON.parse(localStorage.getItem(FIRED_TRANSACTIONS_KEY) || "[]");
    return Array.isArray(fired) && fired.includes(transactionId);
  } catch {
    return false;
  }
}

export function markPurchaseFired(transactionId: string): void {
  if (typeof window === "undefined" || !transactionId) return;
  try {
    const fired = JSON.parse(localStorage.getItem(FIRED_TRANSACTIONS_KEY) || "[]");
    const updated = Array.isArray(fired) ? fired : [];
    if (!updated.includes(transactionId)) updated.push(transactionId);
    // Keep the list bounded; only recent transactions need de-dup protection.
    localStorage.setItem(FIRED_TRANSACTIONS_KEY, JSON.stringify(updated.slice(-50)));
  } catch {
    // Storage unavailable (private mode, quota) — worst case is a rare duplicate fire.
  }
}
