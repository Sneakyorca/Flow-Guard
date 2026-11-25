import Link from "next/link";

export default function ReplayNotFound() {
  return (
    <main className="state-page">
      <div className="kicker">Replay not found</div>
      <h1>This replay link doesn’t work</h1>
      <p>It may have been mistyped, its owner made replays private, or the run was deleted when its history expired. Ask whoever sent it for a fresh link.</p>
      <p className="state-actions"><Link className="btn primary" href="/">Go to Oluso</Link></p>
    </main>
  );
}
