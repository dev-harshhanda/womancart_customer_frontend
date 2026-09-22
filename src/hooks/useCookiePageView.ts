"use client";

import { useEffect } from "react";
import { usePostCookieEventMutation } from "@/service/home";

const SESSION_ID_KEY = "cookieAnalyticsSessionId";
const LAST_VIEW_TS_KEY = "cookiePageLastViewAt";
const SESSION_USER_KEY = "cookieAnalyticsSessionUserKey";

function resolveCookieUserKey(): string {
  if (typeof window === "undefined") return "ssr";
  const token = localStorage.getItem("TOKEN") || "";
  const nodeToken = localStorage.getItem("TOKEN_NODE") || "";
  const guestUserId = localStorage.getItem("GUEST_USER_ID") || "";
  if (token || nodeToken) {
    return `auth:${token.slice(-20)}:${nodeToken.slice(-20)}`;
  }
  if (guestUserId) {
    return `guest:${guestUserId}`;
  }
  return "guest:anonymous";
}

export function ensureCookieAnalyticsSessionId(): string {
  const currentUserKey = resolveCookieUserKey();
  const previousUserKey = sessionStorage.getItem(SESSION_USER_KEY);
  let sessionId = sessionStorage.getItem(SESSION_ID_KEY);

  // Rotate analytics session when login identity changes in the same tab.
  if (previousUserKey !== currentUserKey || !sessionId) {
    const randomPart = Math.random().toString(36).slice(2, 10);
    sessionId = `SES-${Date.now()}-${randomPart}`;
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    sessionStorage.setItem(SESSION_USER_KEY, currentUserKey);
    sessionStorage.setItem(LAST_VIEW_TS_KEY, String(Date.now()));
  }

  return sessionId;
}

export function useCookiePageView(pageName: string, enabled = true) {
  const [postCookieEvent] = usePostCookieEventMutation();

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const accepted = localStorage.getItem("cookieConsentAccepted");
    if (accepted !== "1") return;

    const sessionId = ensureCookieAnalyticsSessionId();

    const now = Date.now();
    const lastViewAtRaw = sessionStorage.getItem(LAST_VIEW_TS_KEY);
    const lastViewAt = lastViewAtRaw ? Number(lastViewAtRaw) : now;
    const durationMs = Math.max(0, now - lastViewAt);
    sessionStorage.setItem(LAST_VIEW_TS_KEY, String(now));

    void postCookieEvent({
      event_type: "page_view",
      session_id: sessionId,
      page_name: pageName,
      page_path: window.location.pathname || "/",
      duration_ms: durationMs,
    })
      .unwrap()
      .catch(() => {
        // Keep page rendering unaffected if analytics fails.
      });
  }, [enabled, pageName, postCookieEvent]);
}

