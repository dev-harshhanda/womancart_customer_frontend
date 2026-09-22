import { buildImageUrlsetXml, getProductUrls, xmlResponse } from "@/lib/sitemapData";

export const dynamic = "force-dynamic";

export async function GET() {
  const urls = await getProductUrls();
  return xmlResponse(buildImageUrlsetXml(urls));
}
