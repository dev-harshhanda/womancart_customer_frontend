"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Keep a trace in devtools for the real root cause.
    console.error("Global app error:", error);
  }, [error]);

  return (
    <section className="error_page u_spc">
      <div className="container">
        <h1>500</h1>
        <h2>Something went wrong</h2>
        <p>
          We hit an unexpected error while loading this page. Please try again.
        </p>
        {process.env.NODE_ENV !== "production" && (
          <p style={{ wordBreak: "break-word", opacity: 0.8 }}>
            {error?.message || error?.digest || "Unknown error"}
          </p>
        )}
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 16,
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 16px",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    </section>
  );
}