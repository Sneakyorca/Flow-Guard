"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { demoActivity, DEMO_REPLAY_ID } from "@/lib/demo-data";
import { Badge, Button, Icon, Uptime } from "@/components/ui";
import { useToast } from "@/components/toast";
import { touchFlow, useFlows } from "@/components/flows-store";

const REPLAY = `/replay/${DEMO_REPLAY_ID}`;

export function MonitorsView() {
  const router = useRouter();
  const notify = useToast();
  const flows = useFlows();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [running, setRunning] = useState<string[]>([]);
  const [range, setRange] = useState("24");

  const run = (id: string) => {
    setRunning((r) => [...r, id]);
    window.setTimeout(() => {
      setRunning((r) => r.filter((n) => n !== id));
      touchFlow(id);
      notify("Demo run complete. Sample result refreshed.");
    }, 1400);
  };

  const visible = flows.filter((f) => (filter === "all" || f.status === filter) && `${f.name} ${f.domain}`.toLowerCase().includes(search.toLowerCase()));
  const failed = flows.filter((f) => f.status === "failed").length;
  const warning = flows.filter((f) => f.status === "warning").length;
  const passing = flows.length - failed - warning;
  const domains = new Set(flows.map((f) => f.domain)).size;
  const limit = search || filter !== "all" ? 25 : 5;

  const metrics: Array<[string, string, string, string, string, string]> = [
    ["Active flows", String(flows.length), `${passing} passing`, `${failed} failed · ${warning} degraded`, "grid", "indigo"],
    [range === "24" ? "24h pass rate" : "7d pass rate", range === "24" ? "98.4%" : "99.1%", "↗ 0.6%", "vs. previous period", "shield", "green"],
    ["Caught regressions", "3", "This week", "Before your users did", "bolt", "red"],
    ["Avg. flow duration", "4.2", "↓ 12%", "faster than last week", "clock", "amber"],
  ];

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR PRODUCT’S SAFETY NET</div>
          <h1>Monitored user journeys</h1>
          <p>Know the moment a critical flow breaks. Not when a customer tells you.</p>
        </div>
        <Link className="btn primary" href="/flows/new"><Icon name="plus" size={17} /> New User Flow</Link>
      </div>
      <div className="overview-meta">
        <span><span className="dot" /> Monitoring {flows.length} critical flows across {domains} domains</span>
        <select aria-label="Metrics time range" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="24">Last 24 hours</option>
          <option value="168">Last 7 days</option>
        </select>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-7">
        {metrics.map(([label, value, detail, hint, icon, color], i) => (
          <article className="metric-card" key={label}>
            <div className="metric-label">{label}<span className={`metric-icon ${color}`}><Icon name={icon} size={16} /></span></div>
            <div className="metric-value">
              {value}{i === 3 && <span>s</span>}
              <svg className={`sparkline ${color}`} width="91" height="35" viewBox="0 0 91 35" aria-hidden="true">
                <path d={i === 2 ? "M1 29h18V20h19v3h17V10h16v3h19" : i === 3 ? "m1 5 10 4 10-2 11 10 9-4 10 8 10-1 9 6 10 1" : "m1 29 10-5 9 2 10-10 10 3 10-10 10 5 10-9 10 1 10-5"} fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <div className="metric-foot"><span className={i === 0 || i === 1 || i === 3 ? "text-green" : ""}>{detail}</span><span>{hint}</span></div>
          </article>
        ))}
      </section>

      {failed > 0 && (
        <div className="incident-banner">
          <span className="incident-icon">!</span>
          <div><b>One flow needs your attention</b><p>Guest Checkout & Paystack Modal failed at Step 4. We’ve captured everything you need.</p></div>
          <Link href={REPLAY}>View failure replay <Icon name="arrow" size={16} /></Link>
        </div>
      )}

      <section className="flows-panel">
        <div className="flows-toolbar">
          <div className="filter-tabs" aria-label="Filter monitors">
            {([["all", "All flows", flows.length], ["passing", "Passing", passing], ["failed", "Failed", failed], ["warning", "Degraded", warning]] as const).map(([id, label, count]) => (
              <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)} className={filter === id ? "selected" : ""}>{label}<span>{count}</span></button>
            ))}
          </div>
          <label className="search">
            <Icon name="search" size={16} />
            <input aria-label="Search flows" placeholder="Search flows..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <span>⌘ K</span>
          </label>
        </div>
        <div className="flow-table-head"><span>FLOW / DOMAIN</span><span>30-DAY UPTIME</span><span>LAST RUN</span><span /></div>
        <div>
          {visible.slice(0, limit).map((f) => (
            <article className={`flow-row ${f.status === "failed" ? "failed-row" : ""}`} key={f.id}>
              <div className="flow-info">
                <div>
                  <Badge status={f.status} />
                  <button className="flow-name" onClick={() => { if (f.status === "failed") router.push(REPLAY); else notify(`${f.name}: ${f.detail}. Duration ${f.duration}s.`); }}>{f.name}</button>
                </div>
                <div className="flow-domain"><Icon name="globe" size={13} /><span className="mono">{f.domain}</span><span>·</span><span>{f.schedule}</span></div>
              </div>
              <div className="uptime-cell">
                <div>
                  <span className={f.status === "passing" ? "text-green" : f.status === "failed" ? "text-red" : "text-amber"}>{f.status === "passing" ? "100" : f.status === "failed" ? "96.7" : "99.2"}%</span>
                  <span>30 days</span>
                </div>
                <Uptime status={f.status} />
              </div>
              <div className="last-run">
                <span><span className={`dot ${f.status}`} />{f.time}</span>
                <small className={f.status === "failed" ? "text-red" : f.status === "warning" ? "text-amber" : ""}>
                  {f.status === "passing" ? `Passed in ${f.duration.toFixed(1)}s` : f.status === "failed" ? "Failed at Step 4" : "Slow API · 4,900ms"}
                </small>
              </div>
              <Button disabled={running.includes(f.id)} onClick={() => run(f.id)}>
                <Icon name={running.includes(f.id) ? "refresh" : "play"} size={14} />{running.includes(f.id) ? "Running" : "Run now"}
              </Button>
            </article>
          ))}
          {visible.length === 0 && <p className="p-8 muted">No flows match your search.</p>}
        </div>
        <div className="table-footer">
          <span>Showing {Math.min(visible.length, limit)} of {visible.length} flows</span>
          <span className="legend"><i className="dot" /> Passing <i className="dot warning" /> Degraded <i className="dot failed" /> Failed</span>
          {!search && filter === "all" && <button onClick={() => { setSearch(""); setFilter("passing"); }}>View all flows <Icon name="arrow" size={14} /></button>}
        </div>
      </section>

      <section className="bottom-grid">
        <article className="activity-card">
          <div className="section-title"><h2>Recent activity</h2><span>LIVE FEED <span className="dot" /></span></div>
          {demoActivity.map((a) => (
            <button className="activity-row" key={a.title} onClick={() => (a.status === "failed" ? router.push(REPLAY) : notify(a.desc))}>
              <span className={`activity-symbol ${a.status}`}>{a.status === "passing" ? "✓" : "!"}</span>
              <span><b>{a.title}</b><small>{a.desc}</small></span>
              <time>{a.time}</time>
            </button>
          ))}
        </article>
        <article className="peace-card">
          <div className="peace-art">
            <svg width="144" height="93" viewBox="0 0 144 93" fill="none" aria-hidden="true"><ellipse cx="72" cy="65" rx="65" ry="24" stroke="#303151" /><ellipse cx="72" cy="65" rx="47" ry="16" stroke="#454166" /><path d="m72 7 27 10v22c0 18-27 31-27 31S45 57 45 39V17L72 7Z" fill="#252344" stroke="#8079ce" /><path d="m60 37 9 9 17-20" stroke="#b1a7ff" strokeWidth="3" /><path d="m9 42 7-4 7 4-7 4-7-4Zm112-12 5-3 5 3-5 3-5-3Z" fill="#8276d9" /></svg>
          </div>
          <h2>Ship with confidence. Sleep a little better.</h2>
          <p>Your AI QA teammate is watching the flows that matter.<br />Every hour. Every day. Even when you’re not.</p>
          <Link href="/flows/new">Protect another user journey <Icon name="arrow" size={15} /></Link>
        </article>
      </section>
      <div className="workspace-footer">
        <span><Icon name="shield" size={14} /> A little less firefighting. A lot more building.</span>
        <span>Demo workspace · Simulated runs · Session-only data</span>
      </div>
    </>
  );
}
