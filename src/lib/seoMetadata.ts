import type { Metadata } from "next";
import { cache } from "react";
import { API_URL, NODE_API_URL, SITE_URL, IS_STAGING, END_POINTS } from "@/constants/url";
import { extractProductIdFromSlug, slugify } from "@/utils/urlBuilder";
import type { SeoObject } from "@/types/seo";

const DEFAULT_TITLE = "Women Cart";
const DEFAULT_DESCRIPTION = "Ecommerce";
const DEFAULT_LATITUDE = 28.6573;
const DEFAULT_LONGITUDE = 77.1642;

type SearchParamsInput = Record<string, string | string[] | undefined>;

const ADMIN_HEADERS: Record<string, string> = {
  Accept: "application/json",
  AuthorizationNode: "guest",
  "x-portal": "user",
  app: "anstmasr2588",
};

/** Abort SEO fetches that take too long so they never block page rendering. */
const SEO_FETCH_TIMEOUT_MS = 2000;

function seoFetchSignal(): AbortSignal | undefined {
  try {
    return AbortSignal.timeout(SEO_FETCH_TIMEOUT_MS);
  } catch {
    return undefined;
  }
}

function toSingleValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseDeliveryType(modeValue: string | undefined): "normal" | "quick" {
  return modeValue === "quick_delivery" ? "quick" : "normal";
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function toKeywordsValue(keywords: unknown): Metadata["keywords"] | undefined {
  if (Array.isArray(keywords)) {
    const list = keywords.map((item) => String(item ?? "").trim()).filter(Boolean);
    return list.length > 0 ? list : undefined;
  }
  if (typeof keywords === "string") {
    const trimmed = keywords.trim();
    if (!trimmed) return undefined;
    const split = trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return split.length > 0 ? split : trimmed;
  }
  return undefined;
}

/**
 * Self-referencing canonical URL for a page's own clean path — always
 * `SITE_URL` + trailing-slashed path, with every query param stripped
 * (filters, sort, pagination, UTM/tracking, product_id, variant, etc. are
 * all client-side/API concerns, never part of the canonical identity).
 */
function resolveCanonicalUrl(path: string): string {
  const base = SITE_URL.replace(/\/$/, "");
  const cleanPath = path.split("?")[0].split("#")[0];
  const withLeadingSlash = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  const withTrailingSlash = withLeadingSlash.endsWith("/")
    ? withLeadingSlash
    : `${withLeadingSlash}/`;
  return `${base}${withTrailingSlash}`;
}

function stripHtmlForMeta(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toAbsoluteShareUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = SITE_URL.replace(/\/$/, "");
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

function unwrapProductDetailPayload(response: unknown): Record<string, unknown> | null {
  if (!response || typeof response !== "object") return null;
  const envelope = response as Record<string, unknown>;
  const statusCode = Number(envelope.statusCode);
  if (Number.isFinite(statusCode) && statusCode !== 200) return null;

  const nested = envelope.data;
  const payload =
    nested &&
    typeof nested === "object" &&
    !Array.isArray(nested) &&
    "data" in (nested as Record<string, unknown>)
      ? (nested as Record<string, unknown>).data
      : nested ?? envelope;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const product = payload as Record<string, unknown>;
  if (
    product.id != null ||
    product.product_id != null ||
    Array.isArray(product.variations) ||
    typeof product.name === "string" ||
    typeof product.product_name === "string"
  ) {
    return product;
  }
  return null;
}

function extractProductSeoOnly(response: any): SeoObject {
  if (!response || typeof response !== "object") return {};
  return (
    response.data?.seo ??
    response.seo ??
    response.data?.data?.seo ??
    {}
  ) as SeoObject;
}

function findVariantForSlug(
  product: Record<string, unknown>,
  productSlug: string,
): Record<string, unknown> | null {
  const variations = product.variations;
  if (!Array.isArray(variations) || !productSlug) return null;
  const target = slugify(productSlug);
  if (!target) return null;

  for (const variant of variations) {
    if (!variant || typeof variant !== "object") continue;
    const record = variant as Record<string, unknown>;
    for (const raw of [record.slug, record.short_slug]) {
      const norm = slugify(String(raw || ""));
      if (!norm) continue;
      if (norm === target || target.startsWith(norm) || norm.startsWith(target)) {
        return record;
      }
    }
  }
  return null;
}

function resolveVariantDisplayName(variant: Record<string, unknown> | null): string | undefined {
  if (!variant) return undefined;
  const attrs = variant.variation_attributes;
  if (Array.isArray(attrs)) {
    for (const attr of attrs) {
      if (!attr || typeof attr !== "object") continue;
      const option = (attr as Record<string, unknown>).attribute_option;
      if (option && typeof option === "object") {
        const display = cleanString((option as Record<string, unknown>).display_value as string);
        if (display) return display;
      }
    }
  }
  return cleanString(variant.name as string);
}

function resolveProductShareImage(
  product: Record<string, unknown>,
  variant?: Record<string, unknown> | null,
): string | undefined {
  const candidates: unknown[] = [];

  if (variant) {
    candidates.push(variant.image);
    if (Array.isArray(variant.gallery_images)) {
      candidates.push(...variant.gallery_images);
    }
  }

  candidates.push(
    product.image,
    product.product_image,
    product.thumbnail,
  );
  if (Array.isArray(product.images)) candidates.push(...product.images);
  if (Array.isArray(product.gallery_images)) candidates.push(...product.gallery_images);

  const variations = product.variations;
  if (Array.isArray(variations)) {
    const defaultVariant =
      variations.find(
        (item) => item && typeof item === "object" && (item as Record<string, unknown>).is_default,
      ) ?? variations[0];
    if (defaultVariant && typeof defaultVariant === "object") {
      const record = defaultVariant as Record<string, unknown>;
      candidates.push(record.image);
      if (Array.isArray(record.gallery_images)) {
        candidates.push(...record.gallery_images);
      }
    }
  }

  for (const candidate of candidates) {
    const value = cleanString(candidate);
    if (value) return toAbsoluteShareUrl(value);
  }
  return undefined;
}

function buildProductShareSeo(input: {
  product: Record<string, unknown> | null;
  productSlug?: string;
  canonicalPath?: string;
}): SeoObject {
  const { product, productSlug, canonicalPath } = input;
  if (!product) return {};

  const variant = productSlug ? findVariantForSlug(product, productSlug) : null;
  const baseTitle =
    cleanString(product.meta_title as string) ||
    cleanString(product.name as string) ||
    cleanString(product.product_name as string);
  const variantLabel = resolveVariantDisplayName(variant);
  const title = variantLabel && baseTitle ? `${baseTitle} - ${variantLabel}` : baseTitle;

  const rawDescription =
    cleanString(product.meta_description as string) ||
    cleanString(product.short_description as string) ||
    cleanString(product.description as string);
  const description = rawDescription ? stripHtmlForMeta(rawDescription).slice(0, 300) : undefined;
  const image = resolveProductShareImage(product, variant);
  const canonical = canonicalPath ? resolveCanonicalUrl(canonicalPath) : undefined;

  return {
    meta_title: title,
    meta_description: description,
    og: {
      title,
      description,
      image,
      url: canonical,
      type: "website",
      site_name: "Womancart",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      image,
    },
  };
}

function mergeSeoObjects(base: SeoObject, override: SeoObject): SeoObject {
  return {
    ...base,
    ...override,
    meta_title: override.meta_title || base.meta_title,
    meta_description: override.meta_description || base.meta_description,
    meta_keywords: override.meta_keywords ?? base.meta_keywords,
    canonical_url: override.canonical_url || base.canonical_url,
    og: { ...base.og, ...override.og },
    twitter: { ...base.twitter, ...override.twitter },
  };
}

function normalizeOpenGraphType(value?: string, fallback = "website"): "website" | "article" {
  const cleaned = cleanString(value)?.toLowerCase();
  if (cleaned === "article") return "article";
  // Next.js Metadata API rejects `product`; `website` is valid for PDP share cards.
  return fallback === "article" ? "article" : "website";
}

/** Pull the `seo` object out of any of the various response envelopes. */
export function extractSeo(response: any): SeoObject {
  if (!response || typeof response !== "object") return {};
  return (
    response.data?.seo ??
    response.seo ??
    response.data?.data?.seo ??
    response.data ??
    {}
  ) as SeoObject;
}

/**
 * Map a backend `seo` object to a full Next.js Metadata object covering
 * title, description, keywords, canonical, robots, Open Graph and Twitter.
 */
export function buildFullMetadata(
  seo: SeoObject | undefined | null,
  fallback?: {
    title?: string;
    description?: string;
    image?: string;
    canonicalPath?: string;
    ogType?: string;
  },
): Metadata {
  const s = seo ?? {};

  const title =
    cleanString(s.meta_title) ||
    cleanString(s.og?.title as string) ||
    cleanString(fallback?.title) ||
    DEFAULT_TITLE;

  const description =
    cleanString(s.meta_description) ||
    cleanString(s.og?.description as string) ||
    cleanString(fallback?.description) ||
    DEFAULT_DESCRIPTION;

  const keywords = toKeywordsValue(s.meta_keywords ?? s.keywords);
  // Backend-authored canonical wins when explicitly set (manual override for
  // edge cases); otherwise default to the auto-computed self-referencing URL
  // so every category/brand/product page gets one without a CMS entry.
  const canonical =
    cleanString(s.canonical_url) ||
    (fallback?.canonicalPath ? resolveCanonicalUrl(fallback.canonicalPath) : undefined);
  // Staging must never be indexed regardless of what the backend SEO record
  // says (a per-page `robots` value would otherwise silently override this).
  const robots = IS_STAGING ? "noindex, nofollow" : cleanString(s.robots);

  // Open Graph (with fallback to meta title/description per automation rules)
  const og = s.og ?? {};
  const ogImage =
    cleanString(og.image as string) ||
    (fallback?.image ? toAbsoluteShareUrl(fallback.image) : undefined);
  const openGraph: NonNullable<Metadata["openGraph"]> = {
    title: cleanString(og.title as string) || title,
    description: cleanString(og.description as string) || description,
    url: cleanString(og.url as string) || canonical,
    siteName: cleanString(og.site_name as string) || "Womancart",
    type: normalizeOpenGraphType(cleanString(og.type as string), fallback?.ogType || "website"),
    ...(ogImage ? { images: [{ url: ogImage, alt: title }] } : {}),
  };

  // Twitter (with fallback to meta title/description per automation rules)
  const tw = s.twitter ?? {};
  const twImage =
    cleanString(tw.image as string) ||
    (fallback?.image ? toAbsoluteShareUrl(fallback.image) : undefined);
  const twitter: NonNullable<Metadata["twitter"]> = {
    card: (cleanString(tw.card as string) as any) || "summary_large_image",
    title: cleanString(tw.title as string) || title,
    description: cleanString(tw.description as string) || description,
    ...(cleanString(tw.site as string) ? { site: cleanString(tw.site as string) } : {}),
    ...(twImage ? { images: [twImage] } : {}),
  };

  const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    openGraph,
    twitter,
    ...(keywords ? { keywords } : {}),
    ...(canonical ? { alternates: { canonical } } : {}),
    ...(robots ? { robots } : {}),
  };

  return metadata;
}

/* -------------------------------------------------------------------------- */
/*                              SERVER-SIDE FETCH                              */
/* -------------------------------------------------------------------------- */

/** Generic fetch for an admin SEO endpoint. Returns parsed JSON or null. */
async function fetchAdminSeo(path: string): Promise<any | null> {
  try {
    const base = API_URL.replace(/\/$/, "");
    const response = await fetch(`${base}${path}`, {
      method: "GET",
      headers: ADMIN_HEADERS,
      next: { revalidate: 3600 },
      signal: seoFetchSignal(),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchCategoryList(params: {
  latitude: number;
  longitude: number;
  type: "normal" | "quick";
}) {
  try {
    const query = new URLSearchParams({
      latitude: String(params.latitude),
      longitude: String(params.longitude),
      type: params.type,
    });
    const response = await fetch(
      `${NODE_API_URL}/home/user/category-list?${query.toString()}`,
      {
        method: "GET",
        headers: ADMIN_HEADERS,
        cache: "no-store",
        signal: seoFetchSignal(),
      },
    );
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchProductDetail(params: {
  productId?: number | null;
  slug?: string;
  type: "normal" | "quick";
}) {
  const slug = String(params.slug || "").trim();
  const hasProductId =
    params.productId != null && Number.isFinite(params.productId) && params.productId > 0;
  if (!hasProductId && !slug) return null;
  try {
    const body: Record<string, unknown> = {
      type: params.type,
      product_id: hasProductId ? params.productId : null,
    };
    // Prefer product_id alone — slug+id together can return the wrong product for OOS SKUs.
    if (slug && !hasProductId) body.slug = slug;
    const response = await fetch(`${NODE_API_URL}/product/user/product-detail`, {
      method: "POST",
      headers: { ...ADMIN_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: seoFetchSignal(),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/** Public server helpers that fetch + return the raw response (for JSON-LD reuse). */
export const fetchCategorySeoData = (slug: string) =>
  fetchAdminSeo(`${END_POINTS.seoCategory}/${slug}`);
export const fetchBrandSeoData = (slug: string) =>
  fetchAdminSeo(`${END_POINTS.seoBrand}/${slug}`);
export const fetchCollectionSeoData = (slug: string) =>
  fetchAdminSeo(`${END_POINTS.seoCollection}/${slug}`);
export const fetchCmsPageSeoData = (slug: string) =>
  fetchAdminSeo(`${END_POINTS.seoCmsPage}/${slug}`);
export const fetchBlogSeoData = (slug: string) =>
  fetchAdminSeo(`${END_POINTS.seoBlog}/${slug}`);
export const fetchHomepageSeoData = () =>
  fetchAdminSeo(`${END_POINTS.seoHomepage}`);

/** Try candidate slugs in parallel and return the first valid SEO response. */
export const fetchCmsPageSeoByCandidates = cache(async function fetchCmsPageSeoByCandidates(
  candidates: string[],
): Promise<any | null> {
  const unique = [...new Set(candidates.filter(Boolean))];
  if (unique.length === 0) return null;

  try {
    return await Promise.any(
      unique.map(async (slug) => {
        const res = await fetchCmsPageSeoData(slug);
        const seo = extractSeo(res);
        if (seo && (seo.meta_title || seo.meta_description || seo.h1)) {
          return res;
        }
        throw new Error(`No SEO for slug: ${slug}`);
      }),
    );
  } catch {
    return null;
  }
});

function getProductIdFromInputs(input: {
  searchParams?: SearchParamsInput;
  slug?: string;
}): number | null {
  const fromQuery = toSingleValue(input.searchParams?.product_id);
  const queryId = Number(fromQuery);
  if (Number.isFinite(queryId) && queryId > 0) return queryId;

  if (input.slug) {
    const fromEmbedded = extractProductIdFromSlug(input.slug);
    const fromSlug = Number(fromEmbedded);
    if (Number.isFinite(fromSlug) && fromSlug > 0) return fromSlug;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*                              METADATA GENERATORS                            */
/* -------------------------------------------------------------------------- */

export async function generateCategoryPageMetadata(input: {
  categorySlug: string;
  searchParams?: SearchParamsInput;
  canonicalPath?: string;
}): Promise<Metadata> {
  const leafSlug = slugify(input.categorySlug || "");
  if (!leafSlug) return buildFullMetadata({});

  const canonicalPath = input.canonicalPath || `/category/${leafSlug}`;

  // Prefer the dedicated SEO endpoint (full seo object).
  const seoRes = await fetchCategorySeoData(leafSlug);
  const seo = extractSeo(seoRes);
  if (seo && (seo.meta_title || seo.meta_description || seo.canonical_url)) {
    return buildFullMetadata(seo, { canonicalPath });
  }

  // Fallback: legacy node category-list (title/description/keywords only).
  const mode = toSingleValue(input.searchParams?.mode);
  const latitude = parseNumber(
    toSingleValue(input.searchParams?.latitude),
    DEFAULT_LATITUDE,
  );
  const longitude = parseNumber(
    toSingleValue(input.searchParams?.longitude),
    DEFAULT_LONGITUDE,
  );
  const type = parseDeliveryType(mode);

  const response = await fetchCategoryList({ latitude, longitude, type });
  const categories = Array.isArray(response?.data) ? response.data : [];
  const category = categories.find(
    (item: any) => slugify(item?.name || "") === leafSlug,
  );
  if (!category) return buildFullMetadata({}, { canonicalPath });

  return buildFullMetadata(
    {
      meta_title: category.meta_title ?? category.name,
      meta_description: category.meta_description,
      meta_keywords: category.meta_keywords,
    },
    { canonicalPath },
  );
}

export async function fetchProductDetailResponse(input: {
  productSlug?: string;
  searchParams?: SearchParamsInput;
}): Promise<any | null> {
  const type = parseDeliveryType(toSingleValue(input.searchParams?.mode));
  const slug = String(input.productSlug || "").trim();
  const productId = getProductIdFromInputs({
    searchParams: input.searchParams,
    slug,
  });
  if (!productId && !slug) return null;
  return fetchProductDetail({
    productId: productId ?? null,
    slug: slug || undefined,
    type,
  });
}

export async function generateProductPageMetadata(input: {
  productSlug?: string;
  searchParams?: SearchParamsInput;
}): Promise<Metadata> {
  const response = await fetchProductDetailResponse(input);
  const product = unwrapProductDetailPayload(response);
  const apiSeo = extractProductSeoOnly(response);
  const canonicalPath = input.productSlug ? `/product/${input.productSlug}` : undefined;
  const productShareSeo = buildProductShareSeo({
    product,
    productSlug: input.productSlug,
    canonicalPath,
  });
  const seo = mergeSeoObjects(productShareSeo, apiSeo);

  return buildFullMetadata(seo, {
    title:
      cleanString(product?.name as string) ||
      cleanString(product?.product_name as string),
    description:
      cleanString(product?.meta_description as string) ||
      (cleanString(product?.short_description as string)
        ? stripHtmlForMeta(String(product?.short_description))
        : undefined) ||
      (cleanString(product?.description as string)
        ? stripHtmlForMeta(String(product?.description))
        : undefined),
    image: resolveProductShareImage(
      product ?? {},
      input.productSlug && product ? findVariantForSlug(product, input.productSlug) : null,
    ),
    canonicalPath,
    ogType: "website",
  });
}

export async function generateBrandPageMetadata(input: {
  brandSlug: string;
}): Promise<Metadata> {
  const slug = slugify(input.brandSlug || "");
  if (!slug) return buildFullMetadata({});
  const res = await fetchBrandSeoData(slug);
  return buildFullMetadata(extractSeo(res), { canonicalPath: `/brand/${slug}` });
}

export async function generateCollectionPageMetadata(input: {
  collectionSlug: string;
}): Promise<Metadata> {
  const slug = slugify(input.collectionSlug || "");
  if (!slug) return buildFullMetadata({});
  const res = await fetchCollectionSeoData(slug);
  return buildFullMetadata(extractSeo(res), { canonicalPath: `/collections/${slug}` });
}

export async function generateBlogPageMetadata(input: {
  blogSlug: string;
}): Promise<Metadata> {
  const slug = (input.blogSlug || "").trim();
  if (!slug) return buildFullMetadata({});
  const res = await fetchBlogSeoData(slug);
  return buildFullMetadata(extractSeo(res));
}

export async function generateCmsPageMetadata(input: {
  slugCandidates: string[];
  fallback?: { title?: string; description?: string };
}): Promise<Metadata> {
  const res = await fetchCmsPageSeoByCandidates(input.slugCandidates);
  return buildFullMetadata(extractSeo(res), input.fallback);
}

export async function generateHomepageMetadata(): Promise<Metadata> {
  const res = await fetchHomepageSeoData();
  return buildFullMetadata(extractSeo(res), {
    title:
      "Buy Beauty and Skincare Products Online in India | Womancart",
    description:
      "Shop beauty and skincare products online in India at Womancart. Explore makeup, hair care, and personal care essentials from top brands at great prices.",
  });
}
