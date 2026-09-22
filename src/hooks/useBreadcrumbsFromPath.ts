"use client";

/**
 * useBreadcrumbsFromPath
 *
 * Derives breadcrumb items automatically from the current URL pathname for the
 * new SEO-friendly URL structure.
 *
 * Examples:
 *   /category/kids                                      → Home > Kids
 *   /category/kids/school-stationary/art-n-craft        → Home > Kids > School Stationary > Art N Craft
 *   /category/kids/school-stationary/product/soap-dispenser
 *                                                       → Home > Kids > School Stationary > Soap Dispenser
 *   /brand/maybelline                                   → Home > Brands > Maybelline
 *   /brand/maybelline/product/soap-dispenser            → Home > Brands > Maybelline > Soap Dispenser
 *
 * Returns null when the pathname is NOT one of the new URL formats (i.e. old
 * /product/product-category or /product/detail URLs). In that case the calling
 * page should fall back to its own legacy breadcrumb logic.
 */

import { usePathname } from "next/navigation";
import { unslugify } from "@/utils/urlBuilder";

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export function useBreadcrumbsFromPath(): BreadcrumbItem[] | null {
  const pathname = usePathname() || "";

  // ── /category/[...slug] ────────────────────────────────────────────────────
  if (pathname.startsWith("/category/")) {
    // Strip leading "/category/" and trailing slash, then split
    const raw = pathname.replace(/^\/category\//, "").replace(/\/$/, "");
    const segments = raw.split("/").filter(Boolean);

    const productIdx = segments.indexOf("product");

    // Segments that represent the category hierarchy (everything before 'product')
    const categorySegments =
      productIdx === -1 ? segments : segments.slice(0, productIdx);

    // The product slug is the segment right after 'product' (if any)
    const productSlug =
      productIdx !== -1 ? segments[productIdx + 1] : undefined;

    const crumbs: BreadcrumbItem[] = [{ label: "Home", path: "/" }];

    // Build one crumb per category level, each one linking to its own URL
    // (all except the last category level, which is the current page — unless
    //  we're also showing a product crumb, in which case every category links)
    const isProductPage = Boolean(productSlug);

    categorySegments.forEach((seg, idx) => {
      const isLastCategorySegment = idx === categorySegments.length - 1;
      const linkPath = `/category/${categorySegments.slice(0, idx + 1).join("/")}`;

      crumbs.push({
        label: unslugify(seg),
        // Give a link to every category crumb EXCEPT the last one
        // when there is no product crumb following it (i.e. it is the current page)
        path: isProductPage || !isLastCategorySegment ? linkPath : undefined,
      });
    });

    // Product crumb — always the last item, no link (current page)
    if (productSlug) {
      crumbs.push({ label: unslugify(productSlug) });
    }

    return crumbs;
  }

  // ── /brand/[slug] or /brand/[slug]/product/[productSlug] ──────────────────
  if (pathname.startsWith("/brand/")) {
    const raw = pathname.replace(/^\/brand\//, "").replace(/\/$/, "");
    const segments = raw.split("/").filter(Boolean);

    // segments[0] = brand slug
    // segments[1] = "product" (if present)
    // segments[2] = product slug (if present)
    const brandSlug = segments[0] || "";
    const productSlug =
      segments[1] === "product" ? segments[2] : undefined;

    const crumbs: BreadcrumbItem[] = [{ label: "Home", path: "/" }];

    crumbs.push({
      label: unslugify(brandSlug),
      // Link to brand listing when a product crumb follows; otherwise current page (no link)
      path: productSlug ? `/brand/${brandSlug}` : undefined,
    });

    if (productSlug) {
      crumbs.push({ label: unslugify(productSlug) });
    }

    return crumbs;
  }

  // Not a new-format URL — caller should use its own legacy breadcrumb logic
  return null;
}
