/**
 * The CMS endpoints return a full HTML page from the admin (Livewire) where the
 * actual content is rendered inside `<div class="policy-content">`. This helper
 * extracts just that inner content so we don't render the whole admin page
 * (head, scripts, styles) inside our CMS pages.
 *
 * Falls back to the raw string if parsing isn't possible (e.g. during SSR) or if
 * the expected wrapper isn't found.
 */
export function extractPolicyContent(data: string | undefined): string {
  if (!data) return "";

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return data;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(data, "text/html");

    const contentElement =
      doc.querySelector(".policy-content") ??
      doc.querySelector(".mx-auto.flex.w-full.flex-1.justify-center.p-5 > div");

    return contentElement ? contentElement.innerHTML : data;
  } catch {
    return data;
  }
}
