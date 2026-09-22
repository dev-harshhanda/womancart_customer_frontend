"use client";

import { useLayoutEffect, useState } from "react";
import {
  APP_STORE_NATIVE_URL,
  APP_STORE_URL,
  GOOGLE_PLAY_NATIVE_URL,
  GOOGLE_PLAY_URL,
} from "@/constants/appDownload";
import { detectClientPlatform } from "@/utils/deviceDetection";
import AppDownloadLanding from "./AppDownloadLanding";

function openStore(nativeUrl: string, webUrl: string) {
  window.location.href = nativeUrl;
  window.setTimeout(() => {
    window.location.replace(webUrl);
  }, 700);
}

/**
 * Mobile: redirect to native store immediately (never show website UI).
 * Desktop: show download landing page.
 */
export default function AppDownloadGate() {
  const [isDesktop, setIsDesktop] = useState(false);

  useLayoutEffect(() => {
    const platform = detectClientPlatform();

    if (platform === "android") {
      openStore(GOOGLE_PLAY_NATIVE_URL, GOOGLE_PLAY_URL);
      return;
    }

    if (platform === "ios") {
      openStore(APP_STORE_NATIVE_URL, APP_STORE_URL);
      return;
    }

    setIsDesktop(true);
  }, []);

  if (!isDesktop) {
    return (
      <main className="app_download_page app_download_page--redirecting">
        <p>Opening app store…</p>
      </main>
    );
  }

  return <AppDownloadLanding />;
}
