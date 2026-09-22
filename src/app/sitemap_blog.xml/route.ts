import { buildUrlsetXml, getBlogUrls, xmlResponse } from "@/lib/sitemapData";

export const dynamic = "force-dynamic";

export async function GET() {
  const urls = await getBlogUrls();
  return xmlResponse(buildUrlsetXml(urls));
}
