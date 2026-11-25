"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { demoUser, DEMO_REPLAY_ID } from "@/lib/demo-data";
import { Icon } from "./ui";
import { ToastProvider } from "./toast";
import { RunTrackerProvider } from "./run-tracker";
import { useWorkspaceName } from "./workspace";
import { useFlows } from "./flows-store";
import { LiveDataProvider, useLive } from "./live-data";
import type { LiveData } from "@/lib/live";

const NAV = [
  { href: "/monitors", match: ["/monitors", "/flows"], icon: "grid", label: "Monitors" },
  { href: `/replay/${DEMO_REPLAY_ID}`, match: ["/replay"], icon: "play", label: "Failure replays", failing: true },
  { href: "/scan", match: ["/scan"], icon: "globe", label: "Public scans" },
  { href: "/alerts", match: ["/alerts"], icon: "bell", label: "Alerts" },
  { href: "/settings", match: ["/settings"], icon: "settings", label: "Settings" },
] as const;

const TITLES: Array<[string, string]> = [
  ["/flows/new", "New flow"],
  ["/flows/", "Flow"],
  ["/replay", "Failure replay"],
  ["/scan", "Public scans"],
  ["/alerts", "Alerts"],
  ["/settings", "Settings"],
  ["/monitors", "Monitors"],
];

export function Wordmark({ beta = true }: { beta?: boolean }) {
  return (
    <span className="wordmark">
      <Icon name="mark" className="mark" size={22} />
      FlowGuard{beta && <small>beta</small>}
    </span>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const [workspace] = useWorkspaceName();
  const flows = useFlows();
  const live = useLive();
  const failing = flows.filter((f) => f.status === "failed").length;
  const me = live?.user ?? demoUser;
  const plan = live ? `${live.workspace.plan.charAt(0).toUpperCase()}${live.workspace.plan.slice(1)} plan` : "Starter plan";
  // Real mode: the replays link opens the newest failure, else the newest run, else Monitors.
  const replayHref = live
    ? (() => {
        const t = flows.find((f) => f.status === "failed")?.replayToken ?? flows.find((f) => f.replayToken)?.replayToken;
        return t ? `/replay/${t}` : "/monitors";
      })()
    : `/replay/${DEMO_REPLAY_ID}`;
  return (
    <aside className="side" aria-label="Main">
      <Link href="/monitors" aria-label="FlowGuard home"><Wordmark /></Link>
      <Link className="ws" href="/settings">
        <span className="av" aria-hidden="true">{workspace.charAt(0).toUpperCase() || "W"}</span>
        <span><b>{workspace}</b><span>{plan}</span></span>
      </Link>
      <nav className="nav">
        {NAV.map((item) => {
          const active = item.match.some((m) => pathname.startsWith(m));
          const href = "failing" in item ? replayHref : item.href;
          return (
            <Link key={item.href} href={href} aria-current={active ? "page" : undefined}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {"failing" in item && failing > 0 && <span className="count" aria-label={`${failing} failing`}>{failing}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="side-foot">
        <div className="quota">
          {flows.length} of 25 flows used
          <div className="bar"><i style={{ width: `${Math.min(100, (flows.length / 25) * 100)}%` }} /></div>
        </div>
        <a className="link" href="https://github.com/Sneakyorca/Flow-Guard#readme" target="_blank" rel="noreferrer">Setup guide</a>
        <Link className="me" href="/settings">
          <span className="av" aria-hidden="true">{me.initials}</span>
          <span><b>{me.name}</b><span>{me.email}</span></span>
        </Link>
        {live && (
          <form action="/auth/signout" method="post">
            <button type="submit" className="link" style={{ fontSize: 13 }}>Sign out</button>
          </form>
        )}
      </div>
    </aside>
  );
}

function Topbar() {
  const pathname = usePathname();
  const [workspace] = useWorkspaceName();
  const title = TITLES.find(([p]) => pathname.startsWith(p))?.[1] ?? "Monitors";
  return (
    <header className="topbar">
      <div className="crumbs"><span>{workspace}</span><span aria-hidden="true">/</span><b>{title}</b></div>
      <RunnerStatus />
    </header>
  );
}

/** Last run and the next scheduled check (GitHub Actions cron runs at minute 7 of every hour). */
function RunnerStatus() {
  const live = useLive();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  if (!live) {
    return (
      <div className="runner-status" title="Sample workspace">
        <span className="status passing"><span className="d" aria-hidden="true" /></span>
        <span>Sample data · runs hourly at :07</span>
      </div>
    );
  }
  const last = Object.values(live.latestRun).reduce<number | null>((m, r) => (r ? Math.max(m ?? 0, Date.parse(r.startedAt)) : m), null);
  if (now === null) return <div className="runner-status" />;
  const next = new Date(now);
  next.setUTCMinutes(7, 0, 0);
  if (next.getTime() <= now) next.setUTCHours(next.getUTCHours() + 1);
  const nextLabel = next.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const ago = last === null ? null : Math.max(0, Math.round((now - last) / 60_000));
  // Hourly runs: more than ~2 hours without any run means the scheduler probably isn't running.
  const stale = last !== null && live.flows.some((f) => f.schedule !== "Paused") && now - last > 2.5 * 3_600_000;
  return (
    <div className="runner-status" title="Scheduled runs come from GitHub Actions, hourly at minute 7. GitHub can start them a few minutes late.">
      <span className={`status ${last === null ? "pending" : stale ? "warning" : "passing"}`}><span className="d" aria-hidden="true" /></span>
      <span>
        {last === null ? "No runs yet" : `Last run ${ago! < 1 ? "just now" : ago! < 60 ? `${ago}m ago` : ago! < 1440 ? `${Math.floor(ago! / 60)}h ago` : `${Math.floor(ago! / 1440)}d ago`}`}
        {stale ? " (late)" : ""} · next check about {nextLabel}
      </span>
    </div>
  );
}

export function AppShell({ children, live = null }: { children: ReactNode; live?: LiveData | null }) {
  return (
    <LiveDataProvider value={live}>
    <ToastProvider>
    <RunTrackerProvider>
      <a href="#content" className="sr-only">Skip to content</a>
      <div className="shell">
        <Sidebar />
        <div className="main">
          <Topbar />
          <main id="content" className="content">{children}</main>
        </div>
      </div>
    </RunTrackerProvider>
    </ToastProvider>
    </LiveDataProvider>
  );
}
