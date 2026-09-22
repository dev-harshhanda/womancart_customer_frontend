import { slugify } from "@/utils/urlBuilder";

export type ListingPathContext = {
  isCategoryPage: boolean;
  isBrandPage: boolean;
  /** Leaf category slug or brand slug from the path. */
  pathLeafSlug: string | null;
  /** Present when the path contains a `/product/` segment. */
  productSlug: string | null;
};

/** Parse listing pathname into category / brand / product context. */
export function getListingPathContext(pathname: string | null): ListingPathContext {
  const isCategoryPage = !!pathname?.startsWith("/category/");
  const isBrandPage = !!pathname?.startsWith("/brand/");
  const segments = pathname?.split("/").filter(Boolean) ?? [];

  let pathLeafSlug: string | null = null;
  let productSlug: string | null = null;

  if (isCategoryPage) {
    const categorySegments = segments.slice(1);
    const productIndex = categorySegments.indexOf("product");
    if (productIndex !== -1) {
      productSlug = categorySegments[productIndex + 1] ?? null;
      const categoryOnly = categorySegments.slice(0, productIndex);
      pathLeafSlug = categoryOnly[categoryOnly.length - 1] ?? null;
    } else {
      pathLeafSlug = categorySegments[categorySegments.length - 1] ?? null;
    }
  } else if (isBrandPage) {
    const productIndex = segments.indexOf("product");
    if (productIndex !== -1) {
      productSlug = segments[productIndex + 1] ?? null;
      pathLeafSlug = segments[1] ?? null;
    } else {
      pathLeafSlug = segments[1] ?? null;
    }
  }

  return {
    isCategoryPage,
    isBrandPage,
    pathLeafSlug,
    productSlug,
  };
}

/** Match a category or brand record by slugified name fields. */
export function matchEntityBySlug(
  list: any[],
  slug: string,
  nameKeys: string[] = ["name", "category_name", "brand_name"],
): any | null {
  if (!slug || !list.length) return null;
  return (
    list.find((item) =>
      nameKeys.some((key) => slugify(String(item?.[key] ?? "")) === slug),
    ) ?? null
  );
}

/** Join numeric IDs from multiple comma-separated / scalar sources. */
export function joinCommaSeparatedIds(
  ...sources: Array<string | number | null | undefined>
): string | undefined {
  const idSet = new Set<number>();

  for (const source of sources) {
    if (source === null || source === undefined || source === "") continue;
    String(source)
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => {
        const parsed = Number(part);
        if (!Number.isNaN(parsed)) idSet.add(parsed);
      });
  }

  if (idSet.size === 0) return undefined;
  return [...idSet].sort((a, b) => a - b).join(",");
}

/** Extract trailing numeric id from slugs like `lipstick-240`. */
export function extractIdFromSlug(slug: string | null): string | null {
  if (!slug) return null;
  const trimmed = slug.trim();
  if (/^\d+$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/-(\d+)$/);
  return match?.[1] ?? null;
}
