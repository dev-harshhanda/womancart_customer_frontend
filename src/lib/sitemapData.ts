/**
 * Shared data-fetching + XML builders for the split sitemap files
 * (sitemap_index.xml, sitemap_categories.xml, sitemap_products.xml, ...).
 *
 * Each getXUrls() hits the same admin API endpoints the storefront pages use,
 * and reuses the app's own URL builders so sitemap links always match real
 * page URLs (see src/utils/urlBuilder.ts).
 */
import { API_URL, END_POINTS, NODE_API_URL, SITE_URL } from "@/constants/url";
import { buildBrandUrl, buildCategoryUrl, slugify } from "@/utils/urlBuilder";

const ADMIN_HEADERS: Record<string, string> = {
  Accept: "application/json",
  AuthorizationNode: "guest",
  "x-portal": "user",
  app: "anstmasr2588",
};

/** Revalidate the underlying admin API fetches every 6 hours. */
export const SITEMAP_REVALIDATE_SECONDS = 21600;

export type SitemapUrl = {
  loc: string;
  lastmod?: string;
  images?: string[];
};

function absoluteUrl(path: string): string {
  const base = SITE_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function fetchAdminJson(
  path: string,
  init?: RequestInit,
  timeoutMs = 15000,
): Promise<any | null> {
  try {
    const base = API_URL.replace(/\/$/, "");
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: { ...ADMIN_HEADERS, ...(init?.headers || {}) },
      next: { revalidate: SITEMAP_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

type GuestNodeAuth = {
  authorizationNode: string;
  bearerToken: string;
};

let guestNodeAuthPromise: Promise<GuestNodeAuth | null> | null = null;

async function fetchGuestNodeAuth(): Promise<GuestNodeAuth | null> {
  if (guestNodeAuthPromise) return guestNodeAuthPromise;

  guestNodeAuthPromise = (async () => {
    const res = await fetchAdminJson(
      END_POINTS.guestLogin,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fcm_token: "web" }),
      },
      15000,
    );

    const data = res?.data;
    const token = String(data?.jwt_token || res?.jwt_token || "").trim();
    if (!token) return null;

    return {
      authorizationNode: token,
      bearerToken: token,
    };
  })();

  const result = await guestNodeAuthPromise;
  if (!result) guestNodeAuthPromise = null;
  return result;
}

async function fetchNodeJson(
  path: string,
  init?: RequestInit,
  timeoutMs = 15000,
): Promise<any | null> {
  try {
    const base = NODE_API_URL.replace(/\/$/, "");
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        ...ADMIN_HEADERS,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      next: { revalidate: SITEMAP_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchNodeJsonWithGuestAuth(
  path: string,
  init?: RequestInit,
  timeoutMs = 15000,
): Promise<any | null> {
  try {
    const auth = await fetchGuestNodeAuth();
    if (!auth) return null;

    const base = NODE_API_URL.replace(/\/$/, "");
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        ...ADMIN_HEADERS,
        AuthorizationNode: auth.authorizationNode,
        Authorization: auth.bearerToken,
        Cookie: "i18next=en; i18next=en-US",
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
      next: { revalidate: SITEMAP_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok) return null;
    return json;
  } catch {
    return null;
  }
}

/** Run `worker` over `items` with at most `concurrency` in flight at once. */
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function next(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
  return results;
}

/* -------------------------------------------------------------------------- */
/*                                 Categories                                  */
/* -------------------------------------------------------------------------- */

type CategoryNode = {
  id: number;
  name: string;
  slug: string;
  status?: number;
  children?: CategoryNode[];
};

function flattenCategories(nodes: CategoryNode[], ancestors: string[]): SitemapUrl[] {
  const urls: SitemapUrl[] = [];
  for (const node of nodes) {
    if (!node?.name || node.status === 0) continue;
    const chain = [...ancestors, node.name];
    urls.push({ loc: absoluteUrl(buildCategoryUrl(chain, { category_id: node.id })) });
    if (Array.isArray(node.children) && node.children.length > 0) {
      urls.push(...flattenCategories(node.children, chain));
    }
  }
  return urls;
}

export async function getCategoryUrls(): Promise<SitemapUrl[]> {
  const roots: CategoryNode[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await fetchAdminJson(`${END_POINTS.seoCategory}?page=${page}&limit=100`);
    const list = res?.data?.data;
    if (Array.isArray(list)) roots.push(...list);
    totalPages = Math.max(Number(res?.data?.total_pages) || 1, 1);
    page += 1;
  } while (page <= totalPages);

  const seen = new Set<string>();
  return flattenCategories(roots, []).filter((u) => {
    if (seen.has(u.loc)) return false;
    seen.add(u.loc);
    return true;
  });
}

/* -------------------------------------------------------------------------- */
/*                                   Brands                                    */
/* -------------------------------------------------------------------------- */

export async function getBrandUrls(): Promise<SitemapUrl[]> {
  const urls: SitemapUrl[] = [];
  const seen = new Set<string>();
  let page = 1;
  let totalPages = 1;
  do {
    const res = await fetchAdminJson(`${END_POINTS.brands}?page=${page}&limit=200`);
    const list = res?.data?.data;
    if (Array.isArray(list)) {
      for (const brand of list) {
        if (!brand?.name || brand.status === 0) continue;
        const loc = absoluteUrl(buildBrandUrl(brand.name, { brandIds: brand.id }));
        if (seen.has(loc)) continue;
        seen.add(loc);
        urls.push({ loc });
      }
    }
    totalPages = Math.max(Number(res?.data?.total_pages) || 1, 1);
    page += 1;
  } while (page <= totalPages);
  return urls;
}

/* -------------------------------------------------------------------------- */
/*                                  Products                                   */
/* -------------------------------------------------------------------------- */

/**
 * `viewAllProductsName` returns variant PDP slugs in `data.data.short_slugs`
 * (preferred) or `data.data.slugs` — matching storefront navigation URLs.
 */
const PRODUCT_SLUG_PAGE_LIMIT = 500;
const PRODUCT_FETCH_CONCURRENCY = 4;
const PRODUCT_PAGE_TIMEOUT_MS = 25000;

function productSlugsListUrl(page: number): string {
  const basePath = END_POINTS.viewAllProductsName.replace(/^node:/, "");
  const qs = new URLSearchParams({
    page: String(page),
    limit: String(PRODUCT_SLUG_PAGE_LIMIT),
  });
  return `${basePath}?${qs.toString()}`;
}

function extractProductSlugsFromResponse(res: any): string[] {
  const inner = res?.data?.data;
  if (!inner || typeof inner !== "object") return [];

  const slugs =
    inner.short_slugs ??
    inner.shortSlugs ??
    inner.slugs ??
    inner.productSlugs ??
    inner.product_slugs;
  if (!Array.isArray(slugs)) return [];

  return slugs
    .map((slug: unknown) => {
      if (slug && typeof slug === "object") {
        return slugify(
          String(
            (slug as { short_slug?: string; slug?: string }).short_slug ||
              (slug as { slug?: string }).slug ||
              "",
          ).trim(),
        );
      }
      return slugify(String(slug || "").trim());
    })
    .filter(Boolean);
}

function extractProductSlugTotalPages(res: any): number {
  const data = res?.data;
  const fromApi = Number(data?.total_pages);
  if (Number.isFinite(fromApi) && fromApi > 0) return fromApi;

  const count = Number(data?.data_count) || 0;
  if (count <= 0) return 1;
  return Math.max(Math.ceil(count / PRODUCT_SLUG_PAGE_LIMIT), 1);
}

async function fetchProductSlugsPageRaw(page: number): Promise<any | null> {
  return fetchNodeJsonWithGuestAuth(
    productSlugsListUrl(page),
    { method: "GET" },
    PRODUCT_PAGE_TIMEOUT_MS,
  );
}

async function fetchProductSlugsPage(page: number): Promise<string[] | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const res = await fetchProductSlugsPageRaw(page);
    const slugs = extractProductSlugsFromResponse(res);
    if (slugs.length > 0) return slugs;
  }
  return null;
}

function productSitemapLoc(variantSlug: string): string {
  return absoluteUrl(`/product/${slugify(variantSlug)}`);
}

export async function getProductUrls(): Promise<SitemapUrl[]> {
  const firstRes = await fetchProductSlugsPageRaw(1);
  const firstSlugs = extractProductSlugsFromResponse(firstRes);
  const totalPages = extractProductSlugTotalPages(firstRes);

  const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
  const remainingLists = await runWithConcurrency(
    remainingPages,
    PRODUCT_FETCH_CONCURRENCY,
    fetchProductSlugsPage,
  );

  const seen = new Set<string>();
  const urls: SitemapUrl[] = [];
  for (const list of [firstSlugs, ...remainingLists]) {
    if (!Array.isArray(list)) continue;
    for (const slug of list) {
      if (!slug) continue;
      const loc = productSitemapLoc(slug);
      if (seen.has(loc)) continue;
      seen.add(loc);
      urls.push({ loc });
    }
  }
  return urls;
}

/* -------------------------------------------------------------------------- */
/*                                    Blog                                     */
/* -------------------------------------------------------------------------- */

export async function getBlogUrls(): Promise<SitemapUrl[]> {
  const urls: SitemapUrl[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const form = new FormData();
    form.append("page", String(page));
    form.append("limit", "100");
    const res = await fetchAdminJson(`${END_POINTS.blogs}`, { method: "POST", body: form });
    const list = res?.data?.data;
    if (Array.isArray(list)) {
      for (const blog of list) {
        if (blog?.slug) urls.push({ loc: absoluteUrl(`/blogs/${blog.slug}`) });
      }
    }
    totalPages = Math.max(Number(res?.data?.total_pages) || 1, 1);
    page += 1;
  } while (page <= totalPages);
  return urls;
}

/* -------------------------------------------------------------------------- */
/*                              Static pages                                   */
/* -------------------------------------------------------------------------- */

const STATIC_PAGE_PATHS = [
  "/",
  "/app",
  "/about-us",
  "/contact-us",
  "/faqs",
  "/privacy-policy",
  "/terms-conditions",
  "/refund-return-policy",
  "/brands",
  "/all-products",
  "/blogs",
  "/franchise-opportunity",
  "/Investor-and-relations",
];

export function getStaticPageUrls(): SitemapUrl[] {
  return STATIC_PAGE_PATHS.map((path) => ({ loc: absoluteUrl(path) }));
}

/* -------------------------------------------------------------------------- */
/*                                XML builders                                 */
/* -------------------------------------------------------------------------- */

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildUrlsetXml(urls: SitemapUrl[]): string {
  const body = urls
    .map((u) => {
      const lastmod = u.lastmod ? `<lastmod>${escapeXml(u.lastmod)}</lastmod>` : "";
      return `<url><loc>${escapeXml(u.loc)}</loc>${lastmod}</url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export function buildImageUrlsetXml(urls: SitemapUrl[]): string {
  const body = urls
    .filter((u) => u.images && u.images.length > 0)
    .map((u) => {
      const images = (u.images || [])
        .map((img) => `<image:image><image:loc>${escapeXml(img)}</image:loc></image:image>`)
        .join("");
      return `<url><loc>${escapeXml(u.loc)}</loc>${images}</url>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${body}</urlset>`;
}

export function buildSitemapIndexXml(entries: { loc: string; lastmod: string }[]): string {
  const body = entries
    .map((e) => `<sitemap><loc>${escapeXml(e.loc)}</loc><lastmod>${escapeXml(e.lastmod)}</lastmod></sitemap>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=UTF-8",
      "Cache-Control": `public, max-age=0, s-maxage=${SITEMAP_REVALIDATE_SECONDS}, stale-while-revalidate`,
    },
  });
}
