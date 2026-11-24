"use client";
import Link from "next/link";
import { useState } from "react";
import type { ReplayData } from "@/lib/demo-data";
import { Badge, Button, Icon } from "@/components/ui";
import { useToast } from "@/components/toast";
import { ReplayPlayer } from "@/components/replay-player";

export function ReplayView({ data, shareId }: { data: ReplayData; shareId: string }) {
  const notify = useToast();
  const [inspector, setInspector] = useState("console");
  const [rerunning, setRerunning] = useState(false);
  const passed = data.steps.filter((s) => s.status === "passed").length;
  const failed = data.status === "FAILED";

  const copy = async () => {
    const link = `${window.location.origin}/replay/${shareId}`;
    try {
      await navigator.clipboard.writeText(link);
      notify(data.source === "demo" ? "Demo replay link copied. This link opens the sample replay." : "Public replay link copied.");
    } catch {
      notify(`Clipboard unavailable. Share ${link}`);
    }
  };
  const rerun = () => {
    setRerunning(true);
    window.setTimeout(() => { setRerunning(false); notify("Demo run complete. Sample result refreshed."); }, 1400);
  };

  return (
    <>
      <div className="page-heading replay-heading">
        <div>
          <Link className="back-link" href="/monitors">← Back to monitors</Link>
          <div className="flex items-center gap-3"><Badge status={failed ? "failed" : "passing"} /><span className="mono muted">{data.runLabel}</span></div>
          <h1>{data.flowName}</h1>
          <p className="mono">{data.domain} · {data.detectedAt}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={rerun}><Icon name="refresh" size={16} />{rerunning ? "Re-running…" : "Re-run Flow"}</Button>
          <Button primary onClick={copy}><Icon name="link" size={16} /> Copy Public Share Link</Button>
        </div>
      </div>

      <div className="failure-summary">
        <span className="incident-icon">{failed ? "!" : "✓"}</span>
        <div><b>{data.summaryTitle}</b><p>{data.summaryBody}</p></div>
        {failed && <span className="pill">CRITICAL</span>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_1fr] gap-5">
        <div className="min-w-0">
          <ReplayPlayer videoUrl={data.videoUrl} />
          <section className="execution-log">
            <div className="section-title"><h2>Execution log</h2><span className="mono">{passed} / {data.steps.length} PASSED</span></div>
            {data.steps.map((s, i) => (
              <div key={i} className={`log-step ${s.status === "failed" ? "error-step" : ""}`}>
                <span className={`activity-symbol ${s.status === "failed" ? "failed" : s.status === "skipped" ? "warning" : "passing"}`}>{s.status === "failed" ? "!" : s.status === "skipped" ? "–" : "✓"}</span>
                <div>
                  <b><span className="muted">{i + 1}. </span>{s.instruction}</b>
                  {s.error && <p className="mono">{s.error}</p>}
                </div>
                <span className="mono muted">{s.duration}</span>
              </div>
            ))}
          </section>
        </div>

        <section className="inspector">
          <div className="section-title"><h2><Icon name="code" /> Technical inspector</h2><span className={`dot ${failed ? "failed" : ""}`} /></div>
          <div className="inspector-tabs" role="tablist">
            {([["console", "Console errors", data.consoleErrors.length], ["network", "Failed network", data.networkErrors.length], ["dom", "DOM snapshot", 0]] as const).map(([id, title, count]) => (
              <button role="tab" aria-selected={inspector === id} key={id} className={inspector === id ? "selected" : ""} onClick={() => setInspector(id)}>
                {title} {count > 0 && <span>{count}</span>}
              </button>
            ))}
          </div>
          <div className="inspector-body" role="tabpanel">
            {inspector === "console" ? (
              <>
                {data.consoleErrors.length === 0 && <p className="muted">No console errors were recorded during this run.</p>}
                {data.consoleErrors.map((c, i) => (
                  <div key={i} className={i ? "mt-5" : ""}>
                    <div className="inspector-label"><span className="text-red">⊗ UNCAUGHT EXCEPTION</span><span className="mono">{c.at}</span></div>
                    <div className="stack-trace"><b>{c.title}</b><p style={{ whiteSpace: "pre-line" }}>{c.message}</p>{c.stack && <pre>{c.stack}</pre>}</div>
                  </div>
                ))}
                {data.networkErrors.slice(0, 1).map((n, i) => (
                  <div key={`n${i}`}>
                    <div className="inspector-label mt-7"><span className="text-red">⊗ NETWORK ERROR</span><span className="mono">{n.at}</span></div>
                    <div className="network-error"><span className="mono">{n.method} <b>{n.path}</b></span>{n.status && <span className="badge failed">{n.status}</span>}<p>{n.statusText}</p></div>
                  </div>
                ))}
              </>
            ) : inspector === "network" ? (
              <>
                {data.networkErrors.length === 0 && <p className="muted">No failed requests (status ≥ 400) were recorded.</p>}
                {data.networkErrors.map((n, i) => (
                  <div key={i} className={i ? "mt-4" : ""}>
                    <div className="network-error"><span className="mono">{n.method} {n.path}</span><p className="text-red">{n.statusText}</p></div>
                    {n.details && <pre className="network-details">{n.details}</pre>}
                  </div>
                ))}
              </>
            ) : (
              <pre className="network-details">{data.domSnapshot}</pre>
            )}
            <div className="inspector-context">
              <h3>RUN ENVIRONMENT</h3>
              {data.environment.map(([a, b]) => <div key={a}><span>{a}</span><span className="mono">{b}</span></div>)}
            </div>
            <div className="info-box"><Icon name="bolt" /><p><b>Likely root cause</b><br />{data.rootCause}</p></div>
          </div>
        </section>
      </div>
    </>
  );
}
