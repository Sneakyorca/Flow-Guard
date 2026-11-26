import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { PublicHeader } from "@/components/public-header";
import { LandingFooter } from "@/components/scanner";
import { ToastProvider } from "@/components/toast";
import { getPublicScan } from "@/lib/scan-report";
import { ScanResult } from "./scan-result";

const scan = cache(getPublicScan);

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const s = await scan((await params).token);
  if (!s) return { title: "Scan not found", robots: { index: false } };
  const title = s.status === "done" ? `${s.host} scored ${s.score}/100` : `Scanning ${s.host}`;
  return { title, description: `Free Oluso scan of ${s.host}: broken links, phone layout and JavaScript errors.`, robots: { index: false, follow: false } };
}

export const dynamic = "force-dynamic";

/** Public report for one free scan. Refreshes itself until the scan finishes. */
export default async function ScanReportPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ reused?: string }> }) {
  const s = await scan((await params).token);
  if (!s) notFound();
  const reused = (await searchParams).reused === "1";
  return (
    <ToastProvider>
      <PublicHeader extra={{ href: "/", label: "Scan another site" }} />
      <main className="public-replay" style={{ maxWidth: 860 }}>
        <ScanResult scan={s} reused={reused} />
      </main>
      <LandingFooter />
    </ToastProvider>
  );
}
