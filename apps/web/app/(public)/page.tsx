import Link from "next/link";
import { LandingFooter, Scanner } from "@/components/scanner";
import { Wordmark } from "@/components/shell";
import { ToastProvider } from "@/components/toast";

// Public landing page: the free scanner, without the workspace sidebar.
export default function LandingPage() {
  return (
    <ToastProvider>
      <header className="landing-top">
        <Link href="/" aria-label="FlowGuard home"><Wordmark beta={false} /></Link>
        <nav style={{ display: "flex", gap: 8 }}>
          <Link className="btn ghost" href="/replay/482">Sample replay</Link>
          <Link className="btn" href="/monitors">Dashboard</Link>
        </nav>
      </header>
      <main style={{ padding: "0 24px" }}>
        <Scanner />
      </main>
      <LandingFooter />
    </ToastProvider>
  );
}
