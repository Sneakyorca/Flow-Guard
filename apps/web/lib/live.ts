import "server-only";
import type { DemoFlow, Status } from "./demo-data";
import { allRanges, bucketize, RANGES, type RangeBuckets, type RunPoint } from "./runs-data";
import { getSupabaseServer } from "./supabase/server";

/** Everything the signed-in workspace shell needs, loaded once per request in the (app) layout. */
export interface LiveData {
  user: { email: string; name: string; initials: string };
  workspace: { id: string; name: string; plan: string };
  flows: DemoFlow[];
  activity: Array<{ status: Exclude<Status, "pending">; title: string; desc: string; time: string; href: string }>;
  /** Workspace-wide run history for the Monitors charts, already bucketed on the server. */
  charts: RangeBuckets;
  /** Server clock when this was loaded, so the browser labels slots consistently. */
  loadedAt: number;
  /** Newest run per flow (id + start time), used by the Run button to spot a new result. */
  latestRun: Record<string, { id: string; startedAt: string } | null>;
  stats: {
    passed24h: number; total24h: number;
    passed7d: number; total7d: number;
    medianMs: number | null;
    failuresThisWeek: number;
  };
}

interface FlowRow { id: string; name: string; start_url: string; schedule_cron: string | null; status: string; created_at: string }
interface RunRow {
  id: string; flow_id: string; status: "PASSING" | "FAILED"; started_at: string; duration_ms: number | null;
  failed_step_index: number | null; error_message: string | null; public_share_token: string;
  flaky: boolean | null; explanation: { title?: string } | null;
}

const DAY = 86_400_000;
const SCHEDULES: Record<string, string> = { "0 * * * *": "Every 1 hour", "0 */6 * * *": "Every 6 hours", "0 6 * * *": "Daily" };

/**
 * Real data for the signed-in user, or null in demo mode (Supabase not configured) or when
 * nobody is signed in (the proxy redirects those requests to /login before they get here).
 * All queries go through RLS, so a user only ever sees their own workspace.
 */
export async function getLiveData(): Promise<LiveData | null> {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: ws } = await supabase.from("workspaces").select("id, name, plan").order("created_at").limit(1).maybeSingle();
  const email = user.email ?? "";
  const local = email.split("@")[0] || "you";
  const me = { email, name: local, initials: local.slice(0, 2).toUpperCase() };
  const empty: LiveData["stats"] = { passed24h: 0, total24h: 0, passed7d: 0, total7d: 0, medianMs: null, failuresThisWeek: 0 };
  const nowMs = Date.now();
  if (!ws) return { user: me, workspace: { id: "", name: "My Workspace", plan: "free" }, flows: [], activity: [], stats: empty, charts: allRanges([], nowMs), loadedAt: nowMs, latestRun: {} };

  const { data: flowRows } = await supabase
    .from("flows")
    .select("id, name, start_url, schedule_cron, status, created_at")
    .eq("workspace_id", ws.id)
    .order("created_at");
  const flows = (flowRows ?? []) as FlowRow[];

  const now = nowMs;
  let runs: RunRow[] = [];
  if (flows.length) {
    const { data } = await supabase
      .from("flow_runs")
      .select("id, flow_id, status, started_at, duration_ms, failed_step_index, error_message, public_share_token, flaky, explanation")
      .in("flow_id", flows.map((f) => f.id))
      .gte("started_at", new Date(now - 30 * DAY).toISOString())
      .order("started_at", { ascending: false })
      .limit(5000);
    runs = (data ?? []) as RunRow[];
  }

  const byFlow = new Map<string, RunRow[]>();
  for (const r of runs) byFlow.set(r.flow_id, [...(byFlow.get(r.flow_id) ?? []), r]);
  const flowById = new Map(flows.map((f) => [f.id, f]));

  const viewFlows: DemoFlow[] = flows.map((f) => {
    const fr = byFlow.get(f.id) ?? [];
    const last = fr[0];
    const domain = hostname(f.start_url);
    const schedule = f.status === "paused" ? "Paused" : f.schedule_cron ? SCHEDULES[f.schedule_cron] ?? `cron ${f.schedule_cron}` : "Manual only";
    const passed = fr.filter((r) => r.status === "PASSING").length;
    const base = {
      id: f.id, name: f.name, domain, schedule,
      days: bucketize(fr.map(toPoint), now, RANGES["30d"].count, RANGES["30d"].size),
      uptime: fr.length ? `${round1((passed / fr.length) * 100)}%` : "–",
    };
    if (!last) {
      return { ...base, status: "pending", time: "never", detail: "Waiting for its first scheduled run.", duration: 0, lastRunLabel: "Waits for the next run" };
    }
    const secs = (last.duration_ms ?? 0) / 1000;
    const ago = relative(last.started_at, now);
    if (last.status === "FAILED") {
      const step = last.failed_step_index;
      const where = step === null ? "" : step === 0 ? "the start page didn’t load" : `step ${step + 1}`;
      return {
        ...base, status: "failed", time: ago, duration: secs, replayToken: last.public_share_token,
        detail: last.explanation?.title ?? last.error_message ?? "The run failed.",
        lastRunLabel: where ? `${ago}, ${where.startsWith("the") ? where : `at ${where}`}` : ago,
      };
    }
    if (last.flaky) {
      return { ...base, status: "warning", statusText: "Flaky", time: ago, duration: secs, replayToken: last.public_share_token, detail: "Failed once, then passed on the re-run.", lastRunLabel: `${ago}, passed on retry` };
    }
    return { ...base, status: "passing", time: ago, duration: secs, replayToken: last.public_share_token, detail: "All steps passed.", lastRunLabel: `${ago}, ${secs.toFixed(1)}s` };
  });

  const in24 = runs.filter((r) => now - Date.parse(r.started_at) < DAY);
  const in7 = runs.filter((r) => now - Date.parse(r.started_at) < 7 * DAY);
  const durations = in7.map((r) => r.duration_ms).filter((d): d is number => typeof d === "number").sort((a, b) => a - b);

  return {
    user: me,
    workspace: { id: ws.id, name: ws.name, plan: ws.plan },
    flows: viewFlows,
    charts: allRanges(runs.map(toPoint), now),
    loadedAt: now,
    latestRun: Object.fromEntries(flows.map((f) => {
      const r = byFlow.get(f.id)?.[0];
      return [f.id, r ? { id: r.id, startedAt: r.started_at } : null];
    })),
    activity: runs.slice(0, 6).map((r) => {
      const f = flowById.get(r.flow_id)!;
      const failed = r.status === "FAILED";
      return {
        status: failed ? "failed" : r.flaky ? "warning" : "passing",
        title: `${f.name} ${failed ? "failed" : r.flaky ? "passed on retry" : "passed"}`,
        desc: `${hostname(f.start_url)} · ${failed ? r.explanation?.title ?? r.error_message ?? "see the replay" : `${((r.duration_ms ?? 0) / 1000).toFixed(1)}s`}`,
        time: relative(r.started_at, now),
        href: `/replay/${r.public_share_token}`,
      };
    }),
    stats: {
      passed24h: in24.filter((r) => r.status === "PASSING").length,
      total24h: in24.length,
      passed7d: in7.filter((r) => r.status === "PASSING").length,
      total7d: in7.length,
      medianMs: durations.length ? durations[Math.floor(durations.length / 2)] : null,
      failuresThisWeek: in7.filter((r) => r.status === "FAILED").length,
    },
  };
}

export function toPoint(r: { status: string; flaky: boolean | null; started_at: string; duration_ms: number | null }): RunPoint {
  return { t: Date.parse(r.started_at), s: r.status === "FAILED" ? "fail" : r.flaky ? "flaky" : "pass", ms: r.duration_ms };
}

export function relative(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86_400)}d ago`;
}

export function hostname(url: string): string {
  try { return new URL(url).hostname; } catch { return url; }
}

const round1 = (n: number) => (Math.round(n * 10) / 10).toString();
