/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo } from "react";

export type ListingSeoSource = {
  /** Plain heading text (API `title`). */
  title?: string | null;
  /** SEO HTML body (API `description`) — may be double-escaped. */
  description?: string | null;
  name?: string | null;
  brand_name?: string | null;
} | null | undefined;

export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value) || /&lt;\/?[a-z]/i.test(value);
}

export function isRichSeoHtml(value: string): boolean {
  const raw = String(value || "").trim();
  if (!raw) return false;
  if (/&lt;\s*\/?\s*(h1|h2|h3|ul|ol|li)\b/i.test(raw)) return true;
  if (/<\s*\/?\s*(h1|h2|h3|ul|ol)\b/i.test(raw) && raw.length > 80) return true;
  if (looksLikeHtml(raw) && raw.length > 400) return true;
  return false;
}

/**
 * Decode HTML entities with string replaces only.
 * Never use textarea/div.innerHTML — that collapses
 * `<p>&lt;h2&gt;…&lt;/h2&gt;</p>` into plain text.
 */
function unescapeHtmlEntities(value: string): string {
  if (!value) return "";
  let text = value;
  for (let i = 0; i < 4; i += 1) {
    if (!/&(?:#\d+|#x[\da-f]+|[a-z]+);/i.test(text)) break;
    const next = text
      .replace(/&nbsp;/gi, "\u00a0")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#0*39;/g, "'")
      .replace(/&#x0*27;/gi, "'")
      .replace(/&#(\d+);/g, (_, code) => {
        const n = Number(code);
        return Number.isFinite(n) ? String.fromCharCode(n) : _;
      })
      .replace(/&#x([\da-f]+);/gi, (_, hex) => {
        const n = parseInt(hex, 16);
        return Number.isFinite(n) ? String.fromCharCode(n) : _;
      })
      .replace(/&amp;/gi, "&");
    if (next === text) break;
    text = next;
  }
  return text;
}

const BLOCK_TAG = "h1|h2|h3|h4|ul|ol|div|table|figure|p|section|article";

function unwrapInvalidParagraphs(html: string): string {
  let out = html;
  let prev = "";
  while (out !== prev) {
    prev = out;
    out = out
      .replace(
        new RegExp(
          `<p>\\s*((?:<(?:${BLOCK_TAG})\\b[\\s\\S]*?<\\/(?:${BLOCK_TAG})>\\s*(?:<br\\s*\\/?>\\s*)*)+)\\s*<\\/p>`,
          "gi",
        ),
        "$1",
      )
      .replace(/<p>\s*(<p\b[\s\S]*?<\/p>)\s*<\/p>/gi, "$1");
  }
  return out;
}

/** Make site links root-absolute so they don't stack on the current path. */
function normalizeSeoHref(rawHref: string): string {
  const href = String(rawHref || "").trim();
  if (!href) return href;

  // Keep external / special protocols / hashes / query URLs as-is.
  if (
    /^(https?:|mailto:|tel:|sms:|javascript:|#|data:)/i.test(href) ||
    href.startsWith("//")
  ) {
    return href;
  }

  // Already root-absolute.
  let path = href.startsWith("/") ? href : `/${href.replace(/^\.?\//, "")}`;

  // Collapse accidental duplicates: /brand/sofy/brand/sofy/ → /brand/sofy/
  path = path.replace(/\/{2,}/g, "/");
  const segments = path.split("/").filter(Boolean);
  if (segments.length >= 4 && segments.length % 2 === 0) {
    const half = segments.length / 2;
    const left = segments.slice(0, half).join("/");
    const right = segments.slice(half).join("/");
    if (left === right) {
      path = `/${left}/`;
    }
  }

  // Ensure trailing slash for internal brand/category-style paths (site convention).
  if (
    !path.includes("?") &&
    !path.includes("#") &&
    !/\.[a-z0-9]+$/i.test(path) &&
    !path.endsWith("/")
  ) {
    path = `${path}/`;
  }

  return path;
}

function rewriteSeoHtmlHrefs(html: string): string {
  return html.replace(
    /href\s*=\s*(["'])(.*?)\1/gi,
    (_full, quote: string, href: string) =>
      `href=${quote}${normalizeSeoHref(href)}${quote}`,
  );
}

/** Normalize CMS description into real HTML tags. */
export function normalizeSeoHtml(raw: string): string {
  let html = unescapeHtmlEntities(String(raw || "").trim());
  if (!html) return "";

  html = unwrapInvalidParagraphs(html);

  html = html
    .replace(/<\/(h1|h2|h3|p|ul|ol|div)>\s*(?:<br\s*\/?>\s*)+/gi, "</$1>")
    .replace(/(?:<br\s*\/?>\s*)+(<(?:h1|h2|h3|p|ul|ol|div)\b)/gi, "$1")
    .replace(/<(ul|ol)>([\s\S]*?)<\/\1>/gi, (_full, tag, inner) => {
      const cleaned = String(inner).replace(/<br\s*\/?>/gi, "");
      return `<${tag}>${cleaned}</${tag}>`;
    });

  html = rewriteSeoHtmlHrefs(html);

  return html.trim();
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build React nodes from normalized HTML so headings/paragraphs/lists
 * are real elements (not one plain-text blob).
 */
function renderSeoHtmlBlocks(html: string): React.ReactNode {
  if (!html) return null;

  const blocks: React.ReactNode[] = [];
  const blockRe =
    /<(h1|h2|h3|h4|p|ul|ol)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = blockRe.exec(html)) !== null) {
    const between = html.slice(lastIndex, match.index).trim();
    if (between) {
      // Leftover text between blocks
      blocks.push(
        <p key={`t-${key++}`} className="listing_seo_footer_p">
          {stripHtml(between)}
        </p>,
      );
    }

    const tag = match[1].toLowerCase();
    const inner = match[3] ?? "";

    if (tag === "ul" || tag === "ol") {
      const ListTag = tag === "ol" ? "ol" : "ul";
      const items = Array.from(
        inner.matchAll(/<li(\s[^>]*)?>([\s\S]*?)<\/li>/gi),
      );
      blocks.push(
        <ListTag key={`l-${key++}`} className="listing_seo_footer_list">
          {items.map((item, idx) => (
            <li
              key={`li-${key}-${idx}`}
              className="listing_seo_footer_li"
              dangerouslySetInnerHTML={{ __html: item[2] || "" }}
            />
          ))}
        </ListTag>,
      );
    } else if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4") {
      const HeadingTag = tag;
      blocks.push(
        <HeadingTag
          key={`h-${key++}`}
          className={`listing_seo_footer_${tag}`}
          dangerouslySetInnerHTML={{ __html: inner }}
        />,
      );
    } else {
      blocks.push(
        <p
          key={`p-${key++}`}
          className="listing_seo_footer_p"
          dangerouslySetInnerHTML={{ __html: inner }}
        />,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  const trailing = html.slice(lastIndex).trim();
  if (trailing) {
    if (looksLikeHtml(trailing)) {
      blocks.push(
        <div
          key={`d-${key++}`}
          className="listing_seo_footer_p"
          dangerouslySetInnerHTML={{ __html: trailing }}
        />,
      );
    } else {
      blocks.push(
        <p key={`t-${key++}`} className="listing_seo_footer_p">
          {stripHtml(trailing)}
        </p>,
      );
    }
  }

  if (blocks.length === 0) {
    // Absolute fallback: still try HTML render
    return (
      <div dangerouslySetInnerHTML={{ __html: html }} />
    );
  }

  return blocks;
}

function resolveHeadingAndBody(source: NonNullable<ListingSeoSource>): {
  heading: string;
  bodyHtml: string;
} {
  const titleRaw = String(source.title ?? "").trim();
  const descRaw = String(source.description ?? "").trim();

  const titleRich = isRichSeoHtml(titleRaw);
  const descRich = isRichSeoHtml(descRaw) || looksLikeHtml(descRaw);

  // Rich HTML wrongly stored in `title`
  if (titleRich && !descRich) {
    return {
      heading: descRaw ? stripHtml(unescapeHtmlEntities(descRaw)) : "",
      bodyHtml: titleRaw,
    };
  }

  const heading = titleRaw ? stripHtml(unescapeHtmlEntities(titleRaw)) : "";

  if (descRich) {
    return { heading, bodyHtml: descRaw };
  }

  // Short plain blurb under title
  if (heading && descRaw) {
    return {
      heading,
      bodyHtml: `<p>${escapeText(stripHtml(unescapeHtmlEntities(descRaw)))}</p>`,
    };
  }

  // Short plain title-only style description (e.g. LuvLap) — heading only
  if (!heading && descRaw && descRaw.length <= 320 && !looksLikeHtml(descRaw)) {
    return {
      heading: stripHtml(unescapeHtmlEntities(descRaw)),
      bodyHtml: "",
    };
  }

  // Long plain text without tags — still show as paragraphs, never one mega-heading
  if (descRaw) {
    const plain = stripHtml(unescapeHtmlEntities(descRaw));
    return {
      heading,
      bodyHtml: `<p>${escapeText(plain)}</p>`,
    };
  }

  return { heading, bodyHtml: "" };
}

/**
 * Bottom SEO block for category / brand listing pages.
 * Renders API `description` as real h1/h2/h3/p/ul elements.
 * Does not use `meta_description`.
 */
export default function ListingSeoFooter({
  source,
  className,
}: {
  source: ListingSeoSource;
  className?: string;
}) {
  const resolved = useMemo(() => {
    if (!source) return null;
    return resolveHeadingAndBody(source);
  }, [source]);

  const normalizedHtml = useMemo(() => {
    if (!resolved?.bodyHtml) return "";
    return normalizeSeoHtml(resolved.bodyHtml);
  }, [resolved?.bodyHtml]);

  const bodyNodes = useMemo(
    () => renderSeoHtmlBlocks(normalizedHtml),
    [normalizedHtml],
  );

  if (!source || !resolved) return null;

  const { heading } = resolved;
  const hasBody = Boolean(normalizedHtml);

  if (!heading && !hasBody) return null;

  const subcategory = source.name || source.brand_name || undefined;

  return (
    <section
      className={`listing_seo_footer container u_spc${className ? ` ${className}` : ""}`}
      aria-label="About this collection"
    >
      <div
        className="seo-content"
        {...(subcategory ? { "data-subcategory": subcategory } : {})}
      >
        {heading ? (
          <h2 className="listing_seo_footer_title">{heading}</h2>
        ) : null}

        {hasBody ? (
          <div className="listing_seo_footer_html">{bodyNodes}</div>
        ) : null}
      </div>
    </section>
  );
}

/** Prefer the entity that actually carries rich HTML `description`. */
export function pickListingSeoEntity(
  ...entities: Array<any | null | undefined>
): any | null {
  const list = entities.filter((e) => e && typeof e === "object");
  if (list.length === 0) return null;

  const scored = list.map((entity) => {
    const source = getListingSeoSource(entity);
    const desc = String(source?.description || "");
    const title = String(source?.title || "");
    let score = 0;
    if (isRichSeoHtml(desc) || looksLikeHtml(desc)) score += 100 + desc.length;
    else if (desc.trim()) score += Math.min(desc.length, 50);
    if (title.trim()) score += 10;
    return { entity, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.entity ?? list[0];
}

/** Pick listing SEO fields from a category / brand API row. Never uses `meta_description`. */
export function getListingSeoSource(entity: any): ListingSeoSource {
  if (!entity || typeof entity !== "object") return null;

  const row =
    (typeof entity.description === "string" && entity.description.trim()) ||
    (typeof entity.title === "string" && entity.title.trim())
      ? entity
      : entity.data &&
          typeof entity.data === "object" &&
          ((typeof entity.data.description === "string" &&
            entity.data.description.trim()) ||
            (typeof entity.data.title === "string" && entity.data.title.trim()))
        ? entity.data
        : entity.brand && typeof entity.brand === "object"
          ? entity.brand
          : entity.category && typeof entity.category === "object"
            ? entity.category
            : entity;

  const seo = row.seo && typeof row.seo === "object" ? row.seo : null;

  const title = row.title ?? seo?.title ?? null;

  const candidates = [
    row.description,
    seo?.description,
    seo?.seo_html_content,
  ];
  const rich = candidates.find(
    (value) => typeof value === "string" && isRichSeoHtml(value),
  );
  const description =
    rich ??
    candidates.find(
      (value) => typeof value === "string" && String(value).trim(),
    ) ??
    null;

  return {
    title: title != null && String(title).trim() ? title : null,
    description:
      description != null && String(description).trim() ? description : null,
    name: row.name ?? row.category_name ?? row.brand_name ?? entity.name ?? null,
    brand_name: row.brand_name ?? entity.brand_name ?? null,
  };
}
