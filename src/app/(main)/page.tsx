// Homepage server wrapper: provides SEO <head> metadata (from /api/seo/homepage)
// plus Organization + WebSite + page JSON-LD. The interactive homepage lives in
// HomeClient.
import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import {
  generateHomepageMetadata,
  fetchHomepageSeoData,
  extractSeo,
} from "@/lib/seoMetadata";
import SeoJsonLd from "@/components/seo/SeoJsonLd";
import SeoBody from "@/components/seo/SeoBody";

export async function generateMetadata(): Promise<Metadata> {
  return generateHomepageMetadata();
}

export default async function HomePage() {
  const res = await fetchHomepageSeoData();
  const seo = extractSeo(res);
  return (
    <>
      <SeoJsonLd seo={seo} includeOrganization />
      <HomeClient />
      <SeoBody seo={seo} />
    </>
  );
}
