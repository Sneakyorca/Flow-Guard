import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main className="hero" style={{ padding: "96px 24px" }}>
      <div className="kicker">404</div>
      <h1>This replay link doesn’t work</h1>
      <p>It may have been mistyped, or the run was deleted when its history expired. Ask whoever sent it for a fresh link.</p>
      <p style={{ marginTop: 24 }}><Link className="btn primary" href="/">Go to FlowGuard</Link></p>
    </main>
  );
}
