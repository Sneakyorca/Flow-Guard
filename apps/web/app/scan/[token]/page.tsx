import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Wordmark } from "@/components/shell";
import { LandingFooter } from "@/components/scanner";
import { getPublicScan } from "@/lib/scan-report";
import { ScanResult } from "./scan-result";

const scan = cache(getPublicScan);

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const s = await scan((await params).token);
  if (!s) return { title: "Scan not found", robots: { index: false } };
  const title = s.status === "done" ? `${s.host} scored ${s.score}/100` : `Scanning ${s.host}`;
  return { title, description: `Free FlowGuard scan of ${s.host}: broken links, phone layout and JavaScript errors.`, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/** Public report for one free scan. Refreshes itself until the scan finishes. */
export default async function ScanReportPage({ params }: { params: Promise<{ token: string }> }) {
  const s = await scan((await params).token);
  if (!s) notFound();
  return (
    <>
      <header className="landing-top">
        <Link href="/" aria-label="FlowGuard home"><Wordmark beta={false} /></Link>
        <Link className="btn ghost" href="/">Scan another site</Link>
      </header>
      <main className="public-replay" style={{ maxWidth: 860 }}>
        <ScanResult scan={s} />
      </main>
      <LandingFooter />
    </>
  );
}
