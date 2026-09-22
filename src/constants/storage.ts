"use client";

export const setToStorage = (key: string, data: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, data);
  }
};

export const getFromStorage = (key: string): string | null => {
  if (typeof window !== "undefined") {
    return localStorage.getItem(key);
  }
  return null; // Return a fallback value if called on the server
};

export const removeFromStorage = (key: string) => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(key);
  }
};
