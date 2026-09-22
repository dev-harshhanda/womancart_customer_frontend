"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppSelector } from "@/lib/hook";
import { getCurrentUser, getToken } from "@/lib/slices/authSlice";
import { pushEvent } from "@/lib/dataLayer";

function resolvePageType(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/product/product-category")) return "plp";
  if (pathname.startsWith("/product/kit-detail")) return "pdp";
  if (pathname.startsWith("/product/detail")) return "pdp";
  if (pathname.startsWith("/product/")) return "pdp";
  if (
    pathname.startsWith("/category") ||
    pathname.startsWith("/collections") ||
    pathname.startsWith("/brand") ||
    pathname.startsWith("/all-products")
  ) {
    return "plp";
  }
  if (pathname.startsWith("/cart/payment-success")) return "order_confirmation";
  if (pathname.startsWith("/cart")) return "cart";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/wishlist")) return "wishlist";
  if (pathname.startsWith("/auth")) return "auth";
  if (pathname.startsWith("/account")) return "account";
  return "other";
}

function resolveDeviceType(): "mobile" | "tablet" | "desktop" {
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

/**
 * GTM's default triggers only fire on hard page loads, but Next.js App Router
 * navigations are client-side transitions — so `page_data` is re-pushed here
 * on every pathname change (per the plan's SPA guidance for Next.js/React).
 */
export function GtmPageDataTracker() {
  const pathname = usePathname();
  const user = useAppSelector(getCurrentUser);
  const token = useAppSelector(getToken);

  useEffect(() => {
    pushEvent("page_data", {
      page_type: resolvePageType(pathname),
      user_id: (user as any)?.id ?? (user as any)?._id,
      login_status: token ? "logged_in" : "guest",
      device_type: resolveDeviceType(),
      page_url: window.location.href,
      page_title: document.title,
    });
  }, [pathname, user, token]);

  return null;
}
