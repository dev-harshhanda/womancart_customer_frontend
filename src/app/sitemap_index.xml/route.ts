import { SITE_URL } from "@/constants/url";
import { buildSitemapIndexXml, xmlResponse } from "@/lib/sitemapData";

const SITEMAP_FILES = [
  "sitemap_pages.xml",
  "sitemap_categories.xml",
  "sitemap_collections.xml",
  "sitemap_brands.xml",
  "sitemap_products.xml",
  "sitemap_images.xml",
  "sitemap_blog.xml",
];

export const dynamic = "force-dynamic";

export async function GET() {
  const lastmod = new Date().toISOString();
  const base = SITE_URL.replace(/\/$/, "");
  const entries = SITEMAP_FILES.map((file) => ({ loc: `${base}/${file}`, lastmod }));
  return xmlResponse(buildSitemapIndexXml(entries));
}
