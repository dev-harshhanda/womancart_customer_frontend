import { getFromStorage, setToStorage, removeFromStorage } from "@/constants/storage";
import type { Address, AddressFormData } from "@/types/General";
import { buildFullPhone, normalizePhoneCode } from "@/utils/phoneNumber";

/** Persisted per delivery mode (numeric id or "__current__" for map/search location). */
export const WC_SELECTED_ADDRESS_NORMAL = "WC_SELECTED_ADDRESS_NORMAL";
export const WC_SELECTED_ADDRESS_QUICK = "WC_SELECTED_ADDRESS_QUICK";

export const SELECTED_LOCATION_KEY = "SELECTED_LOCATION";

/**
 * Fresh browser tab / app open: sessionStorage is empty → we clear local "deliver here" pins and
 * refetch GPS. Same tab refresh keeps sessionStorage → "Deliver here" survives F5 only.
 */
export const WC_DELIVERY_TAB_BOOT_KEY = "WC_DELIVERY_TAB_BOOT";

/** While `primeSessionLocationIfEmpty` is fetching GPS (guest / fresh tab normal mode). */
export const WC_LOCATION_PRIME_PENDING = "WC_LOCATION_PRIME_PENDING";

/** When set, normal delivery follows explicit "Deliver here" / persisted id; when unset, normal always uses API default address. */
export const WC_NORMAL_DELIVER_HERE_PINNED = "WC_NORMAL_DELIVER_HERE_PINNED";

/** Last user-chosen delivery (survives logout/login and new browser tabs). */
export const WC_LAST_COMMITTED_DELIVERY = "WC_LAST_COMMITTED_DELIVERY";

export const DELIVERY_SELECTION_CHANGED = "wcDeliverySelectionChanged";

export function setNormalDeliverHerePinned(pinned: boolean) {
  if (typeof window === "undefined") return;
  if (pinned) setToStorage(WC_NORMAL_DELIVER_HERE_PINNED, "1");
  else removeFromStorage(WC_NORMAL_DELIVER_HERE_PINNED);
}

export function isNormalDeliverHerePinned(): boolean {
  return getFromStorage(WC_NORMAL_DELIVER_HERE_PINNED) === "1";
}

export function hasQuickDeliveryGpsCoords(): boolean {
  const loc = readSelectedLocation();
  if (!loc) return false;
  const lat = parseFloat(String(loc.latitude));
  const lng = parseFloat(String(loc.longitude));
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  );
}



export type SelectedLocationData = {
  latitude: string;
  longitude: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  place_id?: string;
};

export function persistKeyForMode(mode: "normal" | "quick_delivery") {
  return mode === "quick_delivery" ? WC_SELECTED_ADDRESS_QUICK : WC_SELECTED_ADDRESS_NORMAL;
}

function readSelectedLocationSessionRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(SELECTED_LOCATION_KEY);
  } catch {
    return null;
  }
}

export function readSelectedLocation(): SelectedLocationData | null {
  const sessionRaw = readSelectedLocationSessionRaw();
  if (sessionRaw) {
    try {
      return JSON.parse(sessionRaw) as SelectedLocationData;
    } catch {
      return null;
    }
  }
  const legacy = getFromStorage(SELECTED_LOCATION_KEY);
  if (legacy && typeof window !== "undefined") {
    try {
      const parsed = JSON.parse(legacy) as SelectedLocationData;
      try {
        sessionStorage.setItem(SELECTED_LOCATION_KEY, legacy);
      } catch {
        /* ignore */
      }
      removeFromStorage(SELECTED_LOCATION_KEY);
      return parsed;
    } catch {
      return null;
    }
  }
  return null;
}

/** Persist pin / GPS row for this tab only (survives refresh, cleared when tab closes). */
export function writeSelectedLocationData(data: SelectedLocationData) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SELECTED_LOCATION_KEY, JSON.stringify(data));
    removeFromStorage(SELECTED_LOCATION_KEY);
  } catch {
    /* ignore */
  }
}

export function clearSelectedLocationStorage() {
  removeFromStorage(SELECTED_LOCATION_KEY);
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SELECTED_LOCATION_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Call once per page load (client). If this is a new tab, clears cross-session delivery selection
 * so the app refetches current location. Returns true when a new tab session was initialized.
 */
export function ensureBrowserDeliveryTabSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (sessionStorage.getItem(WC_DELIVERY_TAB_BOOT_KEY)) {
      return false;
    }
    sessionStorage.setItem(WC_DELIVERY_TAB_BOOT_KEY, "1");

    removeFromStorage(SELECTED_LOCATION_KEY);
    try {
      sessionStorage.removeItem(SELECTED_LOCATION_KEY);
    } catch {
      /* ignore */
    }
    removeFromStorage(WC_NORMAL_DELIVER_HERE_PINNED);
    removeFromStorage(WC_SELECTED_ADDRESS_NORMAL);
    removeFromStorage(WC_SELECTED_ADDRESS_QUICK);
    try {
      sessionStorage.removeItem(WC_LOCATION_PRIME_PENDING);
    } catch {
      /* ignore */
    }
    restoreCommittedDeliverySelection();
    return true;
  } catch {
    return false;
  }
}

let primeSessionLocationPromise: Promise<void> | null = null;

export function readSessionLocationPrimePending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(WC_LOCATION_PRIME_PENDING) === "1";
  } catch {
    return false;
  }
}

/** After a new tab, fetch GPS + reverse geocode into SELECTED_LOCATION when still empty. */
export function primeSessionLocationIfEmpty(pathname: string | null | undefined): void {
  if (typeof window === "undefined") return;
  if (!pathname || pathname.startsWith("/auth")) return;
  if (hasPersistedDeliverySelection() || hasQuickDeliveryGpsCoords()) return;

  if (primeSessionLocationPromise) return;

  primeSessionLocationPromise = (async () => {
    try {
      try {
        sessionStorage.setItem(WC_LOCATION_PRIME_PENDING, "1");
      } catch {
        /* ignore */
      }
      notifyDeliverySelectionChanged();

      const { fetchQuickDeliveryLocationDetailed } = await import(
        "@/utils/quickDeliveryGeolocation"
      );
      const next = await fetchQuickDeliveryLocationDetailed(
        "delivery_session_init",
      );

      // If user selected/searched a location while this async prime was running,
      // do not override it with a late GPS response.
      if (hasQuickDeliveryGpsCoords()) {
        return;
      }

      writeSelectedLocationData({
        latitude: next.latitude,
        longitude: next.longitude,
        address: next.address,
        city: next.city,
        state: next.state,
        pincode: next.pincode,
      });

      try {
        sessionStorage.setItem(WC_QUICK_GPS_FILLED_SESSION, "1");
      } catch {
        /* ignore */
      }

      try {
        const { WC_BROWSER_GEO_SESSION_KEY } = await import("@/utils/dashboardGeolocation");
        sessionStorage.setItem(
          WC_BROWSER_GEO_SESSION_KEY,
          JSON.stringify({
            latitude: parseFloat(next.latitude),
            longitude: parseFloat(next.longitude),
          }),
        );
      } catch {
        /* ignore */
      }
    } catch {
      /* keep default coords via dashboard helpers; still notify below */
    } finally {
      try {
        sessionStorage.removeItem(WC_LOCATION_PRIME_PENDING);
      } catch {
        /* ignore */
      }
      primeSessionLocationPromise = null;
      notifyDeliverySelectionChanged();
    }
  })();
}

export function writeSelectedLocationFromAddress(addr: Address) {
  const data: SelectedLocationData = {
    latitude: String(addr.latitude ?? "0"),
    longitude: String(addr.longitude ?? "0"),
    address:
      addr.address ||
      [addr.pincode, addr.city].filter(Boolean).join(" ") ||
      "",
    city: addr.city,
    state: addr.state,
    pincode: addr.pincode,
  };
  writeSelectedLocationData(data);
  commitDeliverySelectionSnapshot();
}

export function persistDeliveryAddressIdForMode(
  mode: "normal" | "quick_delivery",
  addressId: string,
) {
  const key = persistKeyForMode(mode);
  if (!addressId) {
    removeFromStorage(key);
    return;
  }
  setToStorage(key, String(addressId));
  commitDeliverySelectionSnapshot();
}

export function readPersistedDeliveryAddressId(
  mode: "normal" | "quick_delivery",
): string | null {
  const v = getFromStorage(persistKeyForMode(mode));
  return v && String(v).length > 0 ? String(v) : null;
}

/** Keep in sync with `Header.tsx` */
const WC_QUICK_GPS_FILLED_SESSION = "wcQuickGpsFilledSession";
/** Keep in sync with `dashboardGeolocation.ts` WC_BROWSER_GEO_SESSION_KEY */
const WC_BROWSER_GEO_COORDS_SESSION = "WC_BROWSER_GEO_COORDS";

/**
 * True when the guest explicitly chose a map/search pin from the delivery drawer
 * (`handleGuestDeliveryLocationSelect` sets both persisted ids to "__current__").
 * In that case we keep the same coordinates/label after login for normal and quick.
 */
export function hasGuestCommittedSearchLocationForLogin(): boolean {
  return (
    readPersistedDeliveryAddressId("normal") === "__current__" &&
    readPersistedDeliveryAddressId("quick_delivery") === "__current__"
  );
}

/**
 * Clears guest/session delivery pin and persisted ids so after login the app
 * follows the usual saved-address flow (default + my-address pages).
 */
export function resetDeliverySelectionAfterLogin(): void {
  clearSelectedLocationStorage();
  persistDeliveryAddressIdForMode("normal", "");
  persistDeliveryAddressIdForMode("quick_delivery", "");
  setNormalDeliverHerePinned(false);
  removeFromStorage(WC_LAST_COMMITTED_DELIVERY);
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(WC_QUICK_GPS_FILLED_SESSION);
    sessionStorage.removeItem(WC_BROWSER_GEO_COORDS_SESSION);
  } catch {
    /* ignore */
  }
}

function addressMatchingLocation(
  loc: SelectedLocationData,
  addresses: Address[],
): Address | null {
  if (!loc?.pincode || !loc?.city) return null;
  return addresses.find((a) => a.pincode === loc.pincode && a.city === loc.city) ?? null;
}

export function findAddressMatchingLocation(
  loc: SelectedLocationData | null,
  addresses: Address[],
): Address | null {
  if (!loc) return null;
  return addressMatchingLocation(loc, addresses);
}

/** Valid lat/lng in SELECTED_LOCATION (for header quick-delivery UI). */
function hasUsableLocationFields(location: {
  latitude?: string | number | null;
  longitude?: string | number | null;
  address?: string | null;
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
}): boolean {
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);
  const address = String(location.address || location.address1 || "").trim();

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0) &&
    Boolean(address) &&
    Boolean(String(location.city || "").trim()) &&
    Boolean(String(location.state || "").trim()) &&
    Boolean(String(location.pincode || "").trim())
  );
}

export function hasUsableDeliveryLocation(
  addresses: Address[],
  mode: "normal" | "quick_delivery",
): boolean {
  const selectedLocation = readSelectedLocation();

  if (
    selectedLocation &&
    hasUsableLocationFields(selectedLocation)
  ) {
    return true;
  }

  const persistedId = readPersistedDeliveryAddressId(mode);

  if (persistedId && persistedId !== "__current__") {
    const persistedAddress = addresses.find(
      (address) => String(address.id) === persistedId,
    );

    if (
      persistedAddress &&
      hasUsableLocationFields(persistedAddress)
    ) {
      return true;
    }
  }

  return addresses.some(hasUsableLocationFields);
}

/** True if quick mode should re-fetch GPS (stale normal address copied into SELECTED_LOCATION, or no fix yet). */
export function shouldRefreshQuickDeliveryGps(addresses: Address[]): boolean {
  const loc = readSelectedLocation();
  if (!loc) return true;
  const lat = parseFloat(String(loc.latitude));
  const lng = parseFloat(String(loc.longitude));
  const hasGps =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0);
  if (!hasGps) return true;
  if (!addresses.length) return false;
  // If the user explicitly pinned a delivery location ("Deliver here"/manual selection),
  // keep that selection when switching to quick mode instead of overriding with GPS.
  if (isNormalDeliverHerePinned()) return false;
  return addressMatchingLocation(loc, addresses) != null;
}

/** True if stored coordinates should imply an active pin (vs GPS-only placeholder for quick). */
function locationQualifiesAsActivePin(
  loc: SelectedLocationData,
  mode: "normal" | "quick_delivery",
): boolean {
  if (loc.pincode?.trim() || loc.city?.trim()) return true;
  const addrText = loc.address?.trim() || "";
  if (!addrText) return false;
  if (mode === "normal" && addrText === "Current location") {
    return false;
  }
  return true;
}

type CommittedDeliverySnapshot = {
  normalId: string;
  quickId: string;
  pinned: boolean;
  location: SelectedLocationData | null;
};

export function commitDeliverySelectionSnapshot() {
  if (typeof window === "undefined") return;
  const snapshot: CommittedDeliverySnapshot = {
    normalId: readPersistedDeliveryAddressId("normal") || "",
    quickId: readPersistedDeliveryAddressId("quick_delivery") || "",
    pinned: isNormalDeliverHerePinned(),
    location: readSelectedLocation(),
  };
  const hasLocation =
    snapshot.location != null &&
    locationQualifiesAsActivePin(snapshot.location, "normal");
  if (!snapshot.normalId && !snapshot.quickId && !snapshot.pinned && !hasLocation) {
    return;
  }
  setToStorage(WC_LAST_COMMITTED_DELIVERY, JSON.stringify(snapshot));
}

/** Pincode for product/cart APIs — session location first, then committed delivery snapshot. */
export function readPincodeForProductApi(): string {
  const fromLocation = readSelectedLocation()?.pincode;
  if (fromLocation != null && String(fromLocation).trim()) {
    return String(fromLocation).trim();
  }
  try {
    const raw = getFromStorage(WC_LAST_COMMITTED_DELIVERY);
    if (!raw) return "";
    const snap = JSON.parse(raw) as CommittedDeliverySnapshot;
    const pc = snap?.location?.pincode;
    return pc != null && String(pc).trim() ? String(pc).trim() : "";
  } catch {
    return "";
  }
}

/** Restore saved delivery pin on hard reload before product APIs run. */
export function hydrateDeliveryContextForProductRequest(): void {
  if (typeof window === "undefined") return;
  if (readPincodeForProductApi()) return;
  restoreCommittedDeliverySelection();
}

export function restoreCommittedDeliverySelection(): boolean {
  const raw = getFromStorage(WC_LAST_COMMITTED_DELIVERY);
  if (!raw) return false;
  try {
    const snap = JSON.parse(raw) as CommittedDeliverySnapshot;
    if (snap.pinned) setNormalDeliverHerePinned(true);
    else setNormalDeliverHerePinned(false);
    if (snap.normalId) {
      const key = persistKeyForMode("normal");
      setToStorage(key, snap.normalId);
    }
    if (snap.quickId) {
      const key = persistKeyForMode("quick_delivery");
      setToStorage(key, snap.quickId);
    }
    if (snap.location) writeSelectedLocationData(snap.location);
    return true;
  } catch {
    return false;
  }
}

export function hasPersistedDeliverySelection(): boolean {
  if (isNormalDeliverHerePinned()) return true;
  if (readPersistedDeliveryAddressId("normal")) return true;
  if (readPersistedDeliveryAddressId("quick_delivery")) return true;
  const loc = readSelectedLocation();
  if (loc && locationQualifiesAsActivePin(loc, "normal")) return true;
  return Boolean(getFromStorage(WC_LAST_COMMITTED_DELIVERY));
}

/**
 * Single source for which delivery address id is active (saved id or "__current__").
 */
export function resolveDeliveryAddressId(
  addresses: Address[],
  mode: "normal" | "quick_delivery",
): string {
  if (!addresses.length) return "";

  const loc = readSelectedLocation();
  const persisted = readPersistedDeliveryAddressId(mode);

  // Normal delivery: if the user has NOT explicitly chosen "Deliver here", prefer the active pin
  // (current GPS / search pin) so just having an address in the list doesn't override the header.
  if (mode === "normal" && !isNormalDeliverHerePinned()) {
    const lat = loc ? parseFloat(String(loc.latitude)) : NaN;
    const lng = loc ? parseFloat(String(loc.longitude)) : NaN;
    const hasCoords =
      Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
    if (loc && hasCoords) {
      return "__current__";
    }
    const defaultAddr = addresses.find((a) => Number(a.is_default) === 1);
    if (defaultAddr) return String(defaultAddr.id);
  }

  // Quick delivery: allow explicit "Deliver here" selection to show in quick mode as well.
  // If nothing explicit is selected, fall back to "__current__" (GPS/current pin).
  if (mode === "quick_delivery") {
    if (persisted && persisted !== "__current__") {
      const byId = addresses.find((a) => a.id.toString() === persisted);
      if (byId) return persisted;
    }
    return "__current__";
  }

  if (persisted === "__current__") {
    if (loc && locationQualifiesAsActivePin(loc, mode)) {
      return "__current__";
    }
  } else if (persisted) {
    const byId = addresses.find((a) => a.id.toString() === persisted);
    if (byId) return persisted;
  }

  if (loc) {
    const match = addressMatchingLocation(loc, addresses);
    if (match) return match.id.toString();
    if (locationQualifiesAsActivePin(loc, mode)) {
      return "__current__";
    }
  }

  const defaultAddr = addresses.find((a) => Number(a.is_default) === 1);
  if (defaultAddr) return defaultAddr.id.toString();

  return addresses[0].id.toString();
}

export function getDeliveryDisplayLabel(
  selectedId: string,
  addresses: Address[],
): string {
  if (!selectedId) return "Select delivery address";
  if (selectedId === "__current__") {
    const loc = readSelectedLocation();
    if (!loc) return "Select delivery address";
    const parts = [loc.pincode, loc.city].filter(Boolean);
    if (parts.length > 0) return parts.join(" ");
    if (loc.address?.length) {
      return loc.address.length > 30 ? `${loc.address.slice(0, 30)}...` : loc.address;
    }
    return "Current location";
  }
  const addr = addresses.find((a) => a.id.toString() === selectedId);
  if (!addr) return "Select delivery address";
  const parts = [addr.pincode, addr.city].filter(Boolean);
  return parts.join(" ") || addr.address?.slice(0, 20) || "Select delivery address";
}

/** Minimum fields needed to place an order (name + contact + delivery location). */
export function isAddressCompleteForOrder(addr: Address | null): boolean {
  if (!addr) return false;
  return Boolean(
    String(addr.name ?? "").trim() &&
      String(addr.mobile ?? "").trim() &&
      String(addr.address ?? "").trim() &&
      String(addr.city ?? "").trim() &&
      String(addr.state ?? "").trim() &&
      String(addr.pincode ?? "").trim(),
  );
}

/** Address row for order APIs / full formatting; null if nothing usable. */
export function resolveAddressForOrder(
  selectedId: string,
  addresses: Address[],
): Address | null {
  if (!selectedId) return null;
  if (selectedId === "__current__") {
    const loc = readSelectedLocation();
    if (!loc || (!loc.latitude && !loc.longitude && !loc.address)) return null;
    const matched = addressMatchingLocation(loc, addresses);
    const gpsAddress = String(loc.address ?? "").trim();
    const matchedAddress1 = String(matched?.address1 ?? "").trim();
    return {
      id: matched?.id ?? -1,
      name: matched?.name || "",
      mobile: matched?.mobile || "",
      email: matched?.email || "",
      phone_code: matched?.phone_code || "",
      address: gpsAddress || matched?.address || "",
      address1:
        gpsAddress && matchedAddress1 && gpsAddress.includes(matchedAddress1)
          ? ""
          : matchedAddress1,
      landmark: matched?.landmark || "",
      latitude: loc.latitude || matched?.latitude || "0",
      longitude: loc.longitude || matched?.longitude || "0",
      address_type: matched?.address_type || "Home",
      state: loc.state || matched?.state || "",
      city: loc.city || matched?.city || "",
      pincode: loc.pincode || matched?.pincode || "",
    } as Address;
  }
  return addresses.find((a) => a.id.toString() === selectedId) ?? null;
}

/** Prefer saved-address contact when GPS pin (`__current__`) is active. */
export function resolveCheckoutAddress(
  selectedId: string,
  addresses: Address[],
): Address | null {
  const resolved = resolveAddressForOrder(selectedId, addresses);
  if (!resolved || isAddressCompleteForOrder(resolved)) return resolved;
  if (selectedId !== "__current__" || !addresses.length) return resolved;

  const saved =
    addresses.find((a) => Number(a.is_default) === 1) ?? addresses[0];
  if (!saved) return resolved;

  const enriched = {
    ...resolved,
    name: resolved.name || saved.name,
    mobile: resolved.mobile || saved.mobile,
    email: resolved.email || saved.email,
    phone_code: resolved.phone_code || saved.phone_code,
    address: resolved.address || saved.address,
    address1: resolved.address1 || saved.address1,
    landmark: resolved.landmark || saved.landmark,
    city: resolved.city || saved.city,
    state: resolved.state || saved.state,
    pincode: resolved.pincode || saved.pincode,
    address_type: resolved.address_type || saved.address_type,
    latitude: resolved.latitude || saved.latitude,
    longitude: resolved.longitude || saved.longitude,
  } as Address;

  return isAddressCompleteForOrder(enriched) ? enriched : resolved;
}

export function buildEditAddressDefaultBody(chosen: Address): AddressFormData {
  const phoneCode = normalizePhoneCode(chosen.phone_code) || "91";
  return {
    name: chosen.name,
    mobile: chosen.mobile,
    phone: chosen.phone || buildFullPhone(phoneCode, chosen.mobile),
    email: chosen.email || "",
    address: chosen.address || "",
    address1: chosen.address1 || "",
    landmark: chosen.landmark || "",
    latitude: chosen.latitude || "0.0",
    longitude: chosen.longitude || "0.0",
    address_type: chosen.address_type || "Home",
    state: chosen.state || "",
    city: chosen.city || "",
    pincode: chosen.pincode || "",
    country_code: (chosen as Address & { country_code?: string }).country_code || "IN",
    phone_code: `+${phoneCode}`,
    is_default: 1,
  };
}

export function notifyDeliverySelectionChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DELIVERY_SELECTION_CHANGED));
}
