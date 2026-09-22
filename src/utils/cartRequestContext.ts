"use client";

import { getDeliveryChannel } from "@/utils/deliveryMode";
import { getDashboardCoordinatesFromStorage } from "@/utils/dashboardGeolocation";

/** Same coordinate + delivery channel inputs as `GET /cart/list` — for mutations that must match. */
export function getCartDeliveryContextForRequest(): {
  type: "quick" | "normal";
  latitude: number;
  longitude: number;
} {
  const sp =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const type = getDeliveryChannel(sp);
  const { latitude, longitude } = getDashboardCoordinatesFromStorage();
  return { type, latitude, longitude };
}
