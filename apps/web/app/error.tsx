"use client";
import Link from "next/link";
import { useEffect } from "react";

// A page crashed while rendering (public pages, or a workspace page when the (app) one can't help).
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="state-page" role="alert">
      <div className="kicker">Something went wrong</div>
      <h1>This page didn’t load</h1>
      <p>It’s on our side, not yours. Your flows keep running on their schedule. Try again, and if it keeps happening, send us the code below.</p>
      <p className="state-actions">
        <button className="btn primary" onClick={reset}>Try again</button>
        <Link className="btn ghost" href="/">Go to FlowGuard</Link>
      </p>
      {error.digest && <p className="state-code">Error code: <code>{error.digest}</code></p>}
    </main>
  );
}
