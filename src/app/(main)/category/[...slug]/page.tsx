// Smart router for category and contextual product URLs.
//
// Routes handled:
//   /category/makeup                     → category listing
//   /category/makeup/lips                → category listing
//   /category/makeup/lips/lipstick       → category listing
//   /category/makeup/lips/product/[name] → product detail (nested in category context)
//
// The "product" segment acts as a separator between the category path and the
// product slug. If "product" appears in the slug array, we render the product
// detail page; otherwise we render the category listing page.
// In both cases, data fetching reads IDs from the query string (?product_id=,
// ?categoryIds=, etc.) — the slug segments are purely for SEO readability.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProductCategoryPage from "../../product/product-category/page";
import ProductDetailPage from "../../product/detail/page";
import {
  generateCategoryPageMetadata,
  generateProductPageMetadata,
  fetchCategorySeoData,
  fetchProductDetailResponse,
  extractSeo,
} from "@/lib/seoMetadata";
import { slugify } from "@/utils/urlBuilder";
import SeoJsonLd from "@/components/seo/SeoJsonLd";
import SeoBody from "@/components/seo/SeoBody";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const slugArr = Array.isArray(resolvedParams?.slug) ? resolvedParams.slug : [];
  const productIndex = slugArr.indexOf("product");
  const hasProductSegment = productIndex !== -1;

  if (slugArr.length === 1 && slugArr[0] === "search") {
    const sp = new URLSearchParams();
    if (resolvedSearchParams) {
      for (const [key, value] of Object.entries(resolvedSearchParams)) {
        if (typeof value === "string") sp.set(key, value);
        else if (Array.isArray(value) && value[0]) sp.set(key, value[0]);
      }
    }
    const qs = sp.toString();
    redirect(qs ? `/search?${qs}` : "/search");
  }

  if (hasProductSegment) {
    const productSlug = slugArr[productIndex + 1] || "";
    return generateProductPageMetadata({ productSlug, searchParams: resolvedSearchParams });
  }

  const categorySlug = slugArr[slugArr.length - 1] || "";
  const canonicalPath = slugArr.length > 0 ? `/category/${slugArr.join("/")}` : undefined;
  return generateCategoryPageMetadata({
    categorySlug,
    searchParams: resolvedSearchParams,
    canonicalPath,
  });
}

export default async function CategorySlugPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const slugArr = Array.isArray(resolvedParams?.slug) ? resolvedParams.slug : [];

  if (slugArr.length === 1 && slugArr[0] === "search") {
    const sp = new URLSearchParams();
    if (resolvedSearchParams) {
      for (const [key, value] of Object.entries(resolvedSearchParams)) {
        if (typeof value === "string") sp.set(key, value);
        else if (Array.isArray(value) && value[0]) sp.set(key, value[0]);
      }
    }
    const qs = sp.toString();
    redirect(qs ? `/search?${qs}` : "/search");
  }

  // If the slug contains a "product" segment, render the product detail view.
  // The segments before "product" are the category path (decorative/SEO),
  // and the segment(s) after "product" are the product slug (also decorative).
  const productIndex = slugArr.indexOf("product");
  const hasProductSegment = productIndex !== -1;

  if (hasProductSegment) {
    const productSlug = slugArr[productIndex + 1] || "";
    const response = await fetchProductDetailResponse({
      productSlug,
      searchParams: resolvedSearchParams,
    });
    const seo = extractSeo(response);
    return (
      <>
        <SeoJsonLd seo={seo} />
        <ProductDetailPage />
        <SeoBody seo={seo} />
      </>
    );
  }

  const categorySlug = slugify(slugArr[slugArr.length - 1] || "");
  const seoRes = await fetchCategorySeoData(categorySlug);
  const seo = extractSeo(seoRes);

  return (
    <>
      <SeoJsonLd seo={seo} />
      <ProductCategoryPage />
      <SeoBody seo={seo} />
    </>
  );
}
