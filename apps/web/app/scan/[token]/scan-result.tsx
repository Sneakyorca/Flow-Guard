"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PublicScan } from "@/lib/scan-report";
import { Icon, StepIcon } from "@/components/ui";
import { useToast } from "@/components/toast";

const POLL_MS = 4_000;
const SLOW_MS = 3 * 60_000;   // say "taking longer than usual" after this
const GIVE_UP_MS = 8 * 60_000; // stop polling (the GitHub job times out at 6 minutes)
const TYPICAL_S = 100;         // queue + browser start + crawl, end to end

const STAGES = [
  { label: "Scan queued", detail: "Your request is in line." },
  { label: "Starting a browser", detail: "A fresh Chrome on a phone-sized screen (390 × 844)." },
  { label: "Opening your pages", detail: "Following links from your homepage, up to 15 pages." },
  { label: "Checking links, layout and errors", detail: "Every link is tested; each page is checked for sideways scrolling and JavaScript errors." },
  { label: "Writing your report", detail: "Scoring the results and saving the homepage recording." },
];

/** Which stage we're probably in, from the scan's status and how long it has been. */
function stageFor(status: PublicScan["status"], elapsedS: number): number {
  if (status === "queued") return elapsedS < 15 ? 0 : 1;
  if (elapsedS < 55) return 2;
  if (elapsedS < 85) return 3;
  return 4;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function ScanResult({ scan, reused = false }: { scan: PublicScan; reused?: boolean }) {
  const router = useRouter();
  const notify = useToast();
  const pending = scan.status === "queued" || scan.status === "running";
  const [now, setNow] = useState<number | null>(null); // null until mounted: avoids a server/client clock mismatch
  const [alertMe, setAlertMe] = useState<"off" | "on" | "blocked" | "unsupported">("off");
  const wasPending = useRef(pending);

  const started = Date.parse(scan.createdAt);
  const elapsedS = now === null ? 0 : Math.max(0, Math.round((now - started) / 1000));

  // Tick the clock and poll the server while the scan runs.
  useEffect(() => {
    if (!pending) return;
    setNow(Date.now());
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    const poll = window.setInterval(() => {
      if (Date.now() - started > GIVE_UP_MS) { window.clearInterval(poll); return; }
      router.refresh();
    }, POLL_MS);
    return () => { window.clearInterval(tick); window.clearInterval(poll); };
  }, [pending, started, router]);

  // Tab title shows progress, so people can switch tabs and still see it.
  useEffect(() => {
    if (pending) document.title = `Scanning ${scan.host}… · Oluso`;
    else if (scan.report) document.title = `${scan.host} scored ${scan.report.score}/100 · Oluso`;
  }, [pending, scan.host, scan.report]);

  // When the report lands while the page is open: pop-up message, and a browser notification if asked for.
  useEffect(() => {
    if (wasPending.current && !pending) {
      if (scan.status === "done" && scan.report) {
        notify(`Your scan of ${scan.host} is ready: ${scan.report.score}/100.`, "ok");
        if (alertMe === "on" && document.hidden && "Notification" in window) {
          new Notification("Your Oluso scan is ready", { body: `${scan.host} scored ${scan.report.score}/100`, icon: "/icon.svg" });
        }
      } else {
        notify(`We couldn’t finish scanning ${scan.host}.`, "bad");
      }
    }
    wasPending.current = pending;
  }, [pending, scan.status, scan.report, scan.host, notify, alertMe]);

  useEffect(() => {
    if (!("Notification" in window)) setAlertMe("unsupported");
    else if (Notification.permission === "denied") setAlertMe("blocked");
  }, []);

  async function askToNotify() {
    if (!("Notification" in window)) return setAlertMe("unsupported");
    const p = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    setAlertMe(p === "granted" ? "on" : "blocked");
    if (p === "granted") notify("We’ll let you know here when the report is ready, even if you switch tabs.", "info");
  }

  if (pending) {
    const slow = now !== null && now - started > SLOW_MS;
    const stuck = now !== null && now - started > GIVE_UP_MS;
    const current = stageFor(scan.status, elapsedS);
    const pct = now === null ? 4 : Math.min(95, Math.max(4, Math.round((elapsedS / TYPICAL_S) * 100)));
    return (
      <section className="panel scan-wait" aria-labelledby="wait-h">
        <div className="scan-wait-head">
          <div>
            <h1 id="wait-h">{stuck ? "This is taking much longer than usual" : slow ? "Still working…" : <>Scanning <span className="mono">{scan.host}</span></>}</h1>
            <p>{stuck
              ? "The scanner may be stuck. Come back to this link later, or try the scan again in a few minutes."
              : slow
                ? "The scanner is busier than usual. Keep this page open; the report appears here as soon as it’s ready."
                : "Usually done in about a minute and a half. You can leave this page open in a background tab."}</p>
          </div>
          <span className="scan-clock num" aria-label={`${elapsedS} seconds so far`} suppressHydrationWarning>{mmss(elapsedS)}</span>
        </div>

        <div className="scan-bar" role="progressbar" aria-label="Scan progress (estimated)" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <i style={{ width: `${pct}%` }} />
        </div>

        <ol className="scan-stages" aria-live="polite">
          {STAGES.map((s, i) => {
            const state = i < current ? "done" : i === current ? "now" : "next";
            return (
              <li key={s.label} className={state} aria-current={state === "now" ? "step" : undefined}>
                <span className="dot" aria-hidden="true">
                  {state === "done" ? <Icon name="check" size={12} /> : state === "now" ? <Icon name="refresh" size={12} className="spin" /> : null}
                </span>
                <div>
                  <b>{s.label}</b>
                  {state === "now" && <p>{s.detail}</p>}
                </div>
              </li>
            );
          })}
        </ol>

        <div className="scan-wait-foot">
          <span className="muted"><Icon name="refresh" size={13} className="spin" /> This page updates by itself.</span>
          {alertMe === "off" && <button className="btn sm" onClick={askToNotify}><Icon name="bell" size={14} /> Tell me when it’s ready</button>}
          {alertMe === "on" && <span className="muted"><Icon name="bell" size={13} /> We’ll notify you.</span>}
          {alertMe === "blocked" && <span className="muted">Notifications are blocked in this browser; keep this tab open.</span>}
        </div>
      </section>
    );
  }

  if (scan.status === "error" || !scan.report) {
    return (
      <section className="why" aria-label="Scan failed" role="alert">
        <Icon name="x-circle" size={20} />
        <div>
          <h2>We couldn’t scan {scan.host}</h2>
          <p>{scan.error || "The site didn’t load in our browser, or the scanner hit a problem."}</p>
          <p className="fix">Check the address opens in your own browser, then <Link className="link" href="/">try the scan again</Link>.</p>
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
      {reused && (
        <div className="notice" style={{ marginTop: 8 }}>
          <Icon name="info" />
          <span>This site was scanned in the last 10 minutes, so here’s that report instead of running the same scan twice.</span>
        </div>
      )}
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
