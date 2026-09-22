import { getFromStorage, setToStorage, removeFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";

export type GuestLoginMutation = (args: {
  body: { fcm_token: string };
}) => { unwrap: () => Promise<unknown> };

export function clearAuthSessionForGuest() {
  removeFromStorage(STORAGE_KEYS.token);
  removeFromStorage(STORAGE_KEYS.tokenNode);
  removeFromStorage(STORAGE_KEYS.credentials);
  removeFromStorage(STORAGE_KEYS.guestAuthToken);
  removeFromStorage(STORAGE_KEYS.guestJwtToken);
  removeFromStorage(STORAGE_KEYS.guestUserId);
  try {
    sessionStorage.removeItem(STORAGE_KEYS.guestLoginInitialized);
  } catch {
    /* ignore */
  }
}

export function persistGuestLoginResponse(res: unknown): boolean {
  const response = res as Record<string, unknown>;
  const data = (response?.data as Record<string, unknown>) || {};

  // Laravel Sanctum token (`auth_token`) is required for guest cart remove/clear/qty.
  // Older payloads may still send `auth`.
  const guestAuth = String(
    data.auth_token ||
      data.auth ||
      response.auth_token ||
      response.auth ||
      "",
  );
  const guestJwt = String(data.jwt_token || response.jwt_token || "");
  const guestUserId =
    data.guest_user_id ??
    data.user_id ??
    data.id ??
    response.guest_user_id ??
    response.user_id ??
    response.id;

  if (guestAuth) {
    setToStorage(STORAGE_KEYS.guestAuthToken, guestAuth);
  }
  if (guestJwt) {
    setToStorage(STORAGE_KEYS.guestJwtToken, guestJwt);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("guestTokenUpdated"));
    }
  }
  if (guestUserId != null && String(guestUserId).trim()) {
    setToStorage(STORAGE_KEYS.guestUserId, String(guestUserId));
  }

  const hasGuestSession = Boolean(
    guestAuth || guestJwt || (guestUserId != null && String(guestUserId).trim()),
  );
  if (hasGuestSession) {
    try {
      sessionStorage.setItem(STORAGE_KEYS.guestLoginInitialized, "1");
    } catch {
      /* ignore */
    }
  }
  return hasGuestSession;
}

export async function performGuestLogin(
  guestLogin: GuestLoginMutation,
): Promise<boolean> {
  const fcmToken = getFromStorage(STORAGE_KEYS.fcmToken) || "web";
  try {
    const res = await guestLogin({ body: { fcm_token: fcmToken } }).unwrap();
    return persistGuestLoginResponse(res);
  } catch {
    return false;
  }
}

/**
 * Ensure a guest has Laravel Sanctum `auth_token` for cart remove/clear/qty.
 * No-op when the user is already logged in.
 */
export async function ensureGuestCartAuth(
  guestLogin: GuestLoginMutation,
): Promise<boolean> {
  const userToken = getFromStorage(STORAGE_KEYS.token);
  if (userToken) return true;

  if (getFromStorage(STORAGE_KEYS.guestAuthToken)) return true;

  return performGuestLogin(guestLogin);
}
