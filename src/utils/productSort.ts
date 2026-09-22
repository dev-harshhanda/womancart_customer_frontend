export const SORT_ID_NEW_ARRIVALS = 1;
export const SORT_ID_PRICE_HIGH_TO_LOW = 2;
export const SORT_ID_PRICE_LOW_TO_HIGH = 3;
export const SORT_ID_HIGHLY_RATED = 4;
export const SORT_ID_DISCOUNT_HIGH_TO_LOW = 6;
export const SORT_ID_BEST_SELLING = 7;

function readPriceFields(source: any, fallback?: any) {
  const priceNode = source?.price;
  const priceObj =
    priceNode != null &&
    typeof priceNode === "object" &&
    !Array.isArray(priceNode)
      ? priceNode
      : null;

  const storePrice = Number(
    priceObj?.store_price ??
      priceObj?.selling_price ??
      (typeof priceNode === "number" || typeof priceNode === "string"
        ? priceNode
        : undefined) ??
      source?.store_price ??
      source?.selling_price ??
      fallback?.price?.store_price,
  );

  const mrp = Number(
    priceObj?.mrp ?? source?.mrp ?? fallback?.price?.mrp,
  );

  let percentageOff = Number(
    priceObj?.percentage_off ??
      source?.percentage_off ??
      fallback?.price?.percentage_off,
  );

  if (
    (!Number.isFinite(percentageOff) || percentageOff <= 0) &&
    Number.isFinite(storePrice) &&
    Number.isFinite(mrp) &&
    mrp > 0 &&
    storePrice < mrp
  ) {
    percentageOff = Math.round(((mrp - storePrice) / mrp) * 100);
  }

  return {
    storePrice: Number.isFinite(storePrice) ? storePrice : 0,
    mrp: Number.isFinite(mrp) ? mrp : 0,
    percentageOff: Number.isFinite(percentageOff) ? percentageOff : 0,
  };
}

/** Listing discount from API `price.percentage_off` (primary), with safe fallbacks. */
export function getProductDiscountPercent(product: any): number {
  const apiPercentageOff = Number(product?.price?.percentage_off);
  if (Number.isFinite(apiPercentageOff)) {
    return apiPercentageOff;
  }

  const fromProduct = readPriceFields(product).percentageOff;
  if (fromProduct > 0) return fromProduct;

  const fallback = Number(
    product?.discount ??
      product?.discount_percent ??
      product?.percentage_off ??
      0,
  );
  return Number.isFinite(fallback) ? fallback : 0;
}

function getProductPriceValue(product: any): number {
  const { storePrice, mrp } = readPriceFields(product);
  if (storePrice > 0) return storePrice;
  return mrp;
}

function getProductRatingValue(product: any): number {
  const rawRating = product?.average_rating ?? product?.rating ?? 0;
  const ratingNumber = Number(rawRating);
  return Number.isFinite(ratingNumber) ? ratingNumber : 0;
}

function getProductIdValue(product: any): number {
  const id = product?.product_id ?? product?.id ?? 0;
  const idNumber = Number(id);
  return Number.isFinite(idNumber) ? idNumber : 0;
}

export function sortProductsByDiscountHighToLow<T extends Record<string, any>>(
  products: T[],
): T[] {
  if (!Array.isArray(products) || products.length <= 1) {
    return Array.isArray(products) ? [...products] : [];
  }

  return [...products].sort((a, b) => {
    const discountDiff =
      getProductDiscountPercent(b) - getProductDiscountPercent(a);
    if (discountDiff !== 0) return discountDiff;
    return getProductIdValue(b) - getProductIdValue(a);
  });
}

export function compareProductsBySortId(a: any, b: any, sortId: number): number {
  const normalizedSortId = Number(sortId);

  switch (normalizedSortId) {
    case SORT_ID_PRICE_HIGH_TO_LOW:
      return getProductPriceValue(b) - getProductPriceValue(a);
    case SORT_ID_PRICE_LOW_TO_HIGH:
      return getProductPriceValue(a) - getProductPriceValue(b);
    case SORT_ID_HIGHLY_RATED:
      return getProductRatingValue(b) - getProductRatingValue(a);
    case SORT_ID_DISCOUNT_HIGH_TO_LOW: {
      const discountDiff =
        getProductDiscountPercent(b) - getProductDiscountPercent(a);
      if (discountDiff !== 0) return discountDiff;
      return getProductIdValue(b) - getProductIdValue(a);
    }
    case SORT_ID_NEW_ARRIVALS:
    default: {
      const newScore = (Number(b.is_new) || 0) - (Number(a.is_new) || 0);
      if (newScore !== 0) return newScore;
      return getProductIdValue(b) - getProductIdValue(a);
    }
  }
}

export function sortProductsBySortId<T extends Record<string, any>>(
  products: T[],
  sortId: number,
): T[] {
  if (Number(sortId) === SORT_ID_DISCOUNT_HIGH_TO_LOW) {
    return sortProductsByDiscountHighToLow(products);
  }

  if (!Array.isArray(products) || products.length <= 1) {
    return Array.isArray(products) ? [...products] : [];
  }

  return [...products].sort((a, b) =>
    compareProductsBySortId(a, b, Number(sortId)),
  );
}

export function isDiscountHighToLowSort(sortId: number | string | null | undefined) {
  return Number(sortId) === SORT_ID_DISCOUNT_HIGH_TO_LOW;
}
