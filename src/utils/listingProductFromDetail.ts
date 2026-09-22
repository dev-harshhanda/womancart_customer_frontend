import type { Product } from "@/types/General";

/**
 * Map product-detail API payload into the shape ProductCard / listing expects.
 * Used to restore fully out-of-stock products that viewAllProduct omits.
 */
export function mapProductDetailToListingProduct(detail: any): Product | null {
  if (!detail || typeof detail !== "object") return null;

  const productId =
    detail.product_id ??
    detail.productId ??
    detail.id ??
    detail?.product?.product_id ??
    detail?.product?.id ??
    null;
  if (productId == null || productId === "") return null;

  const variations = Array.isArray(detail.variations)
    ? detail.variations
    : Array.isArray(detail?.product?.variations)
      ? detail.product.variations
      : [];

  const qtyFromVariations = variations.reduce((sum: number, v: any) => {
    const q = Number(v?.stock_quantity ?? v?.stockQuantity ?? 0);
    return sum + (Number.isFinite(q) && q > 0 ? q : 0);
  }, 0);

  const qtyAvailable = Number(
    detail.qty_available ??
      detail.stock_quantity ??
      detail.stockQuantity ??
      qtyFromVariations ??
      0,
  );

  const image =
    detail.image ||
    detail.primary_image ||
    detail.image_url ||
    detail?.product?.image ||
    detail?.product?.primary_image ||
    (Array.isArray(detail.images) ? detail.images[0] : null) ||
    "/images/product_default.png";

  const price =
    detail.price ??
    detail?.product?.price ??
    variations.find((v: any) => v?.is_default === 1)?.price ??
    variations[0]?.price ??
    null;

  return {
    ...detail,
    product_id: productId,
    product_name:
      detail.product_name ||
      detail.name ||
      detail.title ||
      detail?.product?.product_name ||
      detail?.product?.name ||
      "",
    name:
      detail.name ||
      detail.product_name ||
      detail.title ||
      detail?.product?.name ||
      "",
    slug: detail.slug || detail?.product?.slug || "",
    qty_available: Number.isFinite(qtyAvailable) ? qtyAvailable : 0,
    image,
    primary_image: detail.primary_image || image,
    price,
    brand: detail.brand ?? detail?.product?.brand,
    variations,
    average_rating: detail.average_rating ?? detail.rating ?? 0,
    review_count: detail.review_count ?? detail.reviews ?? 0,
    is_wishlist: detail.is_wishlist ?? false,
    status: detail.status !== false,
  } as Product;
}
