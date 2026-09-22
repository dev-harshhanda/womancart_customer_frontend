import { buildUrlsetXml, getCategoryUrls, xmlResponse } from "@/lib/sitemapData";

export const dynamic = "force-dynamic";

export async function GET() {
  const urls = await getCategoryUrls();
  return xmlResponse(buildUrlsetXml(urls));
}
