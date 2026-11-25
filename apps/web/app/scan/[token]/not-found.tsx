import Link from "next/link";

export default function ScanNotFound() {
  return (
    <main className="state-page">
      <div className="kicker">Scan not found</div>
      <h1>This scan report doesn’t exist</h1>
      <p>The link may be mistyped, or the report expired (free scans are kept for 30 days). It only takes a minute to run a new one.</p>
      <p className="state-actions"><Link className="btn primary" href="/">Scan a site free</Link></p>
    </main>
  );
}
