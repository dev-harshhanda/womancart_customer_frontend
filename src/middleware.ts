import { NextRequest, NextResponse } from "next/server";

import { IS_STAGING } from "@/constants/url";
import { getAppStoreRedirectUrlFromRequest } from "@/utils/deviceDetection";
import { STORAGE_KEYS } from "@/constants/storageKeys";

import { redirectMap } from "./lib/redirects";

function normalizeRequest(request: NextRequest): string {
  // Decode and normalize pathname
  let pathname = decodeURIComponent(request.nextUrl.pathname);

  // Remove trailing slash except root
  if (pathname.length > 1) {
    pathname = pathname.replace(/\/+$/, "");
  }

  // Case-insensitive matching
  pathname = pathname.toLowerCase();

  // Sort query parameters alphabetically
  const params = [...request.nextUrl.searchParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");

  return params ? `${pathname}?${params}` : pathname;
}

function normalizePath(path: string): string {
  let p = decodeURIComponent(path);

  if (p.length > 1) {
    p = p.replace(/\/+$/, "");
  }

  return p.toLowerCase();
}

export function middleware(request: NextRequest) {
  const requestedMode = request.nextUrl.searchParams.get("mode");
  const hasExplicitDeliveryMode =
    requestedMode === "normal" || requestedMode === "quick_delivery";

  const cookieMode = request.cookies.get(STORAGE_KEYS.deliveryMode)?.value;

  const deliveryMode =
    hasExplicitDeliveryMode
      ? requestedMode
      : cookieMode === "quick_delivery"
        ? "quick_delivery"
        : "normal";

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-wc-delivery-mode", deliveryMode);

  const applyDeliveryModeCookie = (response: NextResponse) => {
    if (hasExplicitDeliveryMode) {
      response.cookies.set({
        name: STORAGE_KEYS.deliveryMode,
        value: deliveryMode,
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
        secure: request.nextUrl.protocol === "https:",
      });
    }

    return response;
  };

  const key = normalizeRequest(request);

  // ---------------------------------------
  // Redirect Lookup
  // ---------------------------------------

  const destination = redirectMap.get(key);

  if (destination) {
    const currentPath = normalizePath(request.nextUrl.pathname);
    const destinationPath = normalizePath(destination);

    // Prevent redirect loop
    if (currentPath !== destinationPath) {
      const url = request.nextUrl.clone();

      url.pathname = destination;

      // Remove every query parameter
      url.search = "";

      return applyDeliveryModeCookie(NextResponse.redirect(url, 301));
    }
  }

  // ---------------------------------------
  // App Redirect
  // ---------------------------------------

  const pathname = normalizePath(request.nextUrl.pathname);

  if (pathname === "/app") {
    const storeUrl = getAppStoreRedirectUrlFromRequest(
      request.headers.get("user-agent") ?? "",
      {
        secChUaMobile: request.headers.get("sec-ch-ua-mobile"),
        secChUaPlatform: request.headers.get("sec-ch-ua-platform"),
      }
    );

    if (storeUrl) {
      return applyDeliveryModeCookie(NextResponse.redirect(storeUrl, 302));
    }
  }

  // ---------------------------------------
  // Default Response
  // ---------------------------------------

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Staging must never be indexed by search engines
  if (IS_STAGING) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return applyDeliveryModeCookie(response);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|robots.txt|sitemap.xml|manifest.json|images).*)",
  ],
};