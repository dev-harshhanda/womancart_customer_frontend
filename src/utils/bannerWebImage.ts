/**
 * Dashboard / banner APIs may send web_image as null, "", or the string "null".
 * Only non-empty, real URL strings should render in the UI.
 */
function normalizeBannerImageUrl(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  const lower = s.toLowerCase();
  if (lower === "null" || lower === "undefined" || lower === "none") return null;
  return s;
}

export function getBannerWebImageSrc(banner: unknown): string | null {
  if (banner == null || typeof banner !== "object") return null;
  const b = banner as Record<string, unknown>;
  const raw =
    b.web_image ??
    b.WebImage ??
    b.webImage ??
    b.website_image ??
    b.websiteImage ??
    null;
  return normalizeBannerImageUrl(raw);
}

/**
 * Mobile banners may use image/app_image/appImage/mobile_image keys.
 */
export function getBannerMobileImageSrc(banner: unknown): string | null {
  if (banner == null || typeof banner !== "object") return null;
  const b = banner as Record<string, unknown>;
  const raw =
    b.image ??
    b.app_image ??
    b.appImage ??
    b.mobile_image ??
    b.mobileImage ??
    null;
  return normalizeBannerImageUrl(raw);
}

/**
 * Use mobile image on mobile, web image on desktop.
 * Falls back to the other key if preferred one is missing.
 */
export function getBannerDisplayImageSrc(
  banner: unknown,
  isMobile: boolean,
): string | null {
  if (isMobile) {
    return getBannerMobileImageSrc(banner) ?? getBannerWebImageSrc(banner);
  }
  return getBannerWebImageSrc(banner) ?? getBannerMobileImageSrc(banner);
}
