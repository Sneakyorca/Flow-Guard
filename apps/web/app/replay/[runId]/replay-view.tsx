"use client";
import Link from "next/link";
import { Fragment, useState } from "react";
import type { ReplayData } from "@/lib/demo-data";
import { Button, Icon, StatusLabel, StepIcon } from "@/components/ui";
import { useToast } from "@/components/toast";
import { ReplayPlayer } from "@/components/replay-player";
import { useRunTracker } from "@/components/run-tracker";

/**
 * owner: signed-in owner of the run (inside the app shell, real "Run again").
 * public: anyone else with the link (minimal frame, no workspace actions).
 * demo: the sample incident.
 */
export function ReplayView({ data, shareId, mode, flowId }: { data: ReplayData; shareId: string; mode: "owner" | "public" | "demo"; flowId?: string }) {
  const notify = useToast();
  const tracker = useRunTracker();
  const [tab, setTab] = useState<"console" | "network" | "dom">("console");
  const [rerunning, setRerunning] = useState(false);
  const passed = data.steps.filter((s) => s.status === "passed").length;
  const failed = data.status === "FAILED";

  const copy = async () => {
    const link = `${window.location.origin}/replay/${shareId}`;
    try {
      await navigator.clipboard.writeText(link);
      notify(data.source === "demo" ? "Link copied. It opens this sample replay." : "Link copied. Anyone with it can watch this run, nothing else.");
    } catch {
      notify(`Couldn’t reach the clipboard. The link is ${link}`);
    }
  };
  const rerun = () => {
    if (mode === "owner" && flowId) {
      void tracker.start(flowId, data.flowName);
      return;
    }
    setRerunning(true);
    window.setTimeout(() => { setRerunning(false); notify("Sample re-run finished. In demo mode no site is visited."); }, 1400);
  };

  const tabs = [
    ["console", "Console", data.consoleErrors.length],
    ["network", "Network", data.networkErrors.length],
    ["dom", "Page HTML", 0],
  ] as const;

  return (
    <>
      <div className="page-head">
        <div>
          {mode === "owner" && flowId && <Link className="back" href={`/flows/${flowId}`}><Icon name="back" size={14} /> {data.flowName}</Link>}
          {mode === "demo" && <Link className="back" href="/monitors"><Icon name="back" size={14} /> Monitors</Link>}
          <h1>{data.flowName}</h1>
          <p className="mono" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <StatusLabel status={failed ? "failed" : "passing"} />
            <span>{data.domain}</span><span>{data.runLabel.toLowerCase()}</span><span>{data.detectedAt}</span>
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {mode !== "public" && (() => {
            const busy = rerunning || (mode === "owner" && !!flowId && tracker.running(flowId));
            return <Button onClick={rerun} disabled={busy}><Icon name="refresh" size={14} className={busy ? "spin" : undefined} />{busy ? "Running…" : "Run again"}</Button>;
          })()}
          <Button variant="primary" onClick={copy}><Icon name="link" size={14} /> Copy share link</Button>
        </div>
      </div>

      <section className={`why ${failed ? "" : "ok"}`} aria-label="Summary">
        <Icon name={failed ? "x-circle" : "check-circle"} size={20} />
        <div>
          <h2>{data.summaryTitle}</h2>
          <p>{data.summaryBody}</p>
          {data.suggestion && <p className="fix"><b>What to check:</b> {data.suggestion}</p>}
          {data.evidence.length > 0 && <ul>{data.evidence.map((e) => <li key={e}>{e}</li>)}</ul>}
        </div>
      </section>

      <div className="replay-grid">
        <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
          {data.source === "demo" || data.videoUrl ? (
            <ReplayPlayer videoUrl={data.videoUrl} />
          ) : (
            // A real run without a stored video: say so rather than showing the sample checkout.
            <section className="panel player" aria-label="Recording">
              <div className="player-bar"><span>Recording</span></div>
              <p className="muted" style={{ padding: "40px 20px", textAlign: "center", fontSize: 14 }}>
                No video was saved for this run. The steps and logs below are from the real run.
              </p>
            </section>
          )}
          <section className="panel" aria-labelledby="steps-h">
            <div className="panel-head"><h2 id="steps-h">Steps</h2><span className="meta num">{passed} of {data.steps.length} passed</span></div>
            <ol className="steplog">
              {data.steps.map((s, i) => (
                <li key={i} className={s.status}>
                  <StepIcon status={s.status} />
                  <div>
                    <span className="faint num">{i + 1}.</span> {s.instruction}
                    {s.error && <div className="err">{s.error}</div>}
                  </div>
                  <span className="dur">{s.status === "skipped" ? "skipped" : s.duration}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className="panel" aria-label="Diagnostics">
          <div className="tabs" role="tablist">
            {tabs.map(([id, title, n]) => (
              <button role="tab" key={id} id={`tab-${id}`} aria-controls="tabpanel" aria-selected={tab === id} onClick={() => setTab(id)}>
                {title}{n > 0 && <span className="n">{n}</span>}
              </button>
            ))}
          </div>
          <div className="tab-body" role="tabpanel" id="tabpanel" aria-labelledby={`tab-${tab}`}>
            {tab === "console" && (
              data.consoleErrors.length === 0 ? <p className="muted">No console errors during this run.</p> :
              data.consoleErrors.map((c, i) => (
                <div className="err-block" key={i}>
                  <header><b>{c.title}</b><span className="mono faint">at {c.at}</span></header>
                  <pre>{c.message}{c.stack ? `\n\n${c.stack}` : ""}</pre>
                </div>
              ))
            )}
            {tab === "network" && (
              data.networkErrors.length === 0 ? <p className="muted">No failed requests (4xx/5xx) during this run.</p> :
              data.networkErrors.map((n, i) => (
                <div className="err-block" key={i}>
                  <header><span className="mono">{n.method} {n.path}</span><b className="num">{n.status ?? "failed"}</b></header>
                  <pre>{n.statusText} · at {n.at}{n.details ? `\n\n${n.details}` : ""}</pre>
                </div>
              ))
            )}
            {tab === "dom" && <div className="err-block"><header><span>Page HTML at the failing step</span></header><pre>{data.domSnapshot}</pre></div>}
          </div>
          <dl className="kv">
            {data.environment.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}
          </dl>
        </section>
      </div>
    </>
  );
}
