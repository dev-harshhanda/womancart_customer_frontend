"use client";

import { useSearchParams } from "next/navigation";
import { getFromStorage, setToStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";

export type DeliveryMode = "normal" | "quick_delivery";

const DELIVERY_MODE_QUICK: DeliveryMode = "quick_delivery";
const DELIVERY_MODE_NORMAL: DeliveryMode = "normal";

export const QUICK_DELIVERY_URL_MODE = DELIVERY_MODE_QUICK;
export const DELIVERY_MODE_COOKIE = "WC_DELIVERY_MODE";

/**
 * Append `mode=quick_delivery` to internal URLs when quick delivery is active.
 * Strips the param when normal delivery is active.
 */
export function withDeliveryModeInUrl(
  href: string,
  options?: {
    mode?: DeliveryMode;
    searchParams?: URLSearchParams | null;
  },
): string {
  const raw = String(href || "").trim();
  if (!raw) return raw;
  if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw;

  const mode =
    options?.mode ??
    getDeliveryMode(
      options?.searchParams ??
        (typeof window !== "undefined"
          ? new URLSearchParams(window.location.search)
          : null),
    );

  try {
    const base =
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost";
    const parsed = new URL(raw, base);

    if (mode === "quick_delivery") {
      parsed.searchParams.set("mode", QUICK_DELIVERY_URL_MODE);
    } else if (parsed.searchParams.get("mode") === QUICK_DELIVERY_URL_MODE) {
      parsed.searchParams.delete("mode");
    }

    const qs = parsed.searchParams.toString();
    return `${parsed.pathname}${qs ? `?${qs}` : ""}${parsed.hash}`;
  } catch {
    if (mode !== "quick_delivery") return raw;
    if (raw.includes("mode=quick_delivery")) return raw;
    return `${raw}${raw.includes("?") ? "&" : "?"}mode=${QUICK_DELIVERY_URL_MODE}`;
  }
}

/** True when quick delivery should be reflected in the URL query string. */
export function shouldPersistQuickDeliveryInUrl(
  searchParams?: URLSearchParams | null,
): boolean {
  return getDeliveryMode(searchParams ?? null) === "quick_delivery";
}

/**
 * Get the current delivery mode: explicit delivery tokens in `mode` first, then localStorage.
 * Other `mode` values (order status, auth, etc.) must be ignored — they are not delivery mode.
 */
export const getDeliveryMode = (
    searchParams: URLSearchParams | null,
  ): DeliveryMode => {
  const raw = searchParams?.get("mode");
  const urlMode = raw != null && raw !== "" ? raw.trim() : null;
  if (urlMode === DELIVERY_MODE_QUICK) return "quick_delivery";
  if (urlMode === DELIVERY_MODE_NORMAL) return "normal";

  const stored = getFromStorage(STORAGE_KEYS.deliveryMode);
  return stored === DELIVERY_MODE_QUICK ? "quick_delivery" : "normal";
};

/**
 * Persist delivery mode so it survives tab change and navigation.
 * Call this when the user toggles WomenCart / Quick Delivery.
 */
export const setDeliveryModePersisted = (mode: DeliveryMode) => {
  const normalizedMode =
    mode === DELIVERY_MODE_QUICK
      ? DELIVERY_MODE_QUICK
      : DELIVERY_MODE_NORMAL;

  setToStorage(STORAGE_KEYS.deliveryMode, normalizedMode);

  if (typeof document !== "undefined") {
    const secure =
      typeof window !== "undefined" &&
      window.location.protocol === "https:"
        ? "; Secure"
        : "";

    document.cookie = `${DELIVERY_MODE_COOKIE}=${normalizedMode}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
  }
};

/**
 * Get the delivery channel for API calls (backend expects "quick" or "normal", not "quick_delivery").
 * @param searchParams - Next.js searchParams object
 * @returns "quick" if mode=quick_delivery, otherwise "normal"
 */
export const getDeliveryChannel = (searchParams: URLSearchParams | null): "normal" | "quick" => {
  const mode = getDeliveryMode(searchParams);
  return mode === "quick_delivery" ? "quick" : "normal";
};

/**
 * Product-detail API channel: explicit `?type=` / `?mode=` first, then persisted
 * delivery mode (product URLs strip `mode` from the address bar).
 */
export const getProductDetailApiChannel = (
  searchParams: URLSearchParams | null,
): "normal" | "quick" => {
  const typeParam = searchParams?.get("type");
  if (typeParam === "quick") return "quick";
  if (typeParam === "normal") return "normal";
  const modeParam = searchParams?.get("mode");
  if (modeParam === DELIVERY_MODE_QUICK) return "quick";
  if (modeParam === DELIVERY_MODE_NORMAL) return "normal";
  const stored = getFromStorage(STORAGE_KEYS.deliveryMode);
  return stored === DELIVERY_MODE_QUICK ? "quick" : "normal";
};

/**
 * Hook to get current delivery mode
 * @returns "quick" if mode=quick_delivery, otherwise "normal"
 */
export const useDeliveryMode = (): DeliveryMode => {
  const searchParams = useSearchParams();
  return getDeliveryMode(searchParams);
};
