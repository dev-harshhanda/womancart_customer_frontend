import { API_URL } from "@/constants/url";

/** Resolve relative CMS media paths against the admin origin. */
export function resolveCmsMediaUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  const origin = API_URL.replace(/\/api\/?$/i, "").replace(/\/$/, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${origin}${path}`;
}

export function getDocumentTitle(doc: Record<string, unknown> | null | undefined): string {
  if (!doc) return "Document";
  const title = doc.title ?? doc.name ?? doc.label;
  return typeof title === "string" && title.trim() ? title.trim() : "Document";
}

export function getDocumentUrl(doc: Record<string, unknown> | null | undefined): string | null {
  if (!doc) return null;
  const candidates = [
    doc.file_url,
    doc.fileUrl,
    doc.url,
    doc.document_url,
    doc.documentUrl,
    doc.pdf_url,
    doc.pdfUrl,
    doc.download_url,
    doc.downloadUrl,
    doc.file,
  ];
  for (const candidate of candidates) {
    const resolved = resolveCmsMediaUrl(
      typeof candidate === "string" ? candidate : null,
    );
    if (resolved) return resolved;
  }
  return null;
}
