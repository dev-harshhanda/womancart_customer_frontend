import { buildUrlsetXml, xmlResponse } from "@/lib/sitemapData";

/**
 * Placeholder: there is no backend endpoint that lists all collections today
 * (only GET /collections/{slug} for a single collection's SEO data). Wire
 * this up to a real list source once one exists.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return xmlResponse(buildUrlsetXml([]));
}
