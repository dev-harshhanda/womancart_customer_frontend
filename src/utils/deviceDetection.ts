import {
  APP_STORE_NATIVE_URL,
  APP_STORE_URL,
  GOOGLE_PLAY_NATIVE_URL,
  GOOGLE_PLAY_URL,
} from "@/constants/appDownload";

export type DevicePlatform = "android" | "ios" | "desktop";

type ClientHintHeaders = {
  secChUaMobile?: string | null;
  secChUaPlatform?: string | null;
};

function platformFromClientHints(
  hints: ClientHintHeaders,
): DevicePlatform | null {
  const platform = hints.secChUaPlatform?.replace(/"/g, "").trim().toLowerCase();
  if (platform === "android") return "android";
  if (platform === "ios") return "ios";

  return null;
}

/**
 * Classify the client from User-Agent for smart app-store routing.
 * - Android phones & tablets → Play Store
 * - iPhone, iPod, iPad → App Store
 * - Desktop & unknown → landing page
 */
export function detectDevicePlatform(userAgent: string): DevicePlatform {
  const ua = userAgent.toLowerCase();

  if (/android/.test(ua)) return "android";

  if (
    /iphone|ipod|ipad/.test(ua) ||
    /crios|fxios|edgios|opios/.test(ua) ||
    (ua.includes("macintosh") && ua.includes("mobile"))
  ) {
    return "ios";
  }

  // QR in-app browsers often omit iPhone/iPad in User-Agent.
  if (
    /applewebkit/.test(ua) &&
    /mobile/.test(ua) &&
    !/android/.test(ua) &&
    !/windows phone/.test(ua)
  ) {
    return "ios";
  }

  return "desktop";
}

export function detectDevicePlatformFromRequest(
  userAgent: string,
  hints: ClientHintHeaders = {},
): DevicePlatform {
  const fromHints = platformFromClientHints(hints);
  if (fromHints) return fromHints;

  const fromUa = detectDevicePlatform(userAgent);
  if (fromUa !== "desktop") return fromUa;

  if (hints.secChUaMobile === "?1") {
    if (/android/.test(userAgent.toLowerCase())) return "android";
  }

  return "desktop";
}

/** Client-only iPad / iPhone check (touch Mac). */
export function detectClientPlatform(): DevicePlatform {
  if (typeof navigator === "undefined") return "desktop";

  const fromUa = detectDevicePlatform(navigator.userAgent || "");
  if (fromUa !== "desktop") return fromUa;

  const isTouchMac =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (isTouchMac) return "ios";

  return "desktop";
}

export function getStoreUrlsForPlatform(platform: DevicePlatform): {
  native: string;
  web: string;
} | null {
  if (platform === "android") {
    return { native: GOOGLE_PLAY_NATIVE_URL, web: GOOGLE_PLAY_URL };
  }
  if (platform === "ios") {
    return { native: APP_STORE_NATIVE_URL, web: APP_STORE_URL };
  }
  return null;
}

/** Prefer native store deep link; fall back to HTTPS store URL. */
export function getAppStoreRedirectUrl(userAgent: string): string | null {
  return getAppStoreRedirectUrlFromRequest(userAgent, {});
}

export function getAppStoreRedirectUrlFromRequest(
  userAgent: string,
  hints: ClientHintHeaders = {},
): string | null {
  const platform = detectDevicePlatformFromRequest(userAgent, hints);
  const urls = getStoreUrlsForPlatform(platform);
  return urls?.native ?? null;
}

/** HTTPS store URL (used as fallback after native deep link attempt). */
export function getAppStoreWebUrlFromRequest(
  userAgent: string,
  hints: ClientHintHeaders = {},
): string | null {
  const platform = detectDevicePlatformFromRequest(userAgent, hints);
  return getStoreUrlsForPlatform(platform)?.web ?? null;
}
