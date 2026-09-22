import type { MetadataRoute } from "next";
import { IS_STAGING, SITE_URL } from "@/constants/url";

/**
 * Staging must never be crawled or indexed — this is the crawling half of
 * the guarantee (see middleware.ts for the indexing half, X-Robots-Tag,
 * which also covers non-HTML responses like the sitemap files themselves).
 */
export default function robots(): MetadataRoute.Robots {
  const sitemap = `${SITE_URL.replace(/\/$/, "")}/sitemap_index.xml`;

  if (IS_STAGING) {
    return {
      rules: { userAgent: "*", disallow: "/" },
      sitemap,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/account/",
          "/cart/",
          "/checkout/",
          "/wishlist/",
          "/search/",
          "/orders/",
          "/api/",
          "/admin/",
          "/cdn-cgi/",
          "/*?page=",
          "/*?sort=",
          "/*?filter=",
          "/*?variant=",
          "/*?ref=",
          "/*?utm_",
        ],
      },
      {
        userAgent: "Googlebot",
        disallow: ["/account/", "/cart/", "/checkout/", "/*?variant="],
      },
      { userAgent: "Googlebot-Image", allow: "/" },
      { userAgent: "GPTBot", disallow: "/" },
      { userAgent: "CCBot", disallow: "/" },
      { userAgent: "Claude-Web", disallow: "/" },
      { userAgent: "anthropic-ai", disallow: "/" },
      { userAgent: "Google-Extended", disallow: "/" },
    ],
    sitemap,
  };
}
