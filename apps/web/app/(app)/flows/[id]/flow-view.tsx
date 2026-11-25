"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { demoDetail } from "@/lib/demo-data";
import type { FlowDetail } from "@/lib/flow-detail";
import { formatMs, formatRate, RANGES, totals, type RangeKey } from "@/lib/runs-data";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { ChartLegend, DayStrip, DurationChart, RunsChart } from "@/components/charts";
import { removeFlow, updateFlow, useFlows } from "@/components/flows-store";
import { useRunTracker } from "@/components/run-tracker";
import { useToast } from "@/components/toast";
import { Button, Icon, StepIcon } from "@/components/ui";

const RANGE_KEYS: RangeKey[] = ["24h", "7d", "30d"];
const START_LABEL: Record<RangeKey, string> = { "24h": "24 hours ago", "7d": "7 days ago", "30d": "30 days ago" };

function when(t: number): string {
  return new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function FlowView({ id, live }: { id: string; live: FlowDetail | null }) {
  const flows = useFlows();
  const demoFlow = live ? null : flows.find((f) => f.id === id);
  const d = useMemo(() => live ?? (demoFlow ? demoDetail(demoFlow) : null), [live, demoFlow]);
  if (!d) {
    return (
      <section className="panel empty-start">
        <h2>That flow isn’t in this workspace</h2>
        <p>It may have been deleted. <Link className="link" href="/monitors">Back to Monitors</Link></p>
      </section>
    );
  }
  return <FlowDetailView d={d} />;
}

function FlowDetailView({ d }: { d: FlowDetail }) {
  const router = useRouter();
  const notify = useToast();
  const tracker = useRunTracker();
  const [range, setRange] = useState<RangeKey>("7d");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState<"" | "pause" | "delete">("");
  const [demoRunning, setDemoRunning] = useState(false);
  const [allRuns, setAllRuns] = useState(false);
  const isLive = d.source === "live";
  const running = isLive ? tracker.running(d.id) : demoRunning;
  const buckets = d.charts[range];
  const t = totals(buckets);
  const latest = d.runs[0];
  const paused = d.status === "paused";

  const run = () => {
    if (isLive) return tracker.start(d.id, d.name);
    setDemoRunning(true);
    window.setTimeout(() => { setDemoRunning(false); notify(`Sample run of “${d.name}” finished. In demo mode no site is visited.`); }, 1400);
  };

  async function togglePause() {
    const next = paused ? "active" : "paused";
    if (!isLive) {
      updateFlow(d.id, { schedule: next === "paused" ? "Paused" : "Every 1 hour" });
      return notify(next === "paused" ? "Paused in this sample workspace." : "Resumed in this sample workspace.");
    }
    setBusy("pause");
    const { error } = await getSupabaseBrowser()!.from("flows").update({ status: next }).eq("id", d.id);
    setBusy("");
    if (error) return notify(`Couldn’t update the flow: ${error.message}`, "bad");
    notify(next === "paused" ? `Paused. “${d.name}” won’t run on its schedule until you resume it.` : `Resumed. “${d.name}” runs at the next scheduled check.`);
    router.refresh();
  }

  async function remove() {
    if (!isLive) {
      removeFlow(d.id);
      notify(`Deleted “${d.name}” from this sample workspace.`);
      return router.push("/monitors");
    }
    setBusy("delete");
    const res = await fetch(`/api/flows/${d.id}`, { method: "DELETE" });
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    setBusy("");
    if (!res.ok) return notify(body.message ?? "Couldn’t delete the flow.", "bad");
    notify(body.message ?? `Deleted “${d.name}”.`);
    router.push("/monitors");
    router.refresh();
  }

  return (
    <>
      {!isLive && (
        <div className="notice" style={{ marginBottom: 20 }}>
          <Icon name="info" />
          <span>Sample flow. The runs and charts below are example data.</span>
        </div>
      )}
      <div className="page-head">
        <div>
          <Link className="back" href="/monitors"><Icon name="back" size={14} /> Monitors</Link>
          <h1>{d.name}</h1>
          <div className="facts">
            <span className="mono">{d.domain}</span>
            <span>{d.viewport === "mobile" ? "Phone, 390 × 844" : "Desktop, 1440 × 900"}</span>
            <span>{paused ? <b className="t-warn">Paused</b> : d.scheduleLabel}</span>
            <span>{d.steps.length} step{d.steps.length === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div className="flow-head-actions">
          <Button onClick={togglePause} disabled={busy !== ""}><Icon name={paused ? "play" : "pause"} size={14} />{paused ? "Resume" : "Pause"}</Button>
          <Link className="btn" href={`/flows/${d.id}/edit`}><Icon name="file" size={14} /> Edit steps</Link>
          <Button variant="primary" onClick={run} disabled={running}>
            <Icon name={running ? "refresh" : "play"} size={14} className={running ? "spin" : undefined} />{running ? "Running…" : "Run now"}
          </Button>
        </div>
      </div>

      {latest && latest.status === "FAILED" && !running && (
        <div className="alert-row" role="alert">
          <Icon name="x-circle" size={20} />
          <div>
            <b>The last run failed{latest.failedStep !== null ? ` at step ${latest.failedStep + 1}` : ""}</b>
            <p>{latest.summary} · {when(latest.startedAt)}</p>
          </div>
          {latest.token && <Link className="btn" href={`/replay/${latest.token}`}>Watch the replay <Icon name="arrow" /></Link>}
        </div>
      )}
      {running && (
        <div className="notice" style={{ marginBottom: 16 }} role="status">
          <Icon name="refresh" />
          <span>Running on GitHub Actions. This page checks every 15 seconds and updates when the result lands (usually 2–3 minutes).</span>
        </div>
      )}

      <section className="panel health" aria-labelledby="fh">
        <div className="panel-head">
          <h2 id="fh">History, {RANGES[range].long}</h2>
          <div className="seg" role="group" aria-label="Time range">
            {RANGE_KEYS.map((k) => <button key={k} aria-pressed={range === k} onClick={() => setRange(k)}>{RANGES[k].label}</button>)}
          </div>
        </div>
        <div className="health-grid">
          <div>
            <div className="stat">
              <span className="stat-label">Runs passed</span>
              <span className="stat-value num">{formatRate(t.rate)}</span>
              <span className="stat-sub num">{t.runs ? `${t.passed} of ${t.runs}${t.fail ? ` · ${t.fail} failed` : ""}${t.flaky ? ` · ${t.flaky} flaky` : ""}` : "no runs yet"}</span>
            </div>
            <RunsChart buckets={buckets} size={RANGES[range].size} label={`${d.name}: runs, ${RANGES[range].long}`} startLabel={START_LABEL[range]} />
            <ChartLegend />
          </div>
          <div>
            <div className="stat">
              <span className="stat-label">Median run time</span>
              <span className="stat-value num">{formatMs(t.medianMs)}</span>
              <span className="stat-sub">{latest?.durationMs ? `last run ${formatMs(latest.durationMs)}` : ""}</span>
            </div>
            <DurationChart buckets={buckets} size={RANGES[range].size} label={`${d.name}: median run time, ${RANGES[range].long}`} startLabel={START_LABEL[range]} />
          </div>
        </div>
        <div className="health-foot" style={{ alignItems: "center" }}>
          <span>Each day, last 30 days</span>
          <div style={{ flex: "1 1 240px", maxWidth: 360 }}><DayStrip buckets={d.days} label={d.name} /></div>
        </div>
      </section>

      <div className="two-col" style={{ marginTop: 0, alignItems: "start" }}>
        <section className="panel" aria-labelledby="runs-h">
          <div className="panel-head"><h2 id="runs-h">Runs</h2><span className="meta num">{d.runCount > d.runs.length ? `newest ${d.runs.length} of ${d.runCount}` : `${d.runs.length} in 30 days`}</span></div>
          {d.runs.length === 0 ? (
            <p className="muted" style={{ padding: 16, fontSize: 13 }}>{paused ? "Paused, so nothing runs on a schedule. Run now still works." : "No runs yet. Press Run now, or wait for the next hourly check."}</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="runs-table">
                <thead><tr><th scope="col">When</th><th scope="col">Result</th><th scope="col" style={{ textAlign: "right" }}>Time</th></tr></thead>
                <tbody>
                  {(allRuns ? d.runs : d.runs.slice(0, 12)).map((r) => (
                    <tr key={r.id}>
                      <td className="num" style={{ whiteSpace: "nowrap" }} suppressHydrationWarning>{when(r.startedAt)}</td>
                      <td>
                        <span style={{ display: "inline-flex", gap: 6, alignItems: "flex-start" }}>
                          <StepIcon status={r.status === "FAILED" ? "failed" : r.flaky ? "warning" : "passed"} />
                          {r.token
                            ? <Link className="link" href={`/replay/${r.token}`}>{r.summary}</Link>
                            : <span>{r.summary}</span>}
                        </span>
                      </td>
                      <td className="num muted" style={{ textAlign: "right" }}>{formatMs(r.durationMs)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!allRuns && d.runs.length > 12 && (
                <div className="table-foot"><span className="num">Showing 12 of {d.runs.length}</span><button className="link" onClick={() => setAllRuns(true)}>Show {d.runs.length}</button></div>
              )}
            </div>
          )}
        </section>

        <div style={{ display: "grid", gap: 16 }}>
          <section className="panel" aria-labelledby="steps-h">
            <div className="panel-head"><h2 id="steps-h">Steps</h2><Link className="link" style={{ fontSize: 13 }} href={`/flows/${d.id}/edit`}>Edit</Link></div>
            <p className="muted" style={{ padding: "10px 16px 0", fontSize: 12.5 }}>Starts at <span className="mono">{d.startUrl}</span></p>
            <ol className="step-list">{d.steps.map((s, i) => <li key={i}><span>{s}</span></li>)}</ol>
          </section>

          <section className="panel danger" aria-labelledby="del-h">
            <div className="panel-head"><h2 id="del-h">Delete this flow</h2></div>
            {!confirming ? (
              <div className="confirm">
                <p className="muted" style={{ fontSize: 13 }}>Removes the flow, all its runs, and their recordings and screenshots. Public replay links stop working.</p>
                <div><Button onClick={() => setConfirming(true)}><span className="t-bad">Delete flow…</span></Button></div>
              </div>
            ) : (
              <div className="confirm" role="alertdialog" aria-labelledby="del-q">
                <p id="del-q" style={{ fontSize: 13 }}><b>Delete “{d.name}” and {d.runCount} run{d.runCount === 1 ? "" : "s"}?</b> This can’t be undone.</p>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn danger-solid" onClick={remove} disabled={busy === "delete"}>{busy === "delete" ? "Deleting…" : "Yes, delete it"}</button>
                  <Button onClick={() => setConfirming(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
