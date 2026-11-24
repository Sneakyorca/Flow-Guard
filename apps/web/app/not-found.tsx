import Link from "next/link";

export default function NotFound() {
  return (
    <main className="main-content" style={{ textAlign: "center", paddingTop: 120 }}>
      <h1>Nothing here</h1>
      <p className="muted" style={{ marginTop: 12 }}>That replay link has expired or never existed.</p>
      <p style={{ marginTop: 24 }}><Link className="btn" href="/">Back to FlowGuard</Link></p>
    </main>
  );
}
