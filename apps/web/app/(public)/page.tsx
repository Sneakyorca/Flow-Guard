import Link from "next/link";
import { LandingFooter, Scanner } from "@/components/scanner";
import { Wordmark } from "@/components/shell";
import { ToastProvider } from "@/components/toast";
import { supabaseConfigured } from "@/lib/supabase/env";

// Public landing page: the free scanner, without the workspace sidebar.
export default function LandingPage() {
  return (
    <ToastProvider>
      <header className="landing-top">
        <Link href="/" aria-label="FlowGuard home"><Wordmark beta={false} /></Link>
        <nav style={{ display: "flex", gap: 8 }}>
          {supabaseConfigured ? (
            <>
              <Link className="btn ghost" href="/login">Log in</Link>
              <Link className="btn" href="/signup">Start free</Link>
            </>
          ) : (
            <>
              <Link className="btn ghost" href="/replay/482">Sample replay</Link>
              <Link className="btn" href="/monitors">Dashboard</Link>
            </>
          )}
        </nav>
      </header>
      <main style={{ padding: "0 24px" }}>
        <Scanner />
      </main>
      <LandingFooter />
    </ToastProvider>
  );
}
