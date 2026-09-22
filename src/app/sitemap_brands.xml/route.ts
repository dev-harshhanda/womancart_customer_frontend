import { buildUrlsetXml, getBrandUrls, xmlResponse } from "@/lib/sitemapData";

export const dynamic = "force-dynamic";

export async function GET() {
  const urls = await getBrandUrls();
  return xmlResponse(buildUrlsetXml(urls));
}
