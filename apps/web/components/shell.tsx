"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { demoFlows, DEMO_REPLAY_ID } from "@/lib/demo-data";
import { Icon } from "./ui";
import { ToastProvider, useToast } from "./toast";
import { useWorkspaceName } from "./workspace";

const NAV = [
  { href: "/monitors", match: ["/monitors", "/flows"], icon: "grid", label: "Monitors" },
  { href: `/replay/${DEMO_REPLAY_ID}`, match: ["/replay"], icon: "play", label: "Failure Replays", count: 3 },
  { href: "/scan", match: ["/scan"], icon: "globe", label: "Public Scans" },
  { href: "/alerts", match: ["/alerts"], icon: "bell", label: "Alerts & Integrations" },
  { href: "/settings", match: ["/settings"], icon: "settings", label: "Settings" },
] as const;

function title(pathname: string): { label: string; icon: string } {
  if (pathname.startsWith("/flows/new")) return { label: "Create critical flow", icon: "grid" };
  if (pathname.startsWith("/replay")) return { label: "Failure replays", icon: "play" };
  if (pathname.startsWith("/scan")) return { label: "Public scans", icon: "globe" };
  if (pathname.startsWith("/alerts")) return { label: "Alerts & integrations", icon: "grid" };
  if (pathname.startsWith("/settings")) return { label: "Settings", icon: "grid" };
  return { label: "Monitors", icon: "grid" };
}

function Sidebar() {
  const pathname = usePathname();
  const notify = useToast();
  const [workspace] = useWorkspaceName();
  const flowCount = demoFlows.length;
  return (
    <aside className="sidebar">
      <Link className="brand" href="/monitors">
        <span className="brand-icon"><Icon name="shield" size={23} /></span>FlowGuard<span className="beta">BETA</span>
      </Link>
      <Link className="workspace-switch" href="/settings">
        <span className="workspace-avatar">{workspace.charAt(0).toUpperCase() || "A"}</span>
        <span>{workspace}<small>Pro plan <span>⌄</span></small></span>
        <Icon name="down" size={15} />
      </Link>
      <div className="nav-caption">WORKSPACE</div>
      <nav>
        {NAV.map((item) => {
          const active = item.match.some((m) => pathname.startsWith(m));
          return (
            <Link key={item.href} href={item.href} className={active ? "nav-item active" : "nav-item"} aria-current={active ? "page" : undefined}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {"count" in item && <span className="nav-count">{item.count}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="usage">
          <div><Icon name="bolt" size={16} /><b>Your flows. Always protected.</b></div>
          <p>{flowCount} of 25 active flows</p>
          <div className="usage-track"><i style={{ width: `${Math.min(100, (flowCount / 25) * 100)}%` }} /></div>
          <Link href="/settings" className="usage-link">Manage your plan <Icon name="arrow" size={14} /></Link>
        </div>
        <button className="support" onClick={() => notify("Need a hand? Contact support@flowguard.example (demo).")}>
          <Icon name="help" /> Help & documentation <Icon name="external" size={14} />
        </button>
        <Link className="profile" href="/settings">
          <span className="avatar">JD</span>
          <span><b>Jamie Davis</b><small>jamie@acme.io</small></span>
          <Icon name="down" size={15} />
        </Link>
      </div>
    </aside>
  );
}

function Topbar() {
  const pathname = usePathname();
  const [workspace] = useWorkspaceName();
  const t = title(pathname);
  return (
    <header className="topbar">
      <div>
        <span className="muted">{workspace}</span>
        <span className="crumb-divider">/</span>
        <Icon name={t.icon} size={16} />
        <span>{t.label}</span>
      </div>
      <span className="system-status"><span className="dot" /> All systems operational</span>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="app-shell">
        <Sidebar />
        <div className="main-shell">
          <Topbar />
          <main className="main-content">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}
