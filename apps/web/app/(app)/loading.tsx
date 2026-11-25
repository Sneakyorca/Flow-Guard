// Inside the workspace the sidebar stays put; only the page area shows this placeholder
// while the server loads flows and runs from Supabase.
export default function AppLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading">
      <div className="loading-bar" aria-hidden="true" style={{ marginBottom: 24 }}><i /></div>
      <div className="skel" style={{ width: 180, height: 26, marginBottom: 10 }} />
      <div className="skel" style={{ width: 320, height: 14, marginBottom: 28 }} />
      <div className="skel-grid">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="skel" style={{ height: 78 }} />)}
      </div>
      <div className="panel" style={{ marginTop: 24, padding: 16 }}>
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="skel" style={{ height: 40, marginBottom: i < 3 ? 12 : 0 }} />)}
      </div>
      <span className="sr-only">Loading your workspace…</span>
    </div>
  );
}
