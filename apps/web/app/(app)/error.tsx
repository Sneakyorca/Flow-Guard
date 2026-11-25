"use client";
import Link from "next/link";
import { useEffect } from "react";

// A workspace page crashed: keep the sidebar, explain, offer a retry.
// Common cause in practice: Supabase briefly unreachable while loading flows and runs.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <section className="panel state-panel" role="alert">
      <h1>Couldn’t load this page</h1>
      <p>Usually the database didn’t answer in time. Your flows are safe and keep running every hour.</p>
      <p className="state-actions">
        <button className="btn primary" onClick={reset}>Try again</button>
        <Link className="btn ghost" href="/monitors">Back to monitors</Link>
      </p>
      {error.digest && <p className="state-code">Error code: <code>{error.digest}</code></p>}
    </section>
  );
}
