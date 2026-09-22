// Blog detail page for URLs like:
//   /blogs/my-blog-post-slug
//
// The interactive content lives in BlogDetailClient; this server wrapper
// adds SEO <head> metadata and JSON-LD (Article) from /api/blogs/{slug}.
import type { Metadata } from "next";
import BlogDetailClient from "./BlogDetailClient";
import {
  generateBlogPageMetadata,
  fetchBlogSeoData,
  extractSeo,
} from "@/lib/seoMetadata";
import SeoJsonLd, { type ArticleSchemaData } from "@/components/seo/SeoJsonLd";
import SeoBody from "@/components/seo/SeoBody";

type PageProps = {
  params: Promise<{ slug?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  return generateBlogPageMetadata({ blogSlug: resolved?.slug || "" });
}

function toArticleSchema(res: any): ArticleSchemaData | undefined {
  const data = res?.data ?? res;
  if (!data || typeof data !== "object") return undefined;
  return {
    headline: data.title,
    description: data.description,
    image: data.image || data.featured_image || data.thumbnail,
    datePublished: data.created_at,
    dateModified: data.updated_at || data.created_at,
    author:
      data.posted_by_name || data.posted_by || data.author || data.created_by,
  };
}

export default async function BlogSlugPage({ params }: PageProps) {
  const resolved = await params;
  const res = await fetchBlogSeoData(resolved?.slug || "");
  const seo = extractSeo(res);
  const article = toArticleSchema(res);

  return (
    <>
      <SeoJsonLd seo={seo} article={article} />
      <BlogDetailClient />
      <SeoBody seo={seo} />
    </>
  );
}
