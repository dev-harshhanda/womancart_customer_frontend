import { buildUrlsetXml, getProductUrls, xmlResponse } from "@/lib/sitemapData";

export const dynamic = "force-dynamic";

export async function GET() {
  const urls = await getProductUrls();
  return xmlResponse(buildUrlsetXml(urls));
}
