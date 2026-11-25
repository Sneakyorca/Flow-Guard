"use client";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLive } from "./live-data";
import { useToast } from "./toast";

/*
 * After "Run" starts a GitHub Actions run, watch that flow until its result lands:
 * poll /api/flows/[id]/latest every 15s for up to 6 minutes, then refresh the page data
 * and toast the outcome. Also refreshes quietly every 60s while the tab is visible.
 * Live mode only: in demo mode nothing here ever touches the network.
 */

const POLL_MS = 15_000;
const GIVE_UP_MS = 6 * 60_000;
const QUIET_MS = 60_000;
const KEY = "fg.pendingRuns";

interface Pending { name: string; since: number; baseline: string | null }
interface LatestRun { id: string; status: "PASSING" | "FAILED"; flaky: boolean; started_at: string; public_share_token: string }

interface Tracker {
  running: (flowId: string) => boolean;
  /** Start a run through the API and begin watching for its result. */
  start: (flowId: string, name: string) => Promise<void>;
}

const Ctx = createContext<Tracker>({ running: () => false, start: async () => {} });
export const useRunTracker = () => useContext(Ctx);

function load(): Record<string, Pending> {
  try { return JSON.parse(window.sessionStorage.getItem(KEY) ?? "{}"); } catch { return {}; }
}

export function RunTrackerProvider({ children }: { children: ReactNode }) {
  const live = useLive();
  const router = useRouter();
  const pathname = usePathname();
  // Only pages that show run results refresh themselves (never a half-typed form).
  const watchPage = pathname === "/monitors" || (/^\/flows\/[^/]+$/.test(pathname) && pathname !== "/flows/new");
  const notify = useToast();
  const [pending, setPending] = useState<Record<string, Pending>>({});
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  // Pick up runs started on another page of this tab (sessionStorage survives navigation).
  useEffect(() => { if (live) setPending(load()); }, [live]);
  useEffect(() => {
    try { window.sessionStorage.setItem(KEY, JSON.stringify(pending)); } catch {}
  }, [pending]);

  const finish = useCallback((flowId: string) => {
    setPending((p) => { const { [flowId]: _done, ...rest } = p; return rest; });
  }, []);

  // Poll every pending flow.
  const hasPending = Object.keys(pending).length > 0;
  useEffect(() => {
    if (!live || !hasPending) return;
    let stopped = false;
    const tick = async () => {
      for (const [flowId, p] of Object.entries(pendingRef.current)) {
        if (Date.now() - p.since > GIVE_UP_MS) {
          finish(flowId);
          notify(`No result for “${p.name}” after 6 minutes. GitHub may be busy; it will show up here when it finishes.`, "info");
          continue;
        }
        try {
          const res = await fetch(`/api/flows/${flowId}/latest`, { cache: "no-store" });
          if (!res.ok) continue;
          const { run } = (await res.json()) as { run: LatestRun | null };
          // A new run that started after we pressed Run (allow a minute of clock skew).
          if (run && run.id !== p.baseline && Date.parse(run.started_at) > p.since - 60_000) {
            if (stopped) return;
            finish(flowId);
            router.refresh();
            if (run.status === "FAILED") notify(`“${p.name}” failed. Open the flow to watch the replay.`, "bad");
            else notify(run.flaky ? `“${p.name}” passed on the second try (flaky).` : `“${p.name}” passed.`, "ok");
          }
        } catch {
          // Offline for a moment: try again next tick.
        }
      }
    };
    const id = window.setInterval(tick, POLL_MS);
    return () => { stopped = true; window.clearInterval(id); };
  }, [live, hasPending, finish, notify, router]);

  // Quiet refresh while the tab is visible, so Monitors stays current without a reload.
  useEffect(() => {
    if (!live || !watchPage) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, QUIET_MS);
    const onVisible = () => { if (document.visibilityState === "visible") router.refresh(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", onVisible); };
  }, [live, watchPage, router]);

  const start = useCallback(async (flowId: string, name: string) => {
    if (!live) return;
    const baseline = live.latestRun[flowId]?.id ?? null;
    setPending((p) => ({ ...p, [flowId]: { name, since: Date.now(), baseline } }));
    try {
      const res = await fetch(`/api/flows/${flowId}/run`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        finish(flowId);
        notify(body.message ?? `Couldn’t start “${name}”.`, "bad");
        return;
      }
      notify(body.message ?? `“${name}” is starting.`, "info");
    } catch {
      finish(flowId);
      notify(`Couldn’t reach the server to start “${name}”.`, "bad");
    }
  }, [live, finish, notify]);

  const running = useCallback((flowId: string) => flowId in pending, [pending]);
  return <Ctx.Provider value={{ running, start }}>{children}</Ctx.Provider>;
}
