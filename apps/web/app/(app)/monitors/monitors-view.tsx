"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { demoActivity, demoCharts, demoDays, DEMO_REPLAY_ID, type Status } from "@/lib/demo-data";
import { formatMs, formatRate, RANGES, totals, type RangeKey } from "@/lib/runs-data";
import { Button, Icon, StatusLabel, StepIcon } from "@/components/ui";
import { ChartLegend, DayStrip, DurationChart, RunsChart } from "@/components/charts";
import { useToast } from "@/components/toast";
import { touchFlow, useFlows } from "@/components/flows-store";
import { useLive } from "@/components/live-data";
import { useRunTracker } from "@/components/run-tracker";

const REPLAY = `/replay/${DEMO_REPLAY_ID}`;
const FILTERS: Array<[string, string]> = [["all", "All"], ["failed", "Failing"], ["warning", "Slow"], ["passing", "Passing"]];
const RANGE_KEYS: RangeKey[] = ["24h", "7d", "30d"];
const START_LABEL: Record<RangeKey, string> = { "24h": "24 hours ago", "7d": "7 days ago", "30d": "30 days ago" };

export function MonitorsView() {
  const router = useRouter();
  const notify = useToast();
  const flows = useFlows();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [demoRunning, setDemoRunning] = useState<string[]>([]);
  const [range, setRange] = useState<RangeKey>("24h");
  const [showAll, setShowAll] = useState(false);

  const live = useLive();
  const tracker = useRunTracker();
  const charts = useMemo(() => live?.charts ?? demoCharts(flows), [live, flows]);
  const isRunning = (id: string) => (live ? tracker.running(id) : demoRunning.includes(id));

  const run = async (id: string, name: string) => {
    // Real mode: start a GitHub Actions run and watch for its result (see run-tracker.tsx).
    if (live) return tracker.start(id, name);
    setDemoRunning((r) => [...r, id]);
    window.setTimeout(() => {
      setDemoRunning((r) => r.filter((n) => n !== id));
      touchFlow(id);
      notify(`Sample run of “${name}” finished. In demo mode no site is visited.`);
    }, 1400);
  };

  if (live && flows.length === 0) {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>Monitors</h1>
            <p>Nothing is being watched yet.</p>
          </div>
        </div>
        <section className="panel empty-start">
          <h2>Start with the journey that costs you most when it breaks</h2>
          <p>For a shop that’s usually checkout. For an app, signup. Write it the way you’d explain it to a new teammate, one action per step. Oluso opens the page every hour and works out which button or field you mean.</p>
          <Link className="btn primary" href="/flows/new"><Icon name="plus" /> Add your first flow</Link>
          <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>Not sure what’s broken? <Link className="link" href="/">Run the free scan</Link> on your site first.</p>
        </section>
      </>
    );
  }

  const count = (s: string) => (s === "all" ? flows.length : flows.filter((f) => f.status === s).length);
  const failed = count("failed");
  const warning = count("warning");
  const passing = count("passing");
  const domains = new Set(flows.map((f) => f.domain)).size;
  const matches = flows
    .filter((f) => (filter === "all" || f.status === filter) && `${f.name} ${f.domain}`.toLowerCase().includes(search.toLowerCase()))
    // Failing first, then slow, then the rest: the table is a to-do list.
    .sort((a, b) => ["failed", "warning", "passing"].indexOf(a.status) - ["failed", "warning", "passing"].indexOf(b.status));
  const limit = showAll || search || filter !== "all" ? matches.length : 6;
  const failingFlow = flows.find((f) => f.status === "failed");
  const buckets = charts[range];
  const t = totals(buckets);
  const activity = live
    ? live.activity
    : demoActivity.map((a) => ({ ...a, href: a.status === "failed" ? REPLAY : "" }));

  return (
    <>
      {!live && (
        <div className="notice" style={{ marginBottom: 20 }}>
          <Icon name="info" />
          <span>Sample workspace. Runs, uptime and replays below are example data; connect Supabase (see the <a className="link" href="https://github.com/Sneakyorca/Flow-Guard#readme">setup guide</a>) to see your own.</span>
        </div>
      )}

      <div className="page-head">
        <div>
          <h1>Monitors</h1>
          <p>{flows.length} {flows.length === 1 ? "journey" : "journeys"} on {domains} {domains === 1 ? "site" : "sites"}, each run in a real browser every hour.</p>
        </div>
        <Link className="btn primary" href="/flows/new"><Icon name="plus" /> New flow</Link>
      </div>

      <section className="panel health" aria-labelledby="health-h">
        <div className="panel-head">
          <h2 id="health-h">All flows, {RANGES[range].long}</h2>
          <div className="seg" role="group" aria-label="Time range">
            {RANGE_KEYS.map((k) => <button key={k} aria-pressed={range === k} onClick={() => setRange(k)}>{RANGES[k].label}</button>)}
          </div>
        </div>
        <div className="health-grid">
          <div>
            <div className="stat">
              <span className="stat-label">Runs passed</span>
              <span className="stat-value num">{formatRate(t.rate)}</span>
              <span className="stat-sub num">{t.runs ? `${t.passed} of ${t.runs} runs${t.fail ? ` · ${t.fail} failed` : ""}${t.flaky ? ` · ${t.flaky} flaky` : ""}` : "no runs yet"}</span>
            </div>
            <RunsChart buckets={buckets} size={RANGES[range].size} label={`Runs per ${range === "30d" ? "day" : range === "7d" ? "6 hours" : "hour"}, ${RANGES[range].long}`} startLabel={START_LABEL[range]} />
            <ChartLegend />
          </div>
          <div>
            <div className="stat">
              <span className="stat-label">Median run time</span>
              <span className="stat-value num">{formatMs(t.medianMs)}</span>
              <span className="stat-sub">start page to last step, all flows</span>
            </div>
            <DurationChart buckets={buckets} size={RANGES[range].size} label={`Median run time, ${RANGES[range].long}`} startLabel={START_LABEL[range]} />
          </div>
        </div>
        <div className="health-foot">
          <span><b className={failed ? "t-bad" : ""}>{failed} failing</b> · {warning} {live ? "flaky" : "slow"} · {passing} passing{live ? "" : " · sample data"}</span>
          {live && <span>Updates every minute while this tab is open</span>}
        </div>
      </section>

      {failingFlow && (
        <div className="alert-row" role="alert">
          <Icon name="x-circle" size={20} />
          <div>
            <b>{failingFlow.name} is failing</b>
            <p>{live ? `${failingFlow.detail} On ${failingFlow.domain}, ${failingFlow.time}.` : `Step 4 (“Pay Now”) threw a JavaScript error on ${failingFlow.domain}, ${failingFlow.time}. Customers can’t pay.`}</p>
          </div>
          <Link className="btn" href={failingFlow.replayToken ? `/replay/${failingFlow.replayToken}` : REPLAY}>Watch the replay <Icon name="arrow" /></Link>
        </div>
      )}

      <section className="panel" aria-label="Flows">
        <div className="toolbar">
          <div className="seg" role="group" aria-label="Filter by status">
            {FILTERS.map(([id, label]) => (
              <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}<span>{count(id)}</span></button>
            ))}
          </div>
          <label className="search">
            <Icon name="search" />
            <input aria-label="Search flows" placeholder="Search by name or site" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>
        <table className="flows">
          <thead>
            <tr>
              <th scope="col">Flow</th>
              <th scope="col" className="col-uptime">Last 30 days</th>
              <th scope="col" className="col-last">Last run</th>
              <th scope="col"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {matches.slice(0, limit).map((f) => {
              const days = f.days ?? demoDays(f);
              const ran = days.reduce((n, b) => n + b.pass + b.fail + b.flaky, 0);
              const ok = days.reduce((n, b) => n + b.pass + b.flaky, 0);
              const busy = isRunning(f.id);
              return (
                <tr key={f.id} className={f.status === "failed" ? "is-failed" : ""}>
                  <td>
                    <Link className="flow-name" href={`/flows/${f.id}`}>{f.name}</Link>
                    <div className="flow-sub"><span className="mobile-only"><StatusLabel status={f.status} text={f.statusText} /> · </span><span className="mono">{f.domain}</span> · {f.schedule.toLowerCase()}</div>
                  </td>
                  <td className="col-uptime">
                    <div className="uptime-pct"><span className="num">{ran ? formatRate(ok / ran) : "–"}</span><span className="num">{ran ? `${ran} runs` : ""}</span></div>
                    <DayStrip buckets={days} label={f.name} />
                  </td>
                  <td className="col-last">
                    {busy ? <span className="status pending"><span className="d pulse" aria-hidden="true" />Running…</span> : <StatusLabel status={f.status} text={f.statusText} />}
                    <div className="flow-sub num">
                      {busy ? "on GitHub Actions, usually 2–3 min" : f.lastRunLabel ?? (f.status === "passing" ? `${f.time}, ${f.duration.toFixed(1)}s` : f.status === "failed" ? `${f.time}, at step 4` : `${f.time}, API took 4.9s`)}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <Button size="sm" disabled={busy} onClick={() => run(f.id, f.name)} label={`Run ${f.name} now`}>
                      <Icon name={busy ? "refresh" : "play"} size={14} className={busy ? "spin" : undefined} />{busy ? "Running…" : "Run"}
                    </Button>
                  </td>
                </tr>
              );
            })}
            {matches.length === 0 && (
              <tr><td colSpan={4} className="muted" style={{ padding: 24 }}>No flows match “{search}”. Try a site name like <span className="mono">shopkemi.com</span>.</td></tr>
            )}
          </tbody>
        </table>
        <div className="table-foot">
          <span className="num">Showing {Math.min(matches.length, limit)} of {matches.length}</span>
          {limit < matches.length && <button className="link" onClick={() => setShowAll(true)}>Show all {matches.length} flows</button>}
        </div>
      </section>

      <div className="two-col">
        <section className="panel" aria-label="Recent runs">
          <div className="panel-head"><h2>Recent runs</h2><span className="meta">updates every run</span></div>
          <ul className="log">
            {activity.length === 0 && <li><time /><Icon name="clock" className="faint" /><span><b>No runs yet</b><span>The first results show up after the next hourly run, or press Run on a flow.</span></span></li>}
            {activity.map((a, i) => (
              <li key={`${a.title}-${i}`}>
                <time>{a.time}</time>
                <StepIcon status={a.status === "passing" ? "passed" : a.status === "failed" ? "failed" : "warning"} />
                <button onClick={() => (a.href ? router.push(a.href) : notify(a.desc))}>
                  <b>{a.title}</b><span>{a.desc}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel" aria-label="Coming up">
          <div className="panel-head"><h2>Coming up</h2><span className="meta">GitHub Actions, hourly at :07</span></div>
          <ul className="log">
            {flows.slice(0, 3).map((f) => (
              <li key={f.id}>
                <time className="num">{live ? f.schedule.replace("Every ", "every ") : "in 7m"}</time>
                <Icon name="clock" className="faint" />
                <span><b>{f.name}</b><span>{f.domain}</span></span>
              </li>
            ))}
            <li>
              <time />
              <Icon name="plus" className="faint" />
              <span><Link className="link" href="/flows/new">Add another journey</Link><span>Signup, login or checkout: whichever one costs you most when it breaks.</span></span>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
