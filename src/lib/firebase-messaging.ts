import { isSupported, getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";
import app from "./firebase";

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

let messagingPromise: Promise<Messaging | null> | null = null;

/**
 * Registers the Firebase Messaging service worker and waits until it is active.
 * `getToken` must receive this registration — otherwise Firebase races registration
 * and can throw `messaging/failed-service-worker-registration` after timing out.
 */
export async function registerFirebaseMessagingSW(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    console.error("[FCM] Service worker registration failed:", err);
    return null;
  }
}

async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (!messagingPromise) {
    messagingPromise = (async () => {
      const supported = await isSupported().catch((err) => {
        console.error("[FCM] isSupported() threw error:", err);
        return false;
      });
      if (!supported) {
        console.warn("[FCM] Firebase messaging is not supported in this browser.");
        return null;
      }
      return getMessaging(app);
    })();
  }

  return messagingPromise;
}

export async function requestNotificationPermissionAndToken(
  serviceWorkerRegistration: ServiceWorkerRegistration | null | undefined,
): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if (!("Notification" in window)) {
    console.warn("[FCM] Notification API not available in this browser.");
    return null;
  }

  if (!serviceWorkerRegistration) {
    console.warn("[FCM] No service worker registration; register before getToken.");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return null;
  }

  const messaging = await getMessagingInstance();
  if (!messaging) {
    return null;
  }

  if (!vapidKey) {
    console.warn("NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set; cannot get FCM token.");
    return null;
  }

  const currentToken = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration,
  }).catch((err) => {
    console.error("[FCM] getToken failed:", err);
    return null;
  });

  if (!currentToken) {
    return null;
  }

  // Log token for debugging
  console.log("[FCM] Token:", currentToken);

  // TODO: send this token to your backend API so you can target this device.
  // Example:
  // await fetch("/api/save-fcm-token", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify({ token: currentToken }),
  // });

  return currentToken;
}

export async function subscribeToForegroundMessages(
  handler: (payload: import("firebase/messaging").MessagePayload) => void
): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging) {
    return () => {};
  }

  const unsubscribe = onMessage(messaging, handler);
  return unsubscribe;
}

