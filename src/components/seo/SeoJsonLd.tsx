import React from "react";
import { SITE_URL } from "@/constants/url";
import { slugify } from "@/utils/urlBuilder";
import type { SeoObject, SeoFaqItem } from "@/types/seo";

/**
 * Renders JSON-LD structured data built from `seo.schema_type` plus page data,
 * following the automation-rules doc (Product, CollectionPage, Brand, Article,
 * BreadcrumbList, FAQPage, WebSite, Organization, WebPage).
 *
 * This is a server-safe component (no hooks) and emits one
 * <script type="application/ld+json"> per schema object.
 */
export interface ProductSchemaData {
  name?: string;
  description?: string;
  image?: string | string[];
  sku?: string;
  brand?: string;
  price?: number | string;
  currency?: string;
  availability?: string;
  ratingValue?: number | string;
  reviewCount?: number | string;
  url?: string;
}

export interface ArticleSchemaData {
  headline?: string;
  description?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  author?: string;
  url?: string;
}

interface SeoJsonLdProps {
  seo?: SeoObject | null;
  product?: ProductSchemaData;
  article?: ArticleSchemaData;
  /** Force-include Organization + WebSite (used on the homepage). */
  includeOrganization?: boolean;
}

function parseSchemaTokens(schemaType?: string): string[] {
  if (!schemaType || typeof schemaType !== "string") return [];
  return schemaType
    .split(/[+,/|]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function buildBreadcrumb(seo: SeoObject): Record<string, unknown> | null {
  const path = typeof seo.breadcrumb_path === "string" ? seo.breadcrumb_path : "";
  const parts = path
    .split(/>|\/|›/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  let accumulated = "";
  const itemListElement = parts.map((name, index) => {
    let url: string | undefined;
    if (index === 0) {
      url = SITE_URL;
    } else if (index === parts.length - 1 && typeof seo.canonical_url === "string") {
      url = seo.canonical_url;
    } else {
      accumulated += `/${slugify(name)}`;
      url = `${SITE_URL}${accumulated}`;
    }
    return {
      "@type": "ListItem",
      position: index + 1,
      name,
      ...(url ? { item: url } : {}),
    };
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  };
}

function buildFaqPage(seo: SeoObject): Record<string, unknown> | null {
  const faq = seo.faq_content;
  if (!Array.isArray(faq) || faq.length === 0) return null;
  const mainEntity = (faq as SeoFaqItem[])
    .map((item) => {
      const question = typeof item?.question === "string" ? item.question.trim() : "";
      const answer = typeof item?.answer === "string" ? item.answer.trim() : "";
      if (!question || !answer) return null;
      return {
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      };
    })
    .filter(Boolean);
  if (mainEntity.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  };
}

function buildProduct(
  seo: SeoObject,
  data?: ProductSchemaData,
): Record<string, unknown> | null {
  if (!data?.name) return null;
  const image = data.image ?? (seo.og?.image as string | undefined);
  const node: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: data.name,
    ...(data.description || seo.meta_description
      ? { description: data.description || seo.meta_description }
      : {}),
    ...(image ? { image } : {}),
    ...(data.sku ? { sku: data.sku } : {}),
    ...(data.brand ? { brand: { "@type": "Brand", name: data.brand } } : {}),
    ...(seo.canonical_url || data.url
      ? { url: data.url || seo.canonical_url }
      : {}),
  };

  if (data.price != null && data.price !== "") {
    node.offers = {
      "@type": "Offer",
      price: String(data.price),
      priceCurrency: data.currency || "INR",
      availability:
        data.availability ||
        "https://schema.org/InStock",
      ...(seo.canonical_url || data.url
        ? { url: data.url || seo.canonical_url }
        : {}),
    };
  }

  const rating = Number(data.ratingValue);
  const reviews = Number(data.reviewCount);
  if (Number.isFinite(rating) && rating > 0) {
    node.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: String(data.ratingValue),
      ...(Number.isFinite(reviews) && reviews > 0
        ? { reviewCount: String(data.reviewCount) }
        : {}),
    };
  }

  return node;
}

function buildArticle(
  seo: SeoObject,
  data?: ArticleSchemaData,
): Record<string, unknown> | null {
  const headline = data?.headline || seo.meta_title || seo.h1;
  if (!headline) return null;
  const image = data?.image || (seo.og?.image as string | undefined);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    ...(data?.description || seo.meta_description
      ? { description: data?.description || seo.meta_description }
      : {}),
    ...(image ? { image } : {}),
    ...(data?.datePublished ? { datePublished: data.datePublished } : {}),
    ...(data?.dateModified ? { dateModified: data.dateModified } : {}),
    ...(data?.author
      ? { author: { "@type": "Person", name: data.author } }
      : {}),
    ...(data?.url || seo.canonical_url
      ? { mainEntityOfPage: data?.url || seo.canonical_url }
      : {}),
  };
}

function buildGenericPage(
  seo: SeoObject,
  schemaType: string,
): Record<string, unknown> | null {
  const name = seo.h1 || seo.meta_title;
  if (!name) return null;
  return {
    "@context": "https://schema.org",
    "@type": schemaType,
    name,
    ...(seo.meta_description ? { description: seo.meta_description } : {}),
    ...(seo.canonical_url ? { url: seo.canonical_url } : {}),
  };
}

function buildOrganization(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Womancart",
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo.png`,
  };
}

function buildWebSite(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Womancart",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/all-products?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

function SeoJsonLd({ seo, product, article, includeOrganization }: SeoJsonLdProps) {
  const s = seo ?? {};
  const tokens = parseSchemaTokens(s.schema_type);
  const lower = tokens.map((t) => t.toLowerCase());

  const schemas: Record<string, unknown>[] = [];

  if (includeOrganization) {
    schemas.push(buildOrganization());
    schemas.push(buildWebSite());
  }

  for (const token of lower) {
    if (token.includes("breadcrumb")) {
      const bc = buildBreadcrumb(s);
      if (bc) schemas.push(bc);
    } else if (token.includes("faq")) {
      const faq = buildFaqPage(s);
      if (faq) schemas.push(faq);
    } else if (token === "product") {
      const p = buildProduct(s, product);
      if (p) schemas.push(p);
    } else if (token === "article" || token === "blogposting" || token === "newsarticle") {
      const a = buildArticle(s, article);
      if (a) schemas.push(a);
    } else if (token === "organization") {
      schemas.push(buildOrganization());
    } else if (token === "website") {
      schemas.push(buildWebSite());
    } else if (
      token === "collectionpage" ||
      token === "brand" ||
      token === "webpage" ||
      token === "itemlist" ||
      token === "aboutpage" ||
      token === "contactpage"
    ) {
      const normalized =
        token === "collectionpage"
          ? "CollectionPage"
          : token === "brand"
            ? "Brand"
            : token === "aboutpage"
              ? "AboutPage"
              : token === "contactpage"
                ? "ContactPage"
                : token === "itemlist"
                  ? "ItemList"
                  : "WebPage";
      const node = buildGenericPage(s, normalized);
      if (node) schemas.push(node);
    }
  }

  // Always attempt breadcrumb/product/article even when schema_type omits them
  // but the data is available (defensive, avoids duplicates).
  if (product?.name && !lower.includes("product")) {
    const p = buildProduct(s, product);
    if (p) schemas.push(p);
  }
  if (!schemas.some((x) => x["@type"] === "BreadcrumbList")) {
    const bc = buildBreadcrumb(s);
    if (bc) schemas.push(bc);
  }
  if (!schemas.some((x) => x["@type"] === "FAQPage")) {
    const faq = buildFaqPage(s);
    if (faq) schemas.push(faq);
  }

  if (schemas.length === 0) return null;

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}

export default SeoJsonLd;
