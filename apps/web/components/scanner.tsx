"use client";
import Link from "next/link";
import { useState } from "react";
import { DEMO_REPLAY_ID } from "@/lib/demo-data";
import { Button, Icon } from "./ui";
import { ReplayPlayer } from "./replay-player";

const REPLAY = `/replay/${DEMO_REPLAY_ID}`;

/**
 * Public "Instant Free Scan" landing. In this milestone the form is a demo; real scans run with
 * `npm run scan -- --url <site>` (apps/worker) and will be queued into `public_scans`.
 */
export function Scanner() {
  const [scanUrl, setScanUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  let host = "";
  try { host = new URL(scanUrl).hostname; } catch {}

  return (
    <div className="scanner">
      <div className="scanner-top">
        <span className="pill"><Icon name="bolt" size={14} /> FREE INSTANT SITE SCANNER</span>
        <span className="muted">No scripts. No credit card. No surprises.</span>
      </div>
      <h1>Catch broken checkouts<br />and dead flows <span>before<br />your customers do.</span></h1>
      <p className="scanner-sub">Paste any URL. Our AI browser tests your signup, cart, and key links—and sends you a video replay when anything breaks.</p>
      <form
        className="scan-form"
        onSubmit={(e) => {
          e.preventDefault();
          setScanning(true);
          setScanned(false);
          window.setTimeout(() => { setScanning(false); setScanned(true); }, 1800);
        }}
      >
        <Icon name="globe" size={21} />
        <input required aria-label="Website URL to scan" type="url" value={scanUrl} onChange={(e) => setScanUrl(e.target.value)} placeholder="https://yourwebsite.com" />
        <Button primary type="submit" disabled={scanning}>{scanning ? "Scanning demo…" : "Scan Site Free"}<Icon name="arrow" size={17} /></Button>
      </form>
      <p className="scan-disclaimer">Interactive demo · No live website is accessed or email sent.</p>
      {scanned && (
        <div className="scan-result">
          <Icon name="check" />
          <div><b>Sample scan ready for {host}</b><p>Demo result: checkout issue detected. Explore the example diagnostics below.</p></div>
          <Link className="btn" href={REPLAY}>View sample replay <Icon name="arrow" size={15} /></Link>
        </div>
      )}
      <div className="scanner-benefits">
        {["Find the bugs that cost you revenue", "See exactly where users get stuck", "Share a replay. Skip the back-and-forth."].map((s) => (
          <span key={s}><Icon name="check" size={15} />{s}</span>
        ))}
      </div>
      <section className="scanner-preview">
        <div className="section-title">
          <h2><span className="dot failed" /> One broken button. A checkout that never happens.</h2>
          <Link href={REPLAY}>Explore diagnostics <Icon name="arrow" size={15} /></Link>
        </div>
        <ReplayPlayer />
      </section>
    </div>
  );
}
