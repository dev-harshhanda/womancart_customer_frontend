import { buildUrlsetXml, getStaticPageUrls, xmlResponse } from "@/lib/sitemapData";

export const dynamic = "force-dynamic";

export async function GET() {
  const urls = getStaticPageUrls();
  return xmlResponse(buildUrlsetXml(urls));
}
