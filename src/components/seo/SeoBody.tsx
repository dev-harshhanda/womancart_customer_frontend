import React from "react";
import type { SeoObject, SeoFaqItem } from "@/types/seo";

/**
 * Renders the SEO body content the frontend owns per the migration doc:
 *  - FAQ accordion  (seo.faq_content)
 *  - Bottom SEO HTML (seo.seo_html_content)
 *
 * Server-safe (no hooks); the FAQ accordion uses native <details>/<summary>
 * so it works without client JS and stays crawlable.
 */
interface SeoBodyProps {
  seo?: SeoObject | null;
  className?: string;
}

function renderFaq(seo: SeoObject): React.ReactNode {
  const faq = seo.faq_content;
  if (!faq) return null;

  if (Array.isArray(faq)) {
    const items = (faq as SeoFaqItem[]).filter(
      (it) => it && (it.question || it.answer),
    );
    if (items.length === 0) return null;
    return (
      <section className="seo_faq" aria-label="Frequently asked questions">
        <h2 className="seo_faq_title">Frequently Asked Questions</h2>
        <div className="seo_faq_list">
          {items.map((item, index) => (
            <details className="seo_faq_item" key={index}>
              <summary className="seo_faq_question">{item.question}</summary>
              {item.answer ? (
                <div
                  className="seo_faq_answer"
                  dangerouslySetInnerHTML={{ __html: String(item.answer) }}
                />
              ) : null}
            </details>
          ))}
        </div>
      </section>
    );
  }

  const html = String(faq).trim();
  if (!html) return null;
  return (
    <section
      className="seo_faq"
      aria-label="Frequently asked questions"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function SeoBody({ seo, className }: SeoBodyProps) {
  const s = seo ?? {};
  const faqNode = renderFaq(s);
  const htmlContent =
    typeof s.seo_html_content === "string" ? s.seo_html_content.trim() : "";

  if (!faqNode && !htmlContent) return null;

  return (
    <div className={`seo_body container u_spc${className ? ` ${className}` : ""}`}>
      {faqNode}
      {htmlContent ? (
        <section
          className="seo_html_content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      ) : null}
    </div>
  );
}

export default SeoBody;
