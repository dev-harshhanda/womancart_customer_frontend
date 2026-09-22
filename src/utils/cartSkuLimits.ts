import React from "react";
import toast from "react-hot-toast";

const MAX_QTY_IN_DROPDOWN = 10;

/**
 * Whether the purchasable SKU is available. Prefers API `in_stock` when present,
 * otherwise falls back to stock quantity fields (variant first, then product).
 */
export function isSkuInStock(
  selectedVariation: any | null | undefined,
  product: any | null | undefined,
): boolean {
  if (selectedVariation != null) {
    if (typeof selectedVariation.in_stock === "boolean") {
      return selectedVariation.in_stock;
    }
    const vq = Number(
      selectedVariation.stock_quantity ?? selectedVariation.stockQuantity ?? 0,
    );
    return Number.isFinite(vq) && vq > 0;
  }
  if (typeof product?.in_stock === "boolean") {
    return product.in_stock;
  }
  const pq = Number(
    product?.stock_quantity ??
      product?.stockQuantity ??
      product?.qty_available ??
      0,
  );
  return Number.isFinite(pq) && pq > 0;
}

/** Sum qty in cart for same product + variation (excludes free gifts). */
export function getCartQtyForProductSku(
  items: any[] | undefined,
  productId: number | string | null | undefined,
  variationId: number | string | null | undefined,
): number {
  if (!Array.isArray(items) || productId == null || productId === "") return 0;
  const pid = Number(productId);
  if (Number.isNaN(pid)) return 0;

  const vid =
    variationId !== null && variationId !== undefined && variationId !== ""
      ? Number(variationId)
      : null;
  const vidOk = vid !== null && !Number.isNaN(vid);

  let sum = 0;
  for (const item of items) {
    if (item?.is_free_gift === true || item?.is_free_gift === 1) continue;

    const product = item?.product;
    const variation = item?.variation;
    const itemPid = Number(
      product?.product_id ?? product?.id ?? item?.product_id ?? NaN,
    );
    if (Number.isNaN(itemPid) || itemPid !== pid) continue;

    const rawVid = variation?.id ?? item?.variation_id ?? null;
    const itemVid =
      rawVid !== null && rawVid !== undefined && rawVid !== ""
        ? Number(rawVid)
        : null;
    const itemVidOk = itemVid !== null && !Number.isNaN(itemVid);

    if (vidOk) {
      if (itemVidOk && itemVid === vid) {
        sum += Number(item?.qty ?? 0) || 0;
      }
    } else if (!itemVidOk) {
      sum += Number(item?.qty ?? 0) || 0;
    }
  }
  return sum;
}

/**
 * Max units allowed per SKU (min(stock, 10)), aligned with product detail & cart page.
 * When `selectedVariation` is null/undefined, uses product-level stock fields.
 */
export function getMaxUnitsPerSkuFromStock(
  selectedVariation: any | null | undefined,
  product: any | null | undefined,
): number {
  if (!isSkuInStock(selectedVariation, product)) {
    return 0;
  }
  const rawStock =
    selectedVariation != null
      ? selectedVariation?.stock_quantity ?? selectedVariation?.stockQuantity
      : product?.stock_quantity ??
        product?.stockQuantity ??
        product?.qty_available;

  if (rawStock === undefined || rawStock === null || rawStock === "") {
    return MAX_QTY_IN_DROPDOWN;
  }
  const n = Math.floor(Number(rawStock));
  if (!Number.isFinite(n) || n < 0) {
    return MAX_QTY_IN_DROPDOWN;
  }
  if (n === 0) {
    return 0;
  }
  return Math.min(n, MAX_QTY_IN_DROPDOWN);
}

export { MAX_QTY_IN_DROPDOWN };

/** Toast when user tries to add more than the allowed total for this SKU in cart. */
export function toastMaxQuantityInCart(maxQty: number) {
  const q = Math.max(0, Math.floor(Number(maxQty)) || 0);
  const message = `Max ${q} of this product — already in your cart.`;
  toast.custom(
    () =>
      React.createElement(
        "div",
        {
          role: "status",
          style: {
            background: "var(--commerce-primary, #d91b76)",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "12px",
            fontWeight: 600,
            fontSize: "14px",
            textAlign: "center",
            lineHeight: 1.35,
            maxWidth: "min(520px, calc(100vw - 32px))",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.12)",
          },
        },
        message,
      ),
    { duration: 4500, position: "top-center" },
  );
}
