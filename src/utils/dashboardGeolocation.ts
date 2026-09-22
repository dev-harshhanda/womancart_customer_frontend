import { readSelectedLocation } from "@/utils/deliveryAddressSync";
import { canUseBrowserGeolocation } from "./browserGeolocation";

export const WC_BROWSER_GEO_SESSION_KEY = "WC_BROWSER_GEO_COORDS";

export const DEFAULT_DASHBOARD_LAT = 28.6573;
export const DEFAULT_DASHBOARD_LNG = 77.1642;

/** Coordinates for `/home/user/dashboard` — prefers saved location, then last browser fix, then Delhi default. */
export function getDashboardCoordinatesFromStorage(): {
  latitude: number;
  longitude: number;
} {
  const loc = readSelectedLocation();
  if (loc) {
    const lat = parseFloat(String(loc.latitude));
    const lng = parseFloat(String(loc.longitude));
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      !(lat === 0 && lng === 0)
    ) {
      return { latitude: lat, longitude: lng };
    }
  }
  if (typeof sessionStorage !== "undefined") {
    try {
      const raw = sessionStorage.getItem(WC_BROWSER_GEO_SESSION_KEY);
      if (raw) {
        const j = JSON.parse(raw) as {
          latitude?: number;
          longitude?: number;
          lat?: number;
          lng?: number;
        };
        const la = j.latitude ?? j.lat;
        const ln = j.longitude ?? j.lng;
        if (
          typeof la === "number" &&
          typeof ln === "number" &&
          Number.isFinite(la) &&
          Number.isFinite(ln)
        ) {
          return { latitude: la, longitude: ln };
        }
      }
    } catch {
      /* ignore */
    }
  }
  return { latitude: DEFAULT_DASHBOARD_LAT, longitude: DEFAULT_DASHBOARD_LNG };
}

/** One-shot browser geolocation; falls back to default coordinates on deny / error / timeout. */
export function fetchBrowserGeolocationOnce(): Promise<{
  latitude: number;
  longitude: number;
}> {
  return new Promise((resolve) => {
    if (!canUseBrowserGeolocation()) {
      resolve({
        latitude: DEFAULT_DASHBOARD_LAT,
        longitude: DEFAULT_DASHBOARD_LNG,
      });
      return;
    }
    const timer = setTimeout(() => {
      resolve({
        latitude: DEFAULT_DASHBOARD_LAT,
        longitude: DEFAULT_DASHBOARD_LNG,
      });
    }, 12000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        clearTimeout(timer);
        resolve({
          latitude: DEFAULT_DASHBOARD_LAT,
          longitude: DEFAULT_DASHBOARD_LNG,
        });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 },
    );
  });
}
