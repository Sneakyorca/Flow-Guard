"use client";
import Link from "next/link";
import { useState } from "react";
import { DEMO_REPLAY_ID, sampleScan } from "@/lib/demo-data";
import { Button } from "./ui";
import { ReplayPlayer } from "./replay-player";

const CHECKS = [
  ["Dead links", "Every link on up to 15 of your pages, checked for 404s and server errors."],
  ["Phone layout", "Each page opened 390px wide. We flag anything that makes it scroll sideways."],
  ["JavaScript errors", "Uncaught errors and blocked scripts, the usual reason a button silently does nothing."],
];

/**
 * Public free scan. In this milestone the form doesn't run a scan from the website yet;
 * real scans run with `npm run scan -- --url <site>` and the example below is real output.
 */
export function Scanner({ inApp = false }: { inApp?: boolean }) {
  const [scanUrl, setScanUrl] = useState("");
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  let host = "";
  try { host = new URL(scanUrl).hostname; } catch {}

  return (
    <>
      <div className={inApp ? "" : "hero"} style={inApp ? { maxWidth: 760 } : undefined}>
        {inApp ? (
          <div className="page-head"><div><h1>Public scans</h1><p>The free one-minute check anyone can run from the homepage. Use it on a prospect’s site before you email them.</p></div></div>
        ) : (
          <>
            <div className="kicker">Free, no account needed</div>
            <h1>Is your checkout working right now?</h1>
            <p>Paste your shop’s address. In about a minute we open it in a phone-sized browser, follow up to 15 pages, and tell you what’s broken.</p>
          </>
        )}
        <form
          className="scan-form"
          onSubmit={(e) => {
            e.preventDefault();
            setState("running");
            window.setTimeout(() => setState("done"), 1600);
          }}
        >
          <label className="sr-only" htmlFor="scan-url">Website address</label>
          <input id="scan-url" className="input" required type="url" value={scanUrl} onChange={(e) => setScanUrl(e.target.value)} placeholder="https://yourshop.com" />
          <Button variant={inApp ? "primary" : "accent"} size="lg" type="submit" disabled={state === "running"}>
            {state === "running" ? "Scanning…" : "Scan my site"}
          </Button>
        </form>
        <p className="scan-small">
          {state === "done"
            ? <>Scans from this page aren’t switched on yet, so nothing was sent to {host || "your site"}. Below is a real report from another site.</>
            : <>Website scans aren’t live yet: this preview shows a real report from a test shop. Developers can run it today with <span className="mono">npm run scan</span>.</>}
        </p>
        {!inApp && (
          <div className="checks">
            {CHECKS.map(([t, d]) => <div key={t}><b>{t}</b><p>{d}</p></div>)}
          </div>
        )}
      </div>

      <div className={inApp ? "" : "section"} style={{ paddingTop: inApp ? 8 : undefined }}>
        <section className="panel report" aria-labelledby="report-h">
          <div className="panel-head">
            <div>
              <h2 id="report-h">Example report: <span className="mono">{new URL(sampleScan.url).host}</span></h2>
              <span className="meta num">{sampleScan.pages} pages and {sampleScan.links} links in {sampleScan.seconds} seconds</span>
            </div>
            <div className="report-score"><strong>{sampleScan.score}</strong><span className="muted">/ 100</span></div>
          </div>
          <table>
            <tbody>
              {sampleScan.rows.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
            </tbody>
          </table>
        </section>
      </div>

      <div className={inApp ? "" : "section"} style={{ marginTop: inApp ? 24 : 0 }}>
        <h2 style={{ fontSize: inApp ? 15 : undefined }}>When a flow breaks, you get the recording</h2>
        <p className="muted" style={{ marginTop: 6, marginBottom: 16 }}>
          Monitored flows go further than the scan: they click through checkout like a customer would. This is what a failure looks like.{" "}
          <Link className="link" href={`/replay/${DEMO_REPLAY_ID}`}>Open the full sample replay</Link>
        </p>
        <ReplayPlayer />
      </div>
    </>
  );
}

export function LandingFooter() {
  return (
    <footer className="section" style={{ borderTop: "1px solid var(--line)", marginTop: 48, fontSize: 13, color: "var(--muted)", display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <span>FlowGuard watches the pages that make you money: signup, login, checkout.</span>
      <span><a className="link" href="https://github.com/Sneakyorca/Flow-Guard">Source on GitHub</a></span>
    </footer>
  );
}
