/**
 * URL builder utilities for the SEO-friendly URL structure.
 *
 * Clean URLs (no visible IDs):
 *   /category/makeup/lips
 *   /brand/maybelline
 *   /product/maybelline-superstay-matte-ink
 *
 * Product detail always uses `/product/{slug}` — never nested under category/brand.
 *
 * Each builder persists the slug→ID mapping to sessionStorage so that the
 * destination page can resolve the numeric ID for API calls without needing
 * the ID in the URL.  See src/utils/idStore.ts.
 */

import { lookupSlugId, saveSlugId } from "./idStore";
import { getFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import { QUICK_DELIVERY_URL_MODE } from "./deliveryMode";

type Params = Record<string, string | number | undefined | null>;

/**
 * ID query-string keys that are never included in the visible URL.
 * They are replaced by the human-readable slug segments in the path.
 */
const ID_KEYS = new Set([
  "category_id",
  "categoryIds",
  "brand",
  "brandIds",
  "product_id",
  "productIds",
  "kitId",
  "kit_id",
  "id",
]);

/**
 * Convert a URL slug back to a human-readable display label.
 * "art-n-craft"  → "Art N Craft"
 * "school-stationary" → "School Stationary"
 */
export function unslugify(slug: string): string {
  return String(slug || "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/** Convert a name to a URL-safe slug */
export function slugify(name: string): string {
  const result = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return result || "item";
}

/** True when slug contains the canonical `prod-xxxx-{id}` token. */
export function hasProdSlugToken(slug: string): boolean {
  return /prod-[a-z0-9]+-\d+/i.test(String(slug || ""));
}

/**
 * Extract the decorative numeric suffix from `prod-xxxx-{suffix}` in an SEO slug.
 * This suffix is for URL uniqueness — it is NOT the API `product_id`.
 */
export function extractProductIdFromSlug(slug: string): string | null {
  const normalized = String(slug || "").trim().toLowerCase();
  if (!normalized) return null;

  const prodMatch = normalized.match(/prod-[a-z0-9]+-(\d+)/i);
  return prodMatch?.[1] ?? null;
}

/** Strip listing attribute/category suffixes when slug has no `prod-` token. */
function stripListingAttributeSuffix(slug: string): string {
  let result = slugify(slug).replace(/-+$/, "");
  if (!result || hasProdSlugToken(result)) return result;

  // Drop trailing variant row id (e.g. ...-9830) before attribute stripping.
  result = result.replace(/-\d+$/, "");

  const cutPatterns = [
    /-makeup-/i,
    /-size-/i,
    /-shade-/i,
    /-skin-/i,
    /-hair-/i,
    /-fragrance-/i,
    /-fashion-/i,
    /-jewellery-/i,
    /-health-/i,
    /-care-/i,
    /-home-/i,
    /-kitchen-/i,
    /-kids-/i,
    /-men-/i,
  ];
  for (const pattern of cutPatterns) {
    const match = result.match(pattern);
    if (match?.index != null && match.index > 0) {
      result = result.slice(0, match.index);
      break;
    }
  }
  return result.replace(/-+$/, "");
}

/**
 * Reduce noisy category/attribute suffixes to `...-{productId}` only.
 * Variant-specific slugs keep their unique `prod-xxxx` token.
 */
export function canonicalizeProductSlugSegment(
  rawSlug: string,
  productId?: string | number | null,
): string {
  const slug = slugify(String(rawSlug || "").trim());
  if (!slug) return slug;

  const embeddedProdPid = extractProductIdFromSlug(slug);
  const passedPid =
    productId != null && productId !== "" ? String(productId).trim() : "";
  const pid = embeddedProdPid || passedPid;
  if (!pid) return slug;

  if (embeddedProdPid) {
    const marker = `-${embeddedProdPid}`;
    const markerIndex = slug.indexOf(marker);
    if (markerIndex !== -1) return slug.slice(0, markerIndex + marker.length);
    if (slug.endsWith(marker)) return slug;
  }

  if (passedPid) {
    const marker = `-${passedPid}`;
    const markerIndex = slug.indexOf(marker);
    if (markerIndex !== -1) return slug.slice(0, markerIndex + marker.length);
    const base = stripListingAttributeSuffix(slug);
    if (base.endsWith(marker)) return base;
    return `${base}${marker}`;
  }

  return slug;
}

/**
 * Prefer the variant `short_slug` for PDP URLs / API payload / sitemap.
 * Falls back to `slug` only when `short_slug` is missing.
 */
export function getVariantUrlSlug(variant: {
  short_slug?: string | null;
  slug?: string | null;
} | null | undefined): string {
  if (!variant || typeof variant !== "object") return "";
  const shortSlug = String(variant.short_slug || "").trim();
  if (shortSlug) return shortSlug;
  return String(variant.slug || "").trim();
}

/**
 * PDP path segment for a variant — prefer short_slug when provided.
 */
export function canonicalizeVariantSlugForPdp(variantSlug: string): string {
  return slugify(String(variantSlug || "").trim());
}

/**
 * Pick the best slug + parent product id for navigation from a listing card.
 * When a variant slug is available, it is used so attribute slugs appear in the PDP URL.
 */
export function resolveProductNavigationSlug(
  productSlug: string,
  variantSlug: string | undefined,
  parentProductId: string | number,
): { slug: string; productId: string | number } {
  const variant = String(variantSlug || "").trim();
  if (variant) {
    return {
      slug: canonicalizeVariantSlugForPdp(variant),
      productId: parentProductId,
    };
  }

  return {
    slug: canonicalizeProductSlugSegment(productSlug, parentProductId),
    productId: parentProductId,
  };
}

/** Slug used for sessionStorage lookup — the full PDP path segment. */
export function getProductSlugLookupKey(
  rawSlug: string,
  _productId?: string | number | null,
): string {
  return slugify(String(rawSlug || "").trim());
}

/** Replace the product slug segment in a PDP pathname (plain or nested). */
export function replaceProductSlugInPath(
  pathname: string,
  canonicalSlugSegment: string,
): string {
  const encodedSlug = encodeURIComponent(canonicalSlugSegment);
  const matchPathTrailingSlash = (next: string, ref: string) => {
    const refSlash = ref.endsWith("/") && ref.length > 1;
    if (refSlash && !next.endsWith("/")) return `${next}/`;
    if (!refSlash && next.length > 1 && next.endsWith("/")) {
      return next.replace(/\/$/, "");
    }
    return next;
  };

  let nextPath = pathname;
  if (
    pathname.includes("/product/") &&
    (pathname.startsWith("/brand/") || pathname.startsWith("/category/"))
  ) {
    nextPath = pathname.replace(/(\/product\/)[^/]+\/?$/, `$1${encodedSlug}`);
  } else if (
    pathname.startsWith("/product/") &&
    pathname !== "/product/detail" &&
    pathname !== "/product/detail/"
  ) {
    nextPath = pathname.replace(/\/product\/[^/]+\/?$/, `/product/${encodedSlug}`);
  } else if (pathname === "/product/detail" || pathname === "/product/detail/") {
    nextPath = matchPathTrailingSlash(`/product/${encodedSlug}`, pathname);
  }
  return matchPathTrailingSlash(nextPath, pathname);
}

/** Read the product slug segment from a PDP pathname. */
export function getProductSlugFromPath(pathname: string): string {
  const nested = pathname.match(/\/product\/([^/]+)\/?$/);
  if (nested?.[1]) {
    const segment = decodeURIComponent(nested[1]).trim();
    if (
      segment &&
      segment !== "detail" &&
      segment !== "product-category" &&
      segment !== "kit-detail"
    ) {
      return segment;
    }
  }
  const plain = pathname.match(/^\/product\/([^/]+)\/?$/);
  if (plain?.[1]) {
    const segment = decodeURIComponent(plain[1]).trim();
    if (
      segment &&
      segment !== "detail" &&
      segment !== "product-category" &&
      segment !== "kit-detail"
    ) {
      return segment;
    }
  }
  return "";
}

/** Resolve product slug from pathname (reload-safe) and route params. */
export function resolveProductSlugFromRoute(
  pathname: string,
  params?: { slug?: string | string[]; productSlug?: string | string[] },
): string {
  const pathCandidates: string[] = [];
  if (typeof window !== "undefined") {
    const browserPath = window.location.pathname;
    if (browserPath) pathCandidates.push(browserPath);
  }
  if (pathname) pathCandidates.push(pathname);

  const uniquePaths = pathCandidates.filter(
    (value, index, list) => Boolean(value) && list.indexOf(value) === index,
  );

  for (const path of uniquePaths) {
    if (path && !path.startsWith("/product/detail")) {
      const fromPath = getProductSlugFromPath(path);
      if (fromPath) return fromPath;
    }
  }
  if (typeof params?.productSlug === "string" && params.productSlug.trim()) {
    return params.productSlug.trim();
  }
  if (Array.isArray(params?.productSlug) && params.productSlug[0]) {
    return String(params.productSlug[0]).trim();
  }
  if (Array.isArray(params?.slug)) {
    const productIdx = params.slug.lastIndexOf("product");
    if (productIdx >= 0 && params.slug[productIdx + 1]) {
      return String(params.slug[productIdx + 1]).trim();
    }
  }
  return "";
}

/** Resolve API `product_id` from slug + optional query / session fallbacks. */
export function resolveProductIdForSlug(
  slug: string,
  options?: {
    queryProductId?: string | null;
  },
): string | null {
  const fromQuery = String(options?.queryProductId || "").trim();
  if (fromQuery && /^\d+$/.test(fromQuery)) return fromQuery;

  const lookupKey = getProductSlugLookupKey(slug);
  if (lookupKey) {
    const fromSession = lookupSlugId("product", lookupKey);
    if (fromSession) return fromSession;
  }

  if (slug && /^\d+$/.test(slug)) return slug;

  return null;
}

/** Canonical PDP path segment for a variant slug + parent product id. */
export function buildVariantProductPathSegment(
  variantSlug: string,
  _parentProductId?: string | number,
): string {
  return canonicalizeVariantSlugForPdp(variantSlug);
}

function persistProductSlugIdMappings(
  slug: string,
  productPathSegment: string,
  id: string | number,
): void {
  const keys = new Set<string>();
  const keyFromSlug = getProductSlugLookupKey(slug, id);
  const keyFromPath = getProductSlugLookupKey(productPathSegment, id);
  if (keyFromSlug) keys.add(keyFromSlug);
  if (keyFromPath) keys.add(keyFromPath);
  keys.forEach((key) => saveSlugId("product", key, id));
}

function buildProductPathSegment(slug: string, id: string | number | undefined | null): string {
  return canonicalizeProductSlugSegment(slug, id);
}

/**
 * Serialize non-empty, non-ID params into a query string.
 * ID params (category_id, brandIds, product_id, etc.) are always stripped
 * so they never appear in the browser URL bar.
 */
function appendStoredDeliveryMode(sp: URLSearchParams): void {
  if (sp.has("mode")) return;
  if (typeof window === "undefined") return;
  const stored = getFromStorage(STORAGE_KEYS.deliveryMode);
  if (stored === QUICK_DELIVERY_URL_MODE) {
    sp.set("mode", QUICK_DELIVERY_URL_MODE);
  }
}

type BuildQsOptions = {
  /** When false, never append `mode=quick_delivery` from localStorage (product PDP links). */
  includeDeliveryMode?: boolean;
};

function buildQS(params: Params, options?: BuildQsOptions): string {
  const sp = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (ID_KEYS.has(key)) continue;
    if (val !== undefined && val !== null && val !== "") {
      sp.set(key, String(val));
    }
  }
  if (options?.includeDeliveryMode !== false) {
    appendStoredDeliveryMode(sp);
  }
  return sp.toString();
}

/** Strip `product_id` / `mode` from product detail URLs in the address bar. */
export function cleanPlainProductDetailUrl(
  pathname: string,
  searchParams?: URLSearchParams | string | null,
): string {
  const isProductDetail =
    /^\/product\/[^/]+\/?$/.test(pathname) ||
    /\/product\/[^/]+\/?$/.test(pathname);
  if (!isProductDetail) return pathname;

  const raw =
    typeof searchParams === "string"
      ? searchParams
      : searchParams?.toString() || "";
  if (!raw) {
    return pathname.replace(/\/$/, "") || pathname;
  }

  const sp = new URLSearchParams(raw);
  sp.delete("product_id");
  sp.delete("mode");
  const qs = sp.toString();
  const path = pathname.replace(/\/$/, "") || pathname;
  return qs ? `${path}?${qs}` : path;
}

/** Canonical PDP path: `/product/{slug}` for all navigation sources. */
export function buildCanonicalProductDetailPath(
  productSlugSegment: string,
): string {
  const segment = String(productSlugSegment || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (!segment) return "/product";
  return `/product/${segment}`;
}

/**
 * Normalize any PDP pathname (plain or legacy nested) to `/product/{slug}`.
 * Strips `product_id` and `mode` from the query string.
 */
export function canonicalizeProductDetailBrowserUrl(
  pathname: string,
  searchParams?: URLSearchParams | string | null,
): string {
  const productSlug = getProductSlugFromPath(pathname);
  if (!productSlug) {
    return cleanPlainProductDetailUrl(pathname, searchParams);
  }

  const isNestedContextProduct =
    (pathname.startsWith("/category/") || pathname.startsWith("/brand/")) &&
    pathname.includes("/product/");

  const path = isNestedContextProduct
    ? buildCanonicalProductDetailPath(productSlug)
    : pathname.replace(/\/$/, "") || pathname;

  return cleanPlainProductDetailUrl(path, searchParams);
}

/**
 * Build a category URL from an ordered list of ancestor names (root → leaf).
 * The ID is stored in sessionStorage for later resolution; it is NOT added to
 * the URL.
 *
 * Examples:
 *   buildCategoryUrl(["Makeup"], { category_id: 5 })
 *     → /category/makeup
 *   buildCategoryUrl(["Makeup", "Lips"], { categoryIds: 12 })
 *     → /category/makeup/lips
 *   buildCategoryUrl(["Makeup", "Lips", "Lipstick"], { categoryIds: 34 })
 *     → /category/makeup/lips/lipstick
 */
export function buildCategoryUrl(names: string[], params: Params): string {
  const slugParts = names.map(slugify).filter(Boolean);
  // Always ensure at least one path segment so the [...slug] route matches
  const path = slugParts.length > 0 ? slugParts.join("/") : "products";
  const base = `/category/${path}`;

  // Persist the leaf slug → id so the category page can resolve without URL param
  const leafSlug = slugParts[slugParts.length - 1];
  if (leafSlug) {
    const id = params.category_id ?? params.categoryIds;
    if (id !== undefined && id !== null && id !== "") {
      saveSlugId("category", leafSlug, id as string | number);
    }
  }

  const qs = buildQS(params);
  return qs ? `${base}?${qs}` : base;
}

/**
 * Build a brand URL.
 * The brand ID is stored in sessionStorage; it is NOT added to the URL.
 *
 * Example:
 *   buildBrandUrl("Maybelline", { brandIds: 7 })
 *     → /brand/maybelline
 */
export function buildBrandUrl(brandName: string, params: Params): string {
  const brandSlug = slugify(brandName);
  const base = `/brand/${brandSlug}`;

  const id = params.brandIds ?? params.brand;
  if (brandSlug && id !== undefined && id !== null && id !== "") {
    saveSlugId("brand", brandSlug, id as string | number);
  }

  const qs = buildQS(params);
  return qs ? `${base}?${qs}` : base;
}

type BuildProductUrlOptions = {
  includeDeliveryMode?: boolean;
  /** When true, use the slug as the path segment without appending product_id. */
  usePathSlugAsIs?: boolean;
};

/**
 * Build a product detail URL using the product's slug (preferred) or name.
 * The product ID is stored in sessionStorage; it is NOT added to the URL.
 */
export function buildProductUrl(
  productSlugOrName: string,
  params: Params,
  options?: BuildProductUrlOptions,
): string {
  const slug = slugify(productSlugOrName);
  const id = params.product_id;
  const productPathSegment = options?.usePathSlugAsIs
    ? slug
    : buildProductPathSegment(slug, id);
  const base = `/product/${productPathSegment}`;

  if (slug && id !== undefined && id !== null && id !== "") {
    persistProductSlugIdMappings(slug, productPathSegment, id as string | number);
  }

  const qs = buildQS(params, {
    includeDeliveryMode: options?.includeDeliveryMode ?? false,
  });
  return qs ? `${base}?${qs}` : base;
}

/**
 * Build a product URL for navigation from any page (category, brand, search, home).
 * Always returns the single canonical path `/product/{slug}`.
 */
export function buildContextualProductUrl(
  _contextPathname: string,
  productSlugOrName: string,
  params: Params,
): string {
  return buildProductUrl(productSlugOrName, params);
}

/**
 * Build an offer-kit detail URL.
 * The kit ID is stored in sessionStorage; it is NOT added to the URL.
 *
 * Example:
 *   buildKitUrl("Festive Makeup Combo", { kitId: 19 })
 *     → /product/kit-detail/festive-makeup-combo
 */
export function buildKitUrl(kitName: string, params: Params): string {
  const slug = slugify(kitName);
  const base = `/product/kit-detail/${slug}`;

  const id = params.kitId ?? params.kit_id ?? params.id;
  if (slug && id !== undefined && id !== null && id !== "") {
    saveSlugId("kit", slug, id as string | number);
  }

  const qs = buildQS(params);
  return qs ? `${base}?${qs}` : base;
}

