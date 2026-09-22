/**
 * Shape of the `seo` object returned by the backend SEO-migration APIs.
 *
 * Example (from backend):
 * {
 *   "meta_title": "...",
 *   "meta_description": "...",
 *   "meta_keywords": ["..."],
 *   "canonical_url": "https://www.origin.womancart.in/...",
 *   "h1": "...",
 *   "h2_tags": "Face Makeup | Eye Makeup | ...",
 *   "schema_type": "CollectionPage + BreadcrumbList + FAQPage",
 *   "robots": "index, follow",
 *   "og": { "title", "description", "url", "image", "type", ... },
 *   "twitter": { "card", "title", "description", "image", "site" },
 *   "breadcrumb_path": "Home > Makeup",
 *   "faq_content": "...",
 *   "seo_html_content": "<div class=\"seo-content\">..."
 * }
 */
export interface SeoOpenGraph {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  type?: string;
  site_name?: string;
  [key: string]: unknown;
}

export interface SeoTwitter {
  card?: string;
  title?: string;
  description?: string;
  image?: string;
  site?: string;
  [key: string]: unknown;
}

export interface SeoFaqItem {
  question?: string;
  answer?: string;
  [key: string]: unknown;
}

export interface SeoObject {
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: string | string[];
  canonical_url?: string;
  h1?: string;
  h2_tags?: string;
  schema_type?: string;
  robots?: string;
  og?: SeoOpenGraph;
  twitter?: SeoTwitter;
  breadcrumb_path?: string;
  /** Either an HTML string or an array of {question, answer}. */
  faq_content?: string | SeoFaqItem[];
  seo_html_content?: string;
  keywords?: string | string[];
  [key: string]: unknown;
}

/** Generic API envelope that carries an SEO object plus the page entity. */
export interface SeoApiResponse<T = unknown> {
  statusCode?: number;
  status?: boolean;
  message?: string;
  data?: T & { seo?: SeoObject };
  seo?: SeoObject;
}
