"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { demoActivity, DEMO_REPLAY_ID, type Status } from "@/lib/demo-data";
import { Button, Icon, StatusLabel, StepIcon, Uptime } from "@/components/ui";
import { useToast } from "@/components/toast";
import { touchFlow, useFlows } from "@/components/flows-store";
import { useLive } from "@/components/live-data";

const REPLAY = `/replay/${DEMO_REPLAY_ID}`;
const FILTERS: Array<[string, string]> = [["all", "All"], ["failed", "Failing"], ["warning", "Slow"], ["passing", "Passing"]];
const UPTIME: Record<Status, string> = { passing: "100%", failed: "96.7%", warning: "99.2%", pending: "–" };

export function MonitorsView() {
  const router = useRouter();
  const notify = useToast();
  const flows = useFlows();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [running, setRunning] = useState<string[]>([]);
  const [range, setRange] = useState("24");
  const [showAll, setShowAll] = useState(false);

  const live = useLive();
  const replayOf = (f: { replayToken?: string }) => (f.replayToken ? `/replay/${f.replayToken}` : REPLAY);

  const run = async (id: string, name: string) => {
    setRunning((r) => [...r, id]);
    if (live) {
      // Real mode: ask the server to start a GitHub Actions run for just this flow.
      try {
        const res = await fetch(`/api/flows/${id}/run`, { method: "POST" });
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        notify(body.message ?? (res.ok ? `“${name}” is queued.` : `Couldn’t start “${name}”.`));
      } catch {
        notify(`Couldn’t reach the server to start “${name}”.`);
      }
      setRunning((r) => r.filter((n) => n !== id));
      return;
    }
    window.setTimeout(() => {
      setRunning((r) => r.filter((n) => n !== id));
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
          <p>For a shop that’s usually checkout. For an app, signup. Write it the way you’d explain it to a new teammate, one action per step. FlowGuard opens the page every hour and works out which button or field you mean.</p>
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
  const s = live?.stats;
  const pct = (a: number, b: number) => (b ? `${(Math.round((a / b) * 1000) / 10).toString()}%` : "–");
  const passRate = s ? (range === "24" ? pct(s.passed24h, s.total24h) : pct(s.passed7d, s.total7d)) : range === "24" ? "98.4%" : "99.1%";
  const passOf = s ? (range === "24" ? `${s.passed24h} of ${s.total24h}` : `${s.passed7d} of ${s.total7d}`) : range === "24" ? "283 of 288" : "2,004 of 2,016";
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
          <p>{flows.length} journeys on {domains} sites, each run in a real browser every hour.</p>
        </div>
        <Link className="btn primary" href="/flows/new"><Icon name="plus" /> New flow</Link>
      </div>

      <dl className="summary">
        <div><dt>Failing now</dt><dd className={failed ? "t-bad" : ""}>{failed}<small>of {flows.length}</small></dd></div>
        <div><dt>Slow</dt><dd className={warning ? "t-warn" : ""}>{warning}<small>over 3s</small></dd></div>
        <div><dt>Runs passed, {range === "24" ? "24h" : "7 days"}</dt><dd>{passRate}<small>{passOf}</small></dd></div>
        {s
          ? <div><dt>Median run time, 7 days</dt><dd>{s.medianMs === null ? "–" : `${(s.medianMs / 1000).toFixed(1)}s`}</dd></div>
          : <div><dt>Median run time</dt><dd>4.2s<small>was 4.8s</small></dd></div>}
      </dl>
      <div className="summary-foot">
        <span>{passing} passing · {s ? `${s.failuresThisWeek} failed run${s.failuresThisWeek === 1 ? "" : "s"} this week` : "3 regressions caught this week"}</span>
        <label>
          <span className="sr-only">Time range</span>
          <select value={range} onChange={(e) => setRange(e.target.value)}>
            <option value="24">Last 24 hours</option>
            <option value="168">Last 7 days</option>
          </select>
        </label>
      </div>

      {failingFlow && (
        <div className="alert-row" role="alert">
          <Icon name="x-circle" size={20} />
          <div>
            <b>{failingFlow.name} is failing</b>
            <p>{live ? `${failingFlow.detail} On ${failingFlow.domain}, ${failingFlow.time}.` : `Step 4 (“Pay Now”) threw a JavaScript error on ${failingFlow.domain}, ${failingFlow.time}. Customers can’t pay.`}</p>
          </div>
          <Link className="btn" href={replayOf(failingFlow)}>Watch the replay <Icon name="arrow" /></Link>
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
            {matches.slice(0, limit).map((f) => (
              <tr key={f.id} className={f.status === "failed" ? "is-failed" : ""}>
                <td>
                  <button className="flow-name" onClick={() => (f.status === "failed" || (live && f.replayToken) ? router.push(replayOf(f)) : notify(f.status === "pending" ? `${f.name}: ${f.detail}` : `${f.name}: ${f.detail} Took ${f.duration.toFixed(1)}s.`))}>{f.name}</button>
                  <div className="flow-sub"><span className="mobile-only"><StatusLabel status={f.status} text={f.statusText} /> · </span><span className="mono">{f.domain}</span> · {f.schedule.toLowerCase()}</div>
                </td>
                <td className="col-uptime">
                  <div className="uptime-pct"><span className="num">{f.uptime ?? UPTIME[f.status]}</span></div>
                  <Uptime status={f.status} history={f.history} />
                </td>
                <td className="col-last">
                  <StatusLabel status={f.status} text={f.statusText} />
                  <div className="flow-sub num">
                    {f.lastRunLabel ?? (f.status === "passing" ? `${f.time}, ${f.duration.toFixed(1)}s` : f.status === "failed" ? `${f.time}, at step 4` : `${f.time}, API took 4.9s`)}
                  </div>
                </td>
                <td style={{ textAlign: "right" }}>
                  <Button size="sm" disabled={running.includes(f.id)} onClick={() => run(f.id, f.name)} label={`Run ${f.name} now`}>
                    <Icon name={running.includes(f.id) ? "refresh" : "play"} size={14} />{running.includes(f.id) ? "Running…" : "Run"}
                  </Button>
                </td>
              </tr>
            ))}
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
