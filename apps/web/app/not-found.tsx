import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

// Any URL that doesn't exist. Replay and scan links have their own, more specific pages.
export default function NotFound() {
  return (
    <main className="state-page">
      <div className="kicker">404</div>
      <h1>There’s no page here</h1>
      <p>The address may be mistyped, or the page was moved. Nothing is broken on your account.</p>
      <p className="state-actions">
        <Link className="btn primary" href="/">Go to Oluso</Link>
        <Link className="btn ghost" href="/monitors">Your monitors</Link>
      </p>
    </main>
  );
}
