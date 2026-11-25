"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { PublicScan } from "@/lib/scan-report";
import { Icon, StepIcon } from "@/components/ui";

const POLL_MS = 5_000;
const GIVE_UP_MS = 5 * 60_000;

export function ScanResult({ scan }: { scan: PublicScan }) {
  const router = useRouter();
  const pending = scan.status === "queued" || scan.status === "running";
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!pending) return;
    const started = Date.parse(scan.createdAt);
    const id = window.setInterval(() => {
      if (Date.now() - started > GIVE_UP_MS) { setGaveUp(true); window.clearInterval(id); return; }
      router.refresh();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [pending, scan.createdAt, router]);

  if (pending) {
    return (
      <section className="panel empty-start" aria-live="polite" style={{ maxWidth: "none" }}>
        <h1 style={{ fontSize: 24, fontWeight: 650 }}>{gaveUp ? "This is taking longer than usual" : `Scanning ${scan.host}…`}</h1>
        <p>{gaveUp
          ? "The scanner may be busy. Leave this page open or come back to this link later; the report appears here when it’s done."
          : scan.status === "queued"
            ? "Starting a browser for you. This usually takes 30–60 seconds, then the scan itself takes up to a minute."
            : "Opening up to 15 pages on a phone-sized screen, checking links and recording JavaScript errors. Up to a minute."}</p>
        {!gaveUp && <p className="muted" style={{ fontSize: 13 }}><Icon name="refresh" className="spin" size={14} /> This page updates by itself.</p>}
      </section>
    );
  }

  if (scan.status === "error" || !scan.report) {
    return (
      <section className="why" aria-label="Scan failed">
        <Icon name="x-circle" size={20} />
        <div>
          <h2>We couldn’t scan {scan.host}</h2>
          <p>{scan.error}</p>
          <p className="fix"><Link className="link" href="/">Try another address</Link></p>
        </div>
      </section>
    );
  }

  const r = scan.report;
  const rows: Array<{ label: string; ok: boolean; text: string; items: string[] }> = [
    {
      label: "Broken links",
      ok: r.broken_links.length === 0,
      text: r.broken_links.length ? `${r.broken_links.length} of ${r.links_checked} links checked are broken.` : `None of the ${r.links_checked} links checked returned an error.`,
      items: r.broken_links.slice(0, 8).map((b) => `${b.status ?? "No answer"} · ${b.url} (on ${b.found_on})`),
    },
    {
      label: "Phone layout",
      ok: r.mobile_overflow.length === 0,
      text: r.mobile_overflow.length ? `${r.mobile_overflow.length} page${r.mobile_overflow.length === 1 ? "" : "s"} scroll sideways on a 390px-wide phone.` : "No page scrolls sideways at 390px wide.",
      items: r.mobile_overflow.slice(0, 5).map((o) => `${o.page}: ${o.scroll_width}px wide${o.offenders.length ? ` (${o.offenders.slice(0, 3).join(", ")})` : ""}`),
    },
    {
      label: "JavaScript",
      ok: r.console_errors.length === 0,
      text: r.console_errors.length ? `${r.console_errors.length} different error${r.console_errors.length === 1 ? "" : "s"}. A JavaScript error is the usual reason a button silently does nothing.` : "No uncaught errors on the pages we opened.",
      items: r.console_errors.slice(0, 5).map((c) => `${c.count > 1 ? `On ${c.count} pages` : `On ${c.page}`}: ${c.text.slice(0, 180)}`),
    },
  ];

  return (
    <>
      <div className="page-head" style={{ marginTop: 8 }}>
        <div>
          <h1>{scan.host}</h1>
          <p className="num">{r.pages_scanned.length} pages and {r.links_checked} links in {Math.round(r.duration_ms / 1000)} seconds · <span suppressHydrationWarning>{new Date(r.started_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></p>
        </div>
        <div className="report-score"><strong>{r.score}</strong><span className="muted">/ 100</span></div>
      </div>
      <section className="panel report" aria-label="Results">
        <table>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td><span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><StepIcon status={row.ok ? "passed" : "failed"} />{row.label}</span></td>
                <td>
                  {row.text}
                  {row.items.length > 0 && <ul className="scan-items">{row.items.map((i) => <li key={i} className="mono">{i}</li>)}</ul>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {scan.videoUrl && (
        <section className="panel player" style={{ marginTop: 16 }} aria-label="Homepage recording">
          <div className="player-bar"><span>Your homepage on a phone</span><span>390 × 844</span></div>
          <video className="video" src={scan.videoUrl} controls playsInline preload="metadata" />
        </section>
      )}
      <section className="cta-band">
        <div>
          <h2>A scan checks pages. Oluso checks the journey.</h2>
          <p>Describe your checkout or signup in plain sentences and we’ll click through it every hour, with a video when it breaks.</p>
        </div>
        <Link className="btn accent lg" href="/signup">Monitor your checkout free</Link>
      </section>
    </>
  );
}
