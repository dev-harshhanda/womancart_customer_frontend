// Product detail page for URLs like:
//   /product/maybelline-superstay-matte-ink
//
// The slug segment is decorative (SEO / readability).
// Data fetching reads product_id from the query string,
// exactly the same as the original /product/detail page.
// Note: Next.js static segments (/product/detail, /product/product-category,
// /product/kit-detail) take priority over this dynamic segment, so those
// existing pages are unaffected.
import type { Metadata } from "next";
import ProductDetailPage from "../detail/page";
import {
  generateProductPageMetadata,
  fetchProductDetailResponse,
  extractSeo,
} from "@/lib/seoMetadata";
import SeoJsonLd, { type ProductSchemaData } from "@/components/seo/SeoJsonLd";
import SeoBody from "@/components/seo/SeoBody";

type PageProps = {
  params: Promise<{ slug?: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return generateProductPageMetadata({
    productSlug: resolvedParams?.slug || "",
    searchParams: resolvedSearchParams,
  });
}

function toProductSchema(data: any): ProductSchemaData | undefined {
  if (!data || typeof data !== "object") return undefined;
  const images = Array.isArray(data.images)
    ? data.images.filter((x: unknown) => typeof x === "string")
    : undefined;
  return {
    name: data.name || data.product_name,
    description: data.description,
    image: images && images.length > 0 ? images : data.image,
    sku: data.sku || (data.id != null ? String(data.id) : undefined),
    brand: data.brand?.name,
    price: data.price?.store_price ?? data.price?.final_price ?? data.final_price,
    currency: "INR",
    availability: data.in_stock
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock",
    ratingValue: data.average_rating,
    reviewCount: data.total_reviews ?? data.reviews_count,
  };
}

export default async function ProductSlugPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const response = await fetchProductDetailResponse({
    productSlug: resolvedParams?.slug || "",
    searchParams: resolvedSearchParams,
  });
  const seo = extractSeo(response);
  const product = toProductSchema(response?.data);

  return (
    <>
      <SeoJsonLd seo={seo} product={product} />
      <ProductDetailPage />
      <SeoBody seo={seo} />
    </>
  );
}
