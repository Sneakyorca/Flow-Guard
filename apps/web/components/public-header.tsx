import Link from "next/link";
import { supabaseConfigured } from "@/lib/supabase/env";
import { isSignedIn } from "@/lib/supabase/server";
import { Wordmark } from "./shell";

/**
 * Top bar for public pages (landing, scan results, legal, shared replays).
 * Signed in → a way back to the dashboard, never "Log in".
 * Signed out → Log in + Start free. Demo mode (no Supabase) → sample links.
 * `extra` is an optional page-specific link shown first (e.g. "Privacy" on the Terms page).
 */
export async function PublicHeader({ extra }: { extra?: { href: string; label: string } }) {
  const signedIn = supabaseConfigured && (await isSignedIn());
  return (
    <header className="landing-top">
      <Link href="/" aria-label="FlowGuard home"><Wordmark beta={false} /></Link>
      <nav style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {extra && <Link className="btn ghost" href={extra.href}>{extra.label}</Link>}
        {!supabaseConfigured ? (
          <>
            {!extra && <Link className="btn ghost" href="/replay/482">Sample replay</Link>}
            <Link className="btn" href="/monitors">Dashboard</Link>
          </>
        ) : signedIn ? (
          <Link className="btn" href="/monitors">Your monitors</Link>
        ) : (
          <>
            <Link className="btn ghost" href="/login">Log in</Link>
            <Link className="btn" href="/signup">Start free</Link>
          </>
        )}
      </nav>
    </header>
  );
}
