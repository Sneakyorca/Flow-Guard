// Shown while any public page (landing, replay, scan, legal) loads on the server.
export default function Loading() {
  return (
    <div className="state-page" role="status" aria-live="polite">
      <div className="loading-bar" aria-hidden="true"><i /></div>
      <p className="muted">Loading…</p>
    </div>
  );
}
