"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseConfigured } from "@/lib/supabase/env";
import { DEMO_REPLAY_ID, sampleScan } from "@/lib/demo-data";
import { Button, Icon } from "./ui";
import { ReplayPlayer } from "./replay-player";

const CHECKS = [
  ["Dead links", "Every link on up to 15 of your pages, checked for 404s and server errors."],
  ["Phone layout", "Each page opened 390px wide. We flag anything that makes it scroll sideways."],
  ["JavaScript errors", "Uncaught errors and blocked scripts, the usual reason a button silently does nothing."],
];

/**
 * Public free scan. With Supabase connected, the form posts to /api/scans, which queues the
 * scan on GitHub Actions and opens /scan/<token>. In demo mode it shows the sample report.
 */
export function Scanner({ inApp = false }: { inApp?: boolean }) {
  const router = useRouter();
  const [scanUrl, setScanUrl] = useState("");
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [message, setMessage] = useState("");

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    // People type "myshop.com" or paste "www.myshop.com": add https:// for them.
    const raw = scanUrl.trim();
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`;
    try {
      const u = new URL(url);
      if (!u.hostname.includes(".")) throw new Error("no dot");
    } catch {
      setMessage("That doesn’t look like a website address. Try something like myshop.com.");
      return;
    }
    if (url !== scanUrl) setScanUrl(url);
    if (!supabaseConfigured) {
      setState("running");
      window.setTimeout(() => setState("done"), 1600);
      return;
    }
    setState("running");
    const res = await fetch("/api/scans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }).catch(() => null);
    const body = (await res?.json().catch(() => ({}))) as { token?: string; message?: string; reused?: boolean } | undefined;
    if (res?.ok && body?.token) return router.push(`/scan/${body.token}${body.reused ? "?reused=1" : ""}`);
    setState("idle");
    setMessage(
      body?.message ??
        (res && res.status >= 500
          ? "Our scanner couldn’t start just now. Try again in a minute."
          : "Couldn’t reach Oluso. Check your connection and try again."),
    );
  }
  let host = "";
  try { host = new URL(/^https?:\/\//i.test(scanUrl) ? scanUrl : `https://${scanUrl}`).hostname; } catch {}

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
        <form className="scan-form" onSubmit={start}>
          <label className="sr-only" htmlFor="scan-url">Website address</label>
          <input id="scan-url" className="input" required type="text" inputMode="url" autoComplete="url" autoCapitalize="none" spellCheck={false} value={scanUrl} onChange={(e) => { setScanUrl(e.target.value); if (message) setMessage(""); }} placeholder="yourshop.com" disabled={state === "running"} aria-invalid={message ? true : undefined} aria-describedby={message ? "scan-msg" : undefined} />
          <Button variant={inApp ? "primary" : "accent"} size="lg" type="submit" disabled={state === "running"}>
            {state === "running" ? <><Icon name="refresh" size={16} className="spin" /> Starting your scan…</> : "Scan my site"}
          </Button>
        </form>
        {message && (
          <p id="scan-msg" className="form-alert" role="alert">
            <Icon name="alert-circle" size={16} />
            <span>{message}</span>
          </p>
        )}
        <p className="scan-small">
          {supabaseConfigured
            ? <>Free, no account. We open up to 15 public pages once, on a phone-sized screen. Only scan sites you’re happy for us to visit; see the <Link className="link" href="/terms">terms</Link>.</>
            : state === "done"
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
      <span>Oluso watches the pages that make you money: signup, login, checkout.</span>
      <nav aria-label="Legal" style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <Link className="link" href="/help">Help</Link>
        <Link className="link" href="/terms">Terms</Link>
        <Link className="link" href="/privacy">Privacy</Link>
      </nav>
    </footer>
  );
}
