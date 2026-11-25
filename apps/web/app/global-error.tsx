"use client";
import { useEffect } from "react";

// Last resort: the root layout itself failed, so nothing else (fonts, CSS, layout) can be
// relied on. Plain inline styles that work in light and dark.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", background: "Canvas", color: "CanvasText", colorScheme: "light dark" }}>
        <main style={{ maxWidth: 520, margin: "0 auto", padding: "96px 24px" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#b93d17", margin: 0 }}>Oluso</p>
          <h1 style={{ fontSize: 28, lineHeight: 1.2, margin: "10px 0 12px" }}>Something went wrong</h1>
          <p style={{ fontSize: 15, lineHeight: 1.55, opacity: 0.8, margin: 0 }}>
            The app couldn’t start this page. Your flows keep running on their schedule. Try again in a moment.
          </p>
          <p style={{ marginTop: 24, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={reset} style={{ font: "inherit", padding: "8px 14px", borderRadius: 6, border: "1px solid currentColor", background: "CanvasText", color: "Canvas", cursor: "pointer" }}>Try again</button>
            <a href="/" style={{ font: "inherit", padding: "8px 14px", borderRadius: 6, border: "1px solid currentColor", color: "inherit", textDecoration: "none" }}>Go to Oluso</a>
          </p>
          {error.digest && <p style={{ fontSize: 12, opacity: 0.6, marginTop: 24 }}>Error code: <code>{error.digest}</code></p>}
        </main>
      </body>
    </html>
  );
}
