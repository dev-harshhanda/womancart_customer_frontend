// Collection / discovery page for URLs like:
//   /collections/womens-essentials
//   /collections/skin-concerns
//
// SEO comes from /api/collections/{slug}. The product listing reuses the
// existing product-category client page (filters resolved from query/session).
import type { Metadata } from "next";
import ProductCategoryPage from "../../product/product-category/page";
import {
  generateCollectionPageMetadata,
  fetchCollectionSeoData,
  extractSeo,
} from "@/lib/seoMetadata";
import SeoJsonLd from "@/components/seo/SeoJsonLd";
import SeoBody from "@/components/seo/SeoBody";

type PageProps = {
  params: Promise<{ slug?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  return generateCollectionPageMetadata({ collectionSlug: resolved?.slug || "" });
}

export default async function CollectionSlugPage({ params }: PageProps) {
  const resolved = await params;
  const res = await fetchCollectionSeoData(resolved?.slug || "");
  const seo = extractSeo(res);

  return (
    <>
      <SeoJsonLd seo={seo} />
      <ProductCategoryPage />
      <SeoBody seo={seo} />
    </>
  );
}
