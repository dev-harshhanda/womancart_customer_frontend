"use client";

import { useEffect } from "react";
import {
  registerFirebaseMessagingSW,
  requestNotificationPermissionAndToken,
  subscribeToForegroundMessages,
} from "@/lib/firebase-messaging";
import { setToStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import toast from "react-hot-toast";
import type { MessagePayload } from "firebase/messaging";

type NotificationContent = {
  title: string;
  body?: string;
  redirectUrl?: string;
  pushType?: string;
};

type ToastInstance = { id: string };

const normalizeRefValue = (value: unknown): string | null => {
  if (value == null) return null;
  const text = String(value).trim().replace(/^#/, "");
  return text || null;
};

const findRefInObject = (obj: unknown, keys: string[]): string | null => {
  if (!obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;

  for (const key of keys) {
    const hit = normalizeRefValue(record[key]);
    if (hit) return hit;
  }

  for (const value of Object.values(record)) {
    const nested = findRefInObject(value, keys);
    if (nested) return nested;
  }

  return null;
};

const getOrderReferenceFromPushData = (data: Record<string, string>): string | null => {
  const directOrderKeys = ["orderId", "order_id", "orderNo", "order_no", "id", "referenceId", "reference_id"];
  const directBookingKeys = ["bookingId", "booking_id", "bookingNo", "booking_no"];

  const directOrder = findRefInObject(data, directOrderKeys);
  if (directOrder) return directOrder;

  // Parse stringified JSON blocks in payload data and scan nested keys.
  for (const rawValue of Object.values(data)) {
    if (!rawValue || typeof rawValue !== "string") continue;
    const trimmed = rawValue.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) continue;
    try {
      const parsed = JSON.parse(trimmed);
      const nestedOrder = findRefInObject(parsed, directOrderKeys);
      if (nestedOrder) return nestedOrder;
      const nestedBooking = findRefInObject(parsed, directBookingKeys);
      if (nestedBooking) return nestedBooking;
    } catch {
      // Ignore malformed JSON and continue scanning.
    }
  }

  return findRefInObject(data, directBookingKeys);
};

const getRedirectUrlFromPushData = (pushType: string | undefined, data: Record<string, string>): string => {
  const normalizedType = (pushType || "").trim().toUpperCase();
  const orderRef = getOrderReferenceFromPushData(data);

  if (normalizedType === "NEW_MESSAGE" && orderRef) {
    const encoded = encodeURIComponent(orderRef);
    return `/account/orders/detail/?mode=Ongoing&id=${encoded}&bookingId=${encoded}&openChat=1`;
  }

  if (normalizedType === "ORDER_STATUS_CHANGE" && orderRef) {
    return `/account/orders/detail/?mode=Ongoing&id=${encodeURIComponent(orderRef)}`;
  }

  if (normalizedType === "ORDER_STATUS_CHANGE") {
    return "/account/orders/";
  }

  return "/";
};

function PushNotificationToast({
  t,
  notification,
}: Readonly<{
  t: ToastInstance;
  notification: NotificationContent;
}>) {
  const handleView = () => {
    toast.dismiss(t.id);
    if (notification.redirectUrl) {
      // Use full location navigation for consistency from toast portal context.
      if (notification.redirectUrl.startsWith("http")) window.location.href = notification.redirectUrl;
      else window.location.assign(notification.redirectUrl);
    }
  };

  const handleDismiss = () => {
    toast.dismiss(t.id);
  };

  const baseMessage =
    notification.body?.trim() ?
      `${notification.title} — ${notification.body}`
    : notification.title;

  const message = baseMessage;

  return (
    <div
      className="push-notification-toast"
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
        maxWidth: "min(92vw, 560px)",
        width: "100%",
        minWidth: 0,
      }}
    >
      <p
        style={{
          flex: 1,
          margin: 0,
          fontSize: 14,
          lineHeight: 1.4,
          color: "var(--c_heading, #1d1d1d)",
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
        }}
      >
        {message}
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {notification.redirectUrl && (
          <button
            type="button"
            onClick={handleView}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              borderRadius: 8,
              background: "var(--commerce-primary, #d91b76)",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            View
          </button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            padding: "6px 10px",
            fontSize: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "#fff",
            color: "#555",
            cursor: "pointer",
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default function PushNotificationInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register SW first, then getToken — avoids Firebase 10s "service worker not registered" timeout.
    (async () => {
      const registration = await registerFirebaseMessagingSW();
      const token = await requestNotificationPermissionAndToken(registration);
      if (token) {
        setToStorage(STORAGE_KEYS.fcmToken, token);
      }
    })();

    // Listen for foreground messages
    let unsubscribe: (() => void) | undefined;
    (async () => {
      unsubscribe = await subscribeToForegroundMessages((payload: MessagePayload) => {
        const data = (payload.data || {}) as Record<string, string>;

        const pushType = data.pushType;
        const titleFromData = data.title;
        const messageFromData = data.message;

        const title =
          titleFromData || payload.notification?.title || "Notification";
        const body =
          messageFromData || payload.notification?.body || "";

        // Decide navigation based on push payload
        const redirectUrl = getRedirectUrlFromPushData(pushType, data);

        if (!title && !body) {
          return;
        }

        const notification: NotificationContent = {
          title,
          body: body || undefined,
          redirectUrl,
          pushType,
        };

        toast.custom(
          (t) => <PushNotificationToast t={t} notification={notification} />,
          { duration: 5000 }
        );
      });
    })();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return null;
}
