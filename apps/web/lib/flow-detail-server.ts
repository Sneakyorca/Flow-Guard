import "server-only";
import { cache } from "react";
import { allRanges, bucketize, RANGES } from "./runs-data";
import { hostname, toPoint } from "./live";
import { scheduleLabel, type FlowDetail } from "./flow-detail";
import { getSupabaseServer } from "./supabase/server";

const DAY = 86_400_000;

interface Row {
  id: string; status: "PASSING" | "FAILED"; flaky: boolean | null; started_at: string; duration_ms: number | null;
  failed_step_index: number | null; error_message: string | null; explanation: { title?: string } | null; public_share_token: string;
}

/**
 * One flow and its last 30 days of runs for the signed-in user.
 * Returns "demo" when Supabase isn't configured, null when the flow isn't in the user's workspace.
 */
export const getFlowDetail = cache(async (id: string): Promise<FlowDetail | "demo" | null> => {
  const supabase = await getSupabaseServer();
  if (!supabase) return "demo";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

  // RLS: only returns the flow if it belongs to the signed-in user's workspace.
  const { data: flow } = await supabase
    .from("flows")
    .select("id, name, start_url, viewport, schedule_cron, status, steps_json")
    .eq("id", id)
    .maybeSingle();
  if (!flow) return null;

  const now = Date.now();
  const { data } = await supabase
    .from("flow_runs")
    .select("id, status, flaky, started_at, duration_ms, failed_step_index, error_message, explanation, public_share_token")
    .eq("flow_id", id)
    .gte("started_at", new Date(now - 30 * DAY).toISOString())
    .order("started_at", { ascending: false })
    .limit(2000);
  const runs = (data ?? []) as Row[];
  const points = runs.map(toPoint);

  return {
    source: "live",
    id: flow.id,
    name: flow.name,
    startUrl: flow.start_url,
    domain: hostname(flow.start_url),
    viewport: flow.viewport,
    scheduleCron: flow.schedule_cron,
    scheduleLabel: scheduleLabel(flow.schedule_cron, flow.status),
    status: flow.status,
    steps: ((flow.steps_json ?? []) as Array<{ instruction: string }>).map((s) => s.instruction),
    charts: allRanges(points, now),
    days: bucketize(points, now, RANGES["30d"].count, RANGES["30d"].size),
    runCount: runs.length,
    latestRunId: runs[0]?.id ?? null,
    runs: runs.slice(0, 50).map((r) => ({
      id: r.id,
      startedAt: Date.parse(r.started_at),
      status: r.status,
      flaky: Boolean(r.flaky),
      durationMs: r.duration_ms,
      failedStep: r.failed_step_index,
      summary: r.status === "FAILED" ? r.explanation?.title ?? r.error_message ?? "Failed" : r.flaky ? "Passed on retry" : "All steps passed",
      token: r.public_share_token,
    })),
  };
});
