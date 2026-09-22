type BadgeFlag = boolean | number | string | null | undefined;

const isTruthyBadgeFlag = (value: BadgeFlag): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    if (["0", "false", "no", "off", "null", "undefined", "none"].includes(normalized)) {
      return false;
    }
    return true;
  }
  return false;
};

export const getProductBadgeLabel = (product: {
  best_seller?: BadgeFlag;
  bestseller?: BadgeFlag;
  featured?: BadgeFlag;
  is_featured?: BadgeFlag;
  is_new?: BadgeFlag;
  isNew?: BadgeFlag;
  new_arrival?: BadgeFlag;
}): string | null => {
  // Keep mobile priority: best_seller > featured > is_new
  if (isTruthyBadgeFlag(product?.best_seller) || isTruthyBadgeFlag(product?.bestseller)) {
    return "Best Seller";
  }
  if (isTruthyBadgeFlag(product?.featured) || isTruthyBadgeFlag(product?.is_featured)) {
    return "Featured";
  }
  if (
    isTruthyBadgeFlag(product?.is_new) ||
    isTruthyBadgeFlag(product?.isNew) ||
    isTruthyBadgeFlag(product?.new_arrival)
  ) {
    return "New Arrival";
  }
  return null;
};
