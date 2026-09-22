/** Parse one gallery / media entry from common API shapes */
export function extractVariationImagePart(img: unknown): string {
  if (img == null) return "";
  if (typeof img === "string") return img.trim();
  const o = img as Record<string, unknown>;
  return String(
    o.image_url ??
      o.imageUrl ??
      o.url ??
      o.image ??
      o.src ??
      o.path ??
      o.file_url ??
      ""
  ).trim();
}

/** Images stored on attribute_option / attribute (common in list + detail APIs) */
function pushAttributeLevelImages(variant: Record<string, unknown>, push: (u: unknown) => void) {
  const attrs = Array.isArray(variant.variation_attributes)
    ? variant.variation_attributes
    : Array.isArray((variant as { attributes?: unknown }).attributes)
      ? ((variant as { attributes: unknown[] }).attributes as unknown[])
      : [];
  for (const attr of attrs) {
    if (!attr || typeof attr !== "object") continue;
    const a = attr as Record<string, unknown>;
    const opt = (a.attribute_option ?? a.attributeOption) as Record<string, unknown> | undefined;
    if (opt && typeof opt === "object") {
      push(opt.image);
      push(opt.image_url);
      push(opt.imageUrl);
      push(opt.thumbnail);
      push(opt.thumbnail_url);
      push(opt.thumbnailUrl);
      push(opt.swatch_image);
      push(opt.swatchImage);
      push(opt.product_image);
      push(opt.productImage);
      push(opt.featured_image);
      push(opt.featuredImage);
      push(opt.media);
      if (Array.isArray(opt.images)) {
        for (const item of opt.images) push(item);
      }
    }
    push(a.image);
    push(a.image_url);
    if (Array.isArray(a.media)) {
      for (const item of a.media) push(item);
    }
  }
}

/**
 * Product-level galleries sometimes include `variation_id` per image (list/home API).
 */
export function getProductImageUrlForVariationId(
  product: unknown,
  variationId: string | number | null | undefined
): string | null {
  if (product == null || variationId == null || variationId === "") return null;
  const vid = String(variationId);
  const p = product as Record<string, unknown>;
  const arrays = [
    p.gallery_images,
    p.galleryImages,
    p.images,
    p.product_images,
    p.media,
    p.variation_images,
    p.variationImages,
  ];
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (const entry of arr) {
      if (entry == null) continue;
      if (typeof entry === "string") continue;
      const o = entry as Record<string, unknown>;
      const eid =
        o.variation_id ??
        o.product_variation_id ??
        o.variationId ??
        o.productVariationId;
      if (eid == null || String(eid) !== vid) continue;
      const url = extractVariationImagePart(entry);
      if (url) return url;
    }
  }
  return null;
}

/** All image URLs for a variation (primary + galleries), deduped, order preserved */
export function collectVariationImageUrls(variant: unknown): string[] {
  if (!variant || typeof variant !== "object") return [];
  const v = variant as Record<string, unknown>;
  const urls: string[] = [];
  const push = (u: unknown) => {
    if (u == null) return;
    if (typeof u === "object") {
      const s = extractVariationImagePart(u);
      if (s && !urls.includes(s)) urls.push(s);
      return;
    }
    const s = String(u).trim();
    if (s && s !== "[object Object]" && !urls.includes(s)) urls.push(s);
  };

  push(v.primary_image);
  push(v.primaryImage);
  if (typeof v.image === "string") {
    push(v.image);
  } else if (v.image && typeof v.image === "object") {
    push(v.image);
  }
  push(v.feature_image);
  push(v.featured_image);
  push(v.product_image);
  push(v.image_url);
  push(v.thumbnail);
  push(v.main_image);
  push(v.photo);
  push(v.picture);
  push((v as { featured_image_url?: unknown }).featured_image_url);
  push((v as { featuredImageUrl?: unknown }).featuredImageUrl);
  push((v as { sku_image?: unknown }).sku_image);
  push((v as { variant_image?: unknown }).variant_image);
  push((v as { cover_image?: unknown }).cover_image);
  push((v as { card_image?: unknown }).card_image);

  // List/detail APIs often attach the hero image to color/size attribute_option, not on the variation root
  pushAttributeLevelImages(v, push);

  const arrays = [
    v.gallery_images,
    v.galleryImages,
    v.images,
    v.product_images,
    v.media,
  ];
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) push(extractVariationImagePart(item));
  }

  return urls;
}

/** First displayable image for a card / thumbnail */
export function getFirstVariationImageUrl(
  variant: unknown,
  productFallback?: string | null
): string {
  const fromVar = collectVariationImageUrls(variant);
  if (fromVar.length > 0) return fromVar[0];
  const fb = (productFallback || "").toString().trim();
  return fb || "/images/product_default.png";
}

/** Product-level images only (same idea as PDP `buildProductLevelImages`) */
export function collectProductLevelImageUrls(productDetails: unknown): string[] {
  if (!productDetails || typeof productDetails !== "object") return [];
  const pd = productDetails as Record<string, unknown>;
  const out: string[] = [];
  const pushIfValid = (url?: unknown) => {
    const u = (url || "").toString().trim();
    if (!u) return;
    if (!out.includes(u)) out.push(u);
  };
  const pushMany = (arr: unknown) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((img: unknown) => {
      if (typeof img === "string") return pushIfValid(img);
      const o = img as Record<string, unknown>;
      pushIfValid(
        extractVariationImagePart(img) ||
          o.url ||
          o.image_url ||
          o.image ||
          o.src ||
          o.path ||
          ""
      );
    });
  };

  pushIfValid(pd.primary_image);
  pushIfValid(pd.primaryImage);
  pushMany(pd.gallery_images);
  pushMany(pd.galleryImages);

  if (out.length === 0) {
    pushMany(pd.images);
    pushIfValid(pd.image);
  }

  return out;
}

/**
 * Hero URL for a variant: variant media first, then product gallery (matches PDP merge).
 */
export function getMergedHeroImageUrl(
  variant: unknown,
  productDetails: unknown
): string | null {
  const variantUrls = collectVariationImageUrls(variant);
  const productLevel = collectProductLevelImageUrls(productDetails);
  if (variantUrls.length > 0) {
    const merged: string[] = [...variantUrls];
    for (const u of productLevel) {
      if (u && !merged.includes(u)) merged.push(u);
    }
    return merged[0] || null;
  }
  return productLevel[0] || null;
}
