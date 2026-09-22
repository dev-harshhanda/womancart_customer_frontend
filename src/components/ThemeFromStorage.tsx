"use client";

import { useEffect } from "react";
import { getFromStorage } from "@/constants/storage";
import { STORAGE_KEYS } from "@/constants/storageKeys";
import type { ThemeSettingResponse } from "@/service/theme";

const THEME_CSS_VARS: Record<string, string> = {
  website_primary_color: "--theme-website-primary-color",
  website_secondary_color: "--theme-website-secondary-color",
  header_background_color: "--theme-header-background-color",
  landing_page_header_color: "--theme-landing-page-header-color",
};

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, "");
  if (h.length !== 6 && h.length !== 3) return hex;
  const r = h.length === 3 ? parseInt(h[0] + h[0], 16) : parseInt(h.slice(0, 2), 16);
  const g = h.length === 3 ? parseInt(h[1] + h[1], 16) : parseInt(h.slice(2, 4), 16);
  const b = h.length === 3 ? parseInt(h[2] + h[2], 16) : parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Theme: colors are read from localStorage (backend data). No backend hex codes here.
// Only used when localStorage is empty (e.g. first load before API returns).
const DEFAULT_THEME: Record<string, string> = {
  website_primary_color: "#d91b76",
  website_secondary_color: "#3B82F6",
  header_background_color: "#ffeaf3",
  landing_page_header_color: "#d91b76",
};

function applyThemeFromStorage() {
  if (typeof window === "undefined") return;
  const raw = getFromStorage(STORAGE_KEYS.themeSetting);
  if (!raw) {
    return;
  }
  let theme: Record<string, string> = { ...DEFAULT_THEME };
  try {
    const parsed: ThemeSettingResponse = JSON.parse(raw);
    const first = parsed?.data?.[0];
    if (first) {
      theme = {
        website_primary_color: first.website_primary_color ?? DEFAULT_THEME.website_primary_color,
        website_secondary_color: first.website_secondary_color ?? DEFAULT_THEME.website_secondary_color,
        header_background_color: first.header_background_color ?? DEFAULT_THEME.header_background_color,
        landing_page_header_color: first.landing_page_header_color ?? DEFAULT_THEME.landing_page_header_color,
      };
    }
  } catch {
    return;
  }
  const root = document.documentElement;
  Object.entries(THEME_CSS_VARS).forEach(([key, cssVar]) => {
    if (key === "primary_light") {
      const primary = theme.website_primary_color ?? theme.primary_color ?? DEFAULT_THEME.website_primary_color;
      root.style.setProperty(cssVar, hexToRgba(primary, 0.05));
    } else {
      root.style.setProperty(cssVar, theme[key as keyof typeof theme] ?? DEFAULT_THEME[key as keyof typeof DEFAULT_THEME]);
    }
  });
}

export default function ThemeFromStorage() {
  useEffect(() => {
    applyThemeFromStorage();
    const handleStorage = () => applyThemeFromStorage();
    const handleThemeUpdated = () => applyThemeFromStorage();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("themeSettingUpdated", handleThemeUpdated);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("themeSettingUpdated", handleThemeUpdated);
    };
  }, []);
  return null;
}
