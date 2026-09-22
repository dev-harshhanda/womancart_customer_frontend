import { getFromStorage, removeFromStorage, setToStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";

type CartCouponUser = {
  id?: number | string;
  _id?: number | string;
} | null | undefined;

export function getCartCouponAuthScope(user?: CartCouponUser): string {
  const userId = user?.id ?? user?._id;
  if (userId != null && String(userId).trim()) {
    return `user_${userId}`;
  }

  const credentialsStr = getFromStorage(STORAGE_KEYS.credentials);
  if (credentialsStr) {
    try {
      const credentials = JSON.parse(credentialsStr) as Record<string, unknown>;
      const id = credentials?.id ?? credentials?._id ?? credentials?.userId;
      if (id != null && String(id).trim()) {
        return `user_${id}`;
      }
    } catch {
      // ignore parse errors
    }
  }

  if (getFromStorage(STORAGE_KEYS.token)) {
    return "user_pending";
  }

  const guestUserId = getFromStorage(STORAGE_KEYS.guestUserId);
  if (guestUserId?.trim()) {
    return `guest_${guestUserId}`;
  }

  return "anonymous";
}

export function getCartAppliedCouponStorageKey(
  deliveryChannel: string,
  authScope?: string,
): string {
  const scope = authScope ?? getCartCouponAuthScope();
  return `${STORAGE_KEYS.cartAppliedCoupon}_${deliveryChannel}_${scope}`;
}

export function getCartCouponIntentStorageKey(
  deliveryChannel: string,
  authScope?: string,
): string {
  const scope = authScope ?? getCartCouponAuthScope();
  return `WC_CART_COUPON_USER_INTENT_${deliveryChannel}_${scope}`;
}

export function readCartCouponUserIntent(
  deliveryChannel: string,
  authScope?: string,
): string {
  return String(
    getFromStorage(getCartCouponIntentStorageKey(deliveryChannel, authScope)) || "",
  ).trim();
}

export function writeCartCouponUserIntent(
  deliveryChannel: string,
  authScope: string,
  code: string,
): void {
  setToStorage(getCartCouponIntentStorageKey(deliveryChannel, authScope), code);
}

export function clearCartCouponUserIntent(
  deliveryChannel: string,
  authScope?: string,
): void {
  removeFromStorage(getCartCouponIntentStorageKey(deliveryChannel, authScope));
}

export function getCartReloadCouponSessionKey(
  deliveryChannel: string,
  authScope?: string,
): string {
  const scope = authScope ?? getCartCouponAuthScope();
  return `WC_CART_RELOAD_COUPON_${deliveryChannel}_${scope}`;
}

export function removeLegacyUnscopedCartCouponKeys(): void {
  removeFromStorage(STORAGE_KEYS.cartAppliedCoupon);
  removeFromStorage(`${STORAGE_KEYS.cartAppliedCoupon}_normal`);
  removeFromStorage(`${STORAGE_KEYS.cartAppliedCoupon}_quick`);
}

export function clearAllPersistedCartCoupons(): void {
  if (typeof window === "undefined") return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (
      key?.startsWith(`${STORAGE_KEYS.cartAppliedCoupon}_`) ||
      key?.startsWith("WC_CART_COUPON_USER_INTENT_")
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}
