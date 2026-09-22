/** Apple App Store listing for WomanCart. */
export const APP_STORE_URL =
  "https://apps.apple.com/in/app/womancart/id6670382437";

/** Google Play listing for WomanCart. */
export const GOOGLE_PLAY_URL =
  "https://play.google.com/store/apps/details?id=com.igs.womencart";

/** Opens the App Store app directly on iOS devices. */
export const APP_STORE_NATIVE_URL =
  "itms-apps://apps.apple.com/in/app/womancart/id6670382437";

/** Opens the Play Store app directly on Android devices. */
export const GOOGLE_PLAY_NATIVE_URL = "market://details?id=com.igs.womencart";

/** Smart-download landing path (App Router). */
export const APP_DOWNLOAD_PATH = "/app/";

/**
 * Production smart-download URL for SEO / canonical tags.
 * QR codes use the current site origin + {@link APP_DOWNLOAD_PATH} at runtime.
 */
export const APP_DOWNLOAD_LANDING_URL =
  process.env.NEXT_PUBLIC_APP_DOWNLOAD_URL ?? "https://womancart.in/app/";

/** Relative API path that returns an SVG QR for the smart-download URL. */
export const APP_DOWNLOAD_QR_PATH = "/api/app/qr";

/** Build `/app/` URL for the host that served the request (QR + share links). */
export function buildAppDownloadUrl(host: string, proto = "https"): string {
  const cleanHost = host.trim();
  if (!cleanHost) return APP_DOWNLOAD_LANDING_URL;
  return `${proto}://${cleanHost}${APP_DOWNLOAD_PATH}`;
}
