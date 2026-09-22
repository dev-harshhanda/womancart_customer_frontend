/**
 * Centralised banner click → SEO-friendly listing URL builder.
 *
 * Mirrors the mobile app's `LinkableType` switch: each banner link carries a
 * `linkable_type` (Laravel model name, e.g. `App\Models\Category`) and a
 * `linkable_id`. Brand/category banners route to `/brand/{slug}` and
 * `/category/{slug}`; product banners still use product-category filters.
 */

import { withDeliveryModeInUrl } from "@/utils/deliveryMode";
import { buildBrandUrl, buildCategoryUrl } from "@/utils/urlBuilder";

export type LinkableType = "product" | "brand" | "category";

export interface BannerLinkLike {
  id?: number;
  linkable_type?: string | null;
  linkable_id?: number | null;
  banner_management_id?: number;
  type?: string | null;
  name?: string | null;
  brand_name?: string | null;
  category_name?: string | null;
  title?: string | null;
  linkable?: {
    name?: string | null;
    brand_name?: string | null;
    category_name?: string | null;
    title?: string | null;
  } | null;
}

export interface BannerItemLike {
  id?: number;
  url?: string | null;
  type?: string | null;
  title?: string | null;
  description?: string | null;
  label_key?: string | null;
  name?: string | null;
  brand_name?: string | null;
  category_name?: string | null;
  brand?: {
    name?: string | null;
    brand_name?: string | null;
  } | null;
  banner_links?: BannerLinkLike[] | null;
  links?: BannerLinkLike[] | null;
}

export type BrandLookupItem = {
  id?: number;
  brand_id?: number;
  name?: string | null;
  brand_name?: string | null;
};

const FALLBACK_URL = "/product/product-category?type=recommended";

const GENERIC_TITLES = new Set([
  "featuredbrands",
  "featured brands",
  "brand",
  "banner",
  "category",
]);

function normalizeEntityName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (GENERIC_TITLES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

function readNameFields(
  source: Record<string, unknown> | null | undefined,
  kind: LinkableType,
): string | null {
  if (!source) return null;

  if (kind === "brand") {
    return (
      normalizeEntityName(source.name) ?? normalizeEntityName(source.brand_name)
    );
  }

  return (
    normalizeEntityName(source.name) ??
    normalizeEntityName(source.category_name) ??
    normalizeEntityName(source.title)
  );
}

function isBannerLabelNotBrandName(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (GENERIC_TITLES.has(normalized)) return true;
  if (/in[\s-]?house[\s-]?brand/i.test(normalized)) return true;
  if (/featured[\s-]?brand/i.test(normalized)) return true;
  return false;
}

function normalizeBrandName(value: unknown): string | null {
  const normalized = normalizeEntityName(value);
  if (!normalized) return null;
  if (isBannerLabelNotBrandName(normalized)) return null;
  return normalized;
}

function readBrandNameFields(
  source: Record<string, unknown> | null | undefined,
): string | null {
  if (!source) return null;
  return (
    normalizeBrandName(source.name) ?? normalizeBrandName(source.brand_name)
  );
}

function lookupBrandNameById(
  brandsList: BrandLookupItem[] | undefined,
  primaryId: number | undefined,
): string {
  if (primaryId == null || !brandsList?.length) return "";

  const matched = brandsList.find(
    (brand) => Number(brand.id ?? brand.brand_id) === primaryId,
  );
  return (
    normalizeBrandName(matched?.name) ??
    normalizeBrandName(matched?.brand_name) ??
    ""
  );
}

function extractBrandName(
  item: BannerItemLike,
  links: BannerLinkLike[],
  brandsList?: BrandLookupItem[],
  primaryId?: number,
): string {
  const itemRec = item as Record<string, unknown>;

  const fromItem =
    readBrandNameFields(itemRec) ??
    readBrandNameFields(itemRec.brand as Record<string, unknown> | undefined);
  if (fromItem) return fromItem;

  for (const link of links) {
    const linkRec = link as Record<string, unknown>;
    const fromLink =
      readBrandNameFields(linkRec.linkable as Record<string, unknown> | undefined) ??
      readBrandNameFields(linkRec);
    if (fromLink) return fromLink;
  }

  const fromCatalog = lookupBrandNameById(brandsList, primaryId);
  if (fromCatalog) return fromCatalog;

  return "";
}

function extractEntityName(
  item: BannerItemLike,
  links: BannerLinkLike[],
  kind: LinkableType,
  brandsList?: BrandLookupItem[],
  primaryId?: number,
): string {
  if (kind === "brand") {
    return extractBrandName(item, links, brandsList, primaryId);
  }

  const itemRec = item as Record<string, unknown>;
  const fromItem =
    readNameFields(itemRec, kind) ??
    readNameFields(itemRec.brand as Record<string, unknown> | undefined, kind) ??
    (parseLinkableType(String(item.type ?? "")) === kind
      ? normalizeEntityName(item.title)
      : null) ??
    normalizeEntityName(item.label_key);

  if (fromItem) return fromItem;

  for (const link of links) {
    const linkRec = link as Record<string, unknown>;
    const fromLink =
      readNameFields(linkRec, kind) ??
      readNameFields(linkRec.linkable as Record<string, unknown> | undefined, kind);
    if (fromLink) return fromLink;
  }

  return "";
}

function getBannerLinks(item: BannerItemLike): BannerLinkLike[] {
  return (
    (item.banner_links && item.banner_links.length > 0
      ? item.banner_links
      : item.links) ?? []
  );
}

function rewriteLegacyBrandListingUrl(
  url: string,
  item: BannerItemLike,
  links: BannerLinkLike[],
  brandsList?: BrandLookupItem[],
): string | null {
  try {
    const parsed = new URL(url, "https://womancart.in");
    const brandIds =
      parsed.searchParams.get("brandIds") ?? parsed.searchParams.get("brand_id");
    if (!brandIds) return null;

    const primaryId = Number(brandIds.split(",")[0]?.trim());
    if (!Number.isFinite(primaryId)) return null;

    const brandName = extractEntityName(
      item,
      links,
      "brand",
      brandsList,
      primaryId,
    );
    if (!brandName) return null;

    return buildBrandUrl(brandName, { brandIds: primaryId });
  } catch {
    return null;
  }
}

/**
 * Normalises a Laravel model name (e.g. `App\Models\Category`) or short
 * type string (`category`, `brand`, `product`) into a known `LinkableType`.
 */
export function parseLinkableType(raw?: string | null): LinkableType | null {
  if (!raw) return null;
  const v = String(raw).toLowerCase();
  if (v.includes("product")) return "product";
  if (v.includes("brand")) return "brand";
  if (v.includes("category")) return "category";
  return null;
}

/**
 * Builds the listing URL for a banner tile.
 * Pass `extras.typeParam` to append `&type=...` (used by some sections to
 * preserve filter context like `featured_brands`).
 */
export function getBannerNavigationUrl(
  item: BannerItemLike | null | undefined,
  extras?: {
    typeParam?: string;
    fallbackUrl?: string;
    brandsList?: BrandLookupItem[];
  },
): string {
  const fallback = withDeliveryModeInUrl(extras?.fallbackUrl ?? FALLBACK_URL);
  if (!item) return fallback;

  const links = getBannerLinks(item);

  if (item.url && typeof item.url === "string" && item.url.trim() !== "") {
    const trimmedUrl = item.url.trim();
    const rewritten = rewriteLegacyBrandListingUrl(
      trimmedUrl,
      item,
      links,
      extras?.brandsList,
    );
    return withDeliveryModeInUrl(rewritten ?? trimmedUrl);
  }

  if (!links.length) return fallback;

  // Prefer per-link `linkable_type`, then short `link.type`, then item-level `type`.
  const inferredFromLinks = links
    .map((l) => parseLinkableType(l.linkable_type) ?? parseLinkableType(l.type))
    .find((t): t is LinkableType => Boolean(t));
  const linkable: LinkableType | null =
    inferredFromLinks ?? parseLinkableType(item.type);

  if (!linkable) return fallback;

  const ids = links
    .map((l) => l.linkable_id)
    .filter((id): id is number => typeof id === "number" && Number.isFinite(id));

  if (!ids.length) return fallback;

  const idCsv = ids.join(",");
  const primaryId = ids[0];
  const typeParam = extras?.typeParam
    ? { type: extras.typeParam }
    : undefined;

  switch (linkable) {
    case "brand": {
      const brandName = extractEntityName(
        item,
        links,
        "brand",
        extras?.brandsList,
        primaryId,
      );
      if (brandName) {
        return withDeliveryModeInUrl(
          buildBrandUrl(brandName, {
            brandIds: ids.length === 1 ? primaryId : idCsv,
            ...typeParam,
          }),
        );
      }
      return withDeliveryModeInUrl(
        `/product/product-category?brandIds=${idCsv}${
          extras?.typeParam
            ? `&type=${encodeURIComponent(extras.typeParam)}`
            : ""
        }`,
      );
    }
    case "category": {
      const categoryName = extractEntityName(item, links, "category");
      if (categoryName) {
        return withDeliveryModeInUrl(
          buildCategoryUrl([categoryName], {
            categoryIds: ids.length === 1 ? primaryId : idCsv,
            ...typeParam,
          }),
        );
      }
      return withDeliveryModeInUrl(
        `/product/product-category?categoryIds=${idCsv}${
          extras?.typeParam
            ? `&type=${encodeURIComponent(extras.typeParam)}`
            : ""
        }`,
      );
    }
    case "product":
      return withDeliveryModeInUrl(
        `/product/product-category?productIds=${idCsv}${
          extras?.typeParam
            ? `&type=${encodeURIComponent(extras.typeParam)}`
            : ""
        }`,
      );
  }
}
