import { API_URL } from "@/constants/url";

type InvoiceRecord = Record<string, unknown> | null | undefined;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim() !== "";

export function looksLikeInvoiceUrl(value: string): boolean {
  const v = value.trim().toLowerCase();
  return (
    v.startsWith("http://") ||
    v.startsWith("https://") ||
    v.startsWith("//") ||
    v.startsWith("blob:") ||
    v.includes(".pdf") ||
    v.includes("/invoice") ||
    v.includes("/invoices/") ||
    v.startsWith("/storage/") ||
    v.startsWith("/uploads/")
  );
}

/** Prefix relative invoice paths with the admin CDN/origin. */
export function normalizeInvoiceUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("blob:")) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const adminOrigin = API_URL.replace(/\/api\/?$/i, "").replace(/\/$/, "");
  return `${adminOrigin}${path}`;
}

/** Read a direct invoice URL from an order / line-item / API payload. */
export function extractInvoiceUrl(record: InvoiceRecord): string | null {
  if (!record) return null;

  if (isNonEmptyString(record)) {
    return looksLikeInvoiceUrl(record) ? normalizeInvoiceUrl(record) : null;
  }

  if (typeof record !== "object") return null;

  const directCandidates = [
    record.invoice_url,
    record.invoiceUrl,
    record.invoice_link,
    record.invoiceLink,
    record.invoice_pdf_url,
    record.invoicePdfUrl,
    record.pdf_url,
    record.pdfUrl,
    record.document_url,
    record.documentUrl,
    record.url,
    record.link,
    record.file_url,
    record.fileUrl,
    record.download_url,
    record.downloadUrl,
  ];
  for (const candidate of directCandidates) {
    if (isNonEmptyString(candidate) && looksLikeInvoiceUrl(candidate)) {
      return normalizeInvoiceUrl(candidate);
    }
  }

  const invoice = record.invoice;
  if (isNonEmptyString(invoice) && looksLikeInvoiceUrl(invoice)) {
    return normalizeInvoiceUrl(invoice);
  }
  if (invoice && typeof invoice === "object") {
    const nested = extractInvoiceUrl(invoice as InvoiceRecord);
    if (nested) return nested;
  }

  const nestedObjects = [
    record.shipment,
    record.shipment_details,
    record.shipmentDetails,
    record.booking,
    record.tax_invoice,
    record.taxInvoice,
    record.result,
  ];
  for (const nested of nestedObjects) {
    const found = extractInvoiceUrl(nested as InvoiceRecord);
    if (found) return found;
  }

  const data = record.data;
  if (isNonEmptyString(data) && looksLikeInvoiceUrl(data)) {
    return normalizeInvoiceUrl(data);
  }
  if (data && typeof data === "object") {
    const nested = extractInvoiceUrl(data as InvoiceRecord);
    if (nested) return nested;
  }

  return null;
}

function normalizeId(value: unknown): string | null {
  if (value == null || value === "") return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function deepFindInvoiceUrl(value: unknown, depth = 0): string | null {
  if (depth > 8) return null;

  if (isNonEmptyString(value)) {
    return looksLikeInvoiceUrl(value) ? normalizeInvoiceUrl(value) : null;
  }

  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = deepFindInvoiceUrl(entry, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const record = value as Record<string, unknown>;
  const direct = extractInvoiceUrl(record);
  if (direct) return direct;

  for (const [key, child] of Object.entries(record)) {
    if (/invoice|pdf|bill|document/i.test(key)) {
      const found = deepFindInvoiceUrl(child, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

/** Prefer true order-line identifiers over generic `id` (may be product id). */
export function extractOrderItemIdFromLine(item: InvoiceRecord): string | null {
  if (!item || typeof item !== "object") return null;
  return (
    normalizeId(item.orderItemId) ||
    normalizeId(item.order_item_id) ||
    normalizeId(item.order_itemid) ||
    normalizeId(item.orderItem_id) ||
    normalizeId(item.item_id) ||
    normalizeId((item.order_item as InvoiceRecord)?.id) ||
    normalizeId((item.order_item as InvoiceRecord)?.order_item_id) ||
    normalizeId(item.id)
  );
}

function readInvoiceFromMap(
  map: unknown,
  orderItemId: unknown,
): string | null {
  if (!map || typeof map !== "object" || Array.isArray(map)) return null;
  const key = normalizeId(orderItemId);
  if (!key) return null;
  const entry = (map as Record<string, unknown>)[key];
  if (isNonEmptyString(entry) && looksLikeInvoiceUrl(entry)) {
    return normalizeInvoiceUrl(entry);
  }
  return extractInvoiceUrl(entry as InvoiceRecord);
}

/** Match an invoice entry from order-level `invoices` arrays to a line item. */
export function findInvoiceUrlForOrderItem(
  orderData: InvoiceRecord,
  orderItemId: unknown,
): string | null {
  const targetId = normalizeId(orderItemId);
  if (!orderData || !targetId) return null;

  const fromMap =
    readInvoiceFromMap(orderData.invoice_urls, targetId) ||
    readInvoiceFromMap(orderData.invoiceUrls, targetId);
  if (fromMap) return fromMap;

  const collections = [
    orderData.invoices,
    orderData.order_invoices,
    orderData.orderInvoices,
    orderData.item_invoices,
    orderData.itemInvoices,
  ];

  for (const collection of collections) {
    if (!Array.isArray(collection)) continue;
    for (const entry of collection) {
      const entryId = normalizeId(
        entry?.order_item_id ??
          entry?.orderItemId ??
          entry?.order_itemid ??
          entry?.item_id ??
          entry?.id,
      );
      if (entryId !== targetId) continue;
      const url = extractInvoiceUrl(entry as InvoiceRecord);
      if (url) return url;
    }
  }

  return null;
}

export function resolveInvoiceUrlForOrderItem(
  orderData: InvoiceRecord,
  orderItem: InvoiceRecord,
  orderItemId: unknown,
  options?: { allowOrderLevel?: boolean },
): string | null {
  const fromItem =
    extractInvoiceUrl(orderItem) || deepFindInvoiceUrl(orderItem);
  if (fromItem) return fromItem;

  const fromList = findInvoiceUrlForOrderItem(orderData, orderItemId);
  if (fromList) return fromList;

  if (options?.allowOrderLevel) {
    const fromOrder =
      extractInvoiceUrl(orderData) || deepFindInvoiceUrl(orderData);
    if (fromOrder) return fromOrder;
  }

  return null;
}

export function isInvoiceUrlExplicitlyNull(record: InvoiceRecord): boolean {
  if (!record || typeof record !== "object") return false;
  return record.invoice_url === null || record.invoiceUrl === null;
}

export function triggerInvoiceDownload(url: string, fileName: string) {
  const openInNewTab = () => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  try {
    const isBlob = url.startsWith("blob:");
    const isSameOrigin =
      typeof window !== "undefined" && url.startsWith(window.location.origin);

    if (!isBlob && !isSameOrigin) {
      openInNewTab();
      return;
    }

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch {
    openInNewTab();
  }
}
