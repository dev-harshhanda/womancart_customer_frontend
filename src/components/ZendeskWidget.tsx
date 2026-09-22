"use client";
import { useEffect } from "react";

const ZENDESK_KEY = process.env.NEXT_PUBLIC_ZENDESK_KEY;

declare global {
  interface Window {
    zE?: {
      (action: string, ...args: any[]): void;
      webWidget: {
        show: () => void;
        hide: () => void;
        open: () => void;
        close: () => void;
      };
    };
  }
}

export function ZendeskWidget() {
  useEffect(() => {
    // Load Zendesk script
    const script = document.createElement("script");
    script.id = "ze-snippet";
    script.src = `https://static.zdassets.com/ekr/snippet.js?key=${ZENDESK_KEY}`;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup: remove script on unmount
      const existingScript = document.getElementById("ze-snippet");
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return null;
}

export function openZendeskWidget() {
  if (typeof window !== "undefined" && window.zE) {
    window.zE("webWidget", "open");
  }
}
