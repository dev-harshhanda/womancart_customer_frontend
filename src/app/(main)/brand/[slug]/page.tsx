// Brand listing page for URLs like:
//   /brand/maybelline
//
// The slug segment is decorative (SEO / readability).
// Data fetching reads brandIds from the query string,
// exactly the same as the original /product/product-category page.
import type { Metadata } from "next";
import ProductCategoryPage from "../../product/product-category/page";
import {
  generateBrandPageMetadata,
  fetchBrandSeoData,
  extractSeo,
} from "@/lib/seoMetadata";
import SeoJsonLd from "@/components/seo/SeoJsonLd";
import SeoBody from "@/components/seo/SeoBody";

type PageProps = {
  params: Promise<{ slug?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  return generateBrandPageMetadata({ brandSlug: resolved?.slug || "" });
}

export default async function BrandSlugPage({ params }: PageProps) {
  const resolved = await params;
  const res = await fetchBrandSeoData(resolved?.slug || "");
  const seo = extractSeo(res);

  return (
    <>
      <SeoJsonLd seo={seo} />
      <ProductCategoryPage />
      <SeoBody seo={seo} />
    </>
  );
}
