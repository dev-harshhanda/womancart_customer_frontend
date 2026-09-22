// Product detail page nested inside a brand URL context.
//
// Route: /brand/maybelline/product/maybelline-superstay-matte-ink?product_id=240
//
// The [slug] (brand) and [productSlug] segments are decorative (SEO/readability).
// Data fetching reads product_id from the query string, exactly the same as the
// original /product/detail page.
import type { Metadata } from "next";
import ProductDetailPage from "../../../../product/detail/page";
import {
  generateProductPageMetadata,
  fetchProductDetailResponse,
  extractSeo,
} from "@/lib/seoMetadata";
import SeoJsonLd from "@/components/seo/SeoJsonLd";
import SeoBody from "@/components/seo/SeoBody";

type PageProps = {
  params: Promise<{ slug?: string; productSlug?: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return generateProductPageMetadata({
    productSlug: resolvedParams?.productSlug || "",
    searchParams: resolvedSearchParams,
  });
}

export default async function BrandContextProductPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const response = await fetchProductDetailResponse({
    productSlug: resolvedParams?.productSlug || "",
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
