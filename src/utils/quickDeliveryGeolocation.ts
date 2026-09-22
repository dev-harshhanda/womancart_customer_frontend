/**
 * Quick delivery / header GPS: matches `LocationSearchModal` "Use current location"
 * (getCurrentPosition with 60s maxAge first, then watchPosition with the same thresholds)
 * so pincode and address stay consistent with the location picker.
 */

import { canUseBrowserGeolocation } from "./browserGeolocation";

export type QuickDeliveryResolvedLocation = {
  latitude: string;
  longitude: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};
export type QuickLocationSource =
  | "delivery_session_init"
  | "quick_header";

type QuickGeolocateReason =
  | "insecure_context"
  | "browser_unavailable"
  | "permission_denied"
  | "watch_error"
  | "watch_timeout";


async function coordsFromIpFallback(
  source: QuickLocationSource,
  reason: QuickGeolocateReason,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const geoResponse = await fetch("/api/places/geolocate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-wc-location-source": source,
        "x-wc-location-reason": reason,
      },
    });
    if (geoResponse.ok) {
      const geoData = await geoResponse.json();
      if (geoData.location?.lat != null && geoData.location?.lng != null) {
        return { latitude: geoData.location.lat, longitude: geoData.location.lng };
      }
    }
  } catch {
    /* continue */
  }
  try {
    const ipResponse = await fetch("https://ipapi.co/json/");
    if (ipResponse.ok) {
      const ipData = await ipResponse.json();
      if (ipData.latitude != null && ipData.longitude != null) {
        return { latitude: ipData.latitude, longitude: ipData.longitude };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Same acquisition order as `LocationSearchModal.handleUseCurrentLocation`:
 * 1) getCurrentPosition (high accuracy, maxAge 60s — same cached fix as location screen)
 * 2) On failure: watchPosition with ≤50m / ≤100m after 5s / ≤500m after 8s, then IP fallback
 */
function acquireCoordsLikeLocationModal(
  source: QuickLocationSource,
): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!canUseBrowserGeolocation()) {
      const reason: QuickGeolocateReason =
        typeof window !== "undefined" && !window.isSecureContext
          ? "insecure_context"
          : "browser_unavailable";

      void coordsFromIpFallback(source, reason).then((coordinates) => {
        if (coordinates) {
          resolve(coordinates);
          return;
        }

        reject(new Error("Unable to determine an approximate location"));
      });
      return;
    }

    const oneShotOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 60000,
    };

    const gpsOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    };

    const TARGET_ACCURACY = 50;
    /** Cap watch wait so Quick / session prime does not sit on "Getting location…" for nearly a minute. */
    const MAX_WAIT_TIME = 22000;
    const ACCEPTABLE_ACCURACY = 100;

    let startTime = Date.now();
    let bestPosition: GeolocationPosition | null = null;
    let bestAccuracy = Infinity;
    let watchId: number | null = null;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let settled = false;
    let fallbackPromise:
      | Promise<{ latitude: number; longitude: number } | null>
      | null = null;
      

    const finish = (lat: number, lng: number) => {
      if (settled) return;
      settled = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
      if (intervalId != null) clearInterval(intervalId);
      resolve({ latitude: lat, longitude: lng });
    };

    const tryFinishFromBest = async (
      reason: "permission_denied" | "watch_error" | "watch_timeout",
    ) => {
      if (settled) return;

      if (bestPosition && bestAccuracy < 500) {
        finish(bestPosition.coords.latitude, bestPosition.coords.longitude);
        return;
      }

      if (!fallbackPromise) {
        if (intervalId != null) {
          clearInterval(intervalId);
          intervalId = null;
        }

        if (watchId != null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }

        fallbackPromise = coordsFromIpFallback(source, reason);
      }

      const ip = await fallbackPromise;

      if (settled) return;

      if (ip) {
        finish(ip.latitude, ip.longitude);
        return;
      }

      settled = true;
      reject(new Error("Unable to determine an approximate location"));
    };

    const handlePositionUpdate = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      const elapsedTime = Date.now() - startTime;
      if (accuracy < bestAccuracy) {
        bestPosition = position;
        bestAccuracy = accuracy;
      }
      if (accuracy <= TARGET_ACCURACY) {
        finish(latitude, longitude);
        return;
      }
      if (accuracy <= ACCEPTABLE_ACCURACY && elapsedTime >= 5000) {
        finish(latitude, longitude);
        return;
      }
      if (accuracy <= 500 && elapsedTime >= 8000) {
        finish(latitude, longitude);
      }
    };

    const handleWatchError = () => {
      void tryFinishFromBest("watch_error");
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        finish(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          void tryFinishFromBest("permission_denied");
          return;
        }
        startTime = Date.now();
        bestPosition = null;
        bestAccuracy = Infinity;
        intervalId = setInterval(() => {
          if (Date.now() - startTime >= MAX_WAIT_TIME) {
            void tryFinishFromBest("watch_timeout");
          }
        }, 1000);
        watchId = navigator.geolocation.watchPosition(
          handlePositionUpdate,
          handleWatchError,
          gpsOptions,
        );
      },
      oneShotOptions,
    );
  });
}

async function reverseGeocodeLatLng(
  latitude: number,
  longitude: number,
  source: QuickLocationSource,
): Promise<Omit<QuickDeliveryResolvedLocation, "latitude" | "longitude"> | null> {
  try {
    const response = await fetch(
      `/api/places/geocode?lat=${encodeURIComponent(latitude)}&lng=${encodeURIComponent(longitude)}`,
      {
        headers: {
          "x-wc-location-source": source,
        },
      },
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (data.status !== "OK" || !data.results?.length) return null;

    let result = data.results[0];
    const streetAddressResult = data.results.find(
      (r: { types?: string[] }) =>
        r.types?.includes("street_address") || r.types?.includes("premise"),
    );
    if (streetAddressResult) result = streetAddressResult;

    const formattedAddress = result.formatted_address || "";
    const addressComponents = result.address_components || [];
    const getComponent = (types: string[]) => {
      const component = addressComponents.find((comp: { types: string[] }) =>
        types.some((type) => comp.types.includes(type)),
      );
      return component ? component.long_name : "";
    };

    const city =
      getComponent(["locality"]) ||
      getComponent(["administrative_area_level_2"]) ||
      "";
    const state = getComponent(["administrative_area_level_1"]) || "";
    const pincode = getComponent(["postal_code"]) || "";

    return {
      address: formattedAddress || "Current location",
      city,
      state,
      pincode,
    };
  } catch {
    return null;
  }
}

/** Resolve GPS + reverse geocode — matches location modal behaviour for coords and formatted address. */
let quickLocationRequest:
  | Promise<QuickDeliveryResolvedLocation>
  | null = null;

export function fetchQuickDeliveryLocationDetailed(
  source: QuickLocationSource,
): Promise<QuickDeliveryResolvedLocation> {
  if (quickLocationRequest) {
    return quickLocationRequest;
  }

  quickLocationRequest = (async () => {
    const { latitude, longitude } =await acquireCoordsLikeLocationModal(source);
    const details = await reverseGeocodeLatLng(latitude, longitude, source);

    if (!details) {
      throw new Error("Unable to reverse geocode the resolved location");
    }

    return {
      latitude: String(latitude),
      longitude: String(longitude),
      ...details,
    };
  })().finally(() => {
    quickLocationRequest = null;
  });

  return quickLocationRequest;
}
