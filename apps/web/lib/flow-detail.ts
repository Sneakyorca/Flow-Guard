import type { Bucket, RangeBuckets } from "./runs-data";

/** Everything /flows/[id] shows. Built on the server in live mode, in the browser in demo mode. */
export interface FlowDetail {
  source: "live" | "demo";
  id: string;
  name: string;
  startUrl: string;
  domain: string;
  viewport: "desktop" | "mobile";
  scheduleCron: string | null;
  scheduleLabel: string;
  status: "active" | "paused";
  steps: string[];
  charts: RangeBuckets;
  days: Bucket[];
  runs: FlowRunRow[];
  /** Total runs in the last 30 days (the list shows the newest 50). */
  runCount: number;
  latestRunId: string | null;
}

export interface FlowRunRow {
  id: string;
  startedAt: number;
  status: "PASSING" | "FAILED";
  flaky: boolean;
  durationMs: number | null;
  failedStep: number | null;
  summary: string;
  token: string | null;
}

export const SCHEDULES: Array<[label: string, cron: string]> = [
  ["Every 1 hour", "0 * * * *"],
  ["Every 6 hours", "0 */6 * * *"],
  ["Daily", "0 6 * * *"],
];

export function scheduleLabel(cron: string | null, status: string): string {
  if (status === "paused") return "Paused";
  if (!cron) return "Manual only";
  return SCHEDULES.find(([, c]) => c === cron)?.[0] ?? `cron ${cron}`;
}
