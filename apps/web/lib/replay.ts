import "server-only";
import type { ConsoleLog, NetworkError, StepResult } from "@flowguard/shared";
import { DEMO_REPLAY_ID, demoReplay, type ReplayData } from "./demo-data";
import { getSupabaseAdmin, getSupabaseServer } from "./supabase/server";

interface PublicRun {
  id: string;
  status: "PASSING" | "FAILED";
  started_at: string;
  duration_ms: number | null;
  failed_step_index: number | null;
  error_message: string | null;
  explanation?: { title: string; detail: string; suggestion: string; evidence: string[] } | null;
  flaky?: boolean;
  attempts?: number;
  video_path: string | null;
  console_logs: ConsoleLog[];
  network_errors: NetworkError[];
  steps: StepResult[];
  flow: { name: string; start_url: string; viewport: "desktop" | "mobile"; steps: Array<{ instruction: string }> };
}

const fmtAt = (ms: number) => `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${((ms % 60000) / 1000).toFixed(3).padStart(6, "0")}`;

/**
 * Resolve /replay/[runId]: `runId` is the public share token. Uses the security-definer
 * function get_public_run(token) so anonymous visitors only ever see that one run.
 * Falls back to the demo incident when Supabase is not configured or the token is "482".
 */
export async function getReplay(token: string): Promise<ReplayData | null> {
  if (token === DEMO_REPLAY_ID || token === "demo") return demoReplay;
  const db = await getSupabaseServer();
  if (!db) return demoReplay;

  const { data, error } = await db.rpc("get_public_run", { token });
  if (error || !data) return null;
  const run = data as PublicRun;

  let videoUrl: string | null = null;
  const admin = getSupabaseAdmin();
  if (admin && run.video_path) {
    const signed = await admin.storage.from("replays").createSignedUrl(run.video_path, 60 * 60);
    videoUrl = signed.data?.signedUrl ?? null;
  }

  const failed = run.failed_step_index;
  const host = new URL(run.flow.start_url).host;
  const passedCount = run.steps.filter((s) => s.status === "passed").length;
  return {
    source: "live",
    runLabel: `RUN ${run.id.slice(0, 8).toUpperCase()}`,
    status: run.status,
    flowName: run.flow.name,
    domain: host,
    detectedAt: `${run.status === "FAILED" ? "Failed" : "Passed"} ${new Date(run.started_at).toUTCString().replace(" GMT", " UTC")}`,
    summaryTitle: run.status === "FAILED" ? run.explanation?.title ?? `Stopped at step ${failed !== null ? failed + 1 : 1}` : run.flaky ? "Passed on retry (flaky)" : "Every step passed",
    summaryBody:
      run.status === "FAILED"
        ? `${passedCount} of ${run.steps.length} steps passed. ${run.explanation?.detail ?? run.error_message ?? ""}`
        : `${run.steps.length} steps completed in ${((run.duration_ms ?? 0) / 1000).toFixed(1)}s.`,
    steps: run.steps.map((s) => ({ instruction: s.instruction, status: s.status, duration: `${(s.duration_ms / 1000).toFixed(1)}s`, error: s.error })),
    consoleErrors: run.console_logs.map((c) => {
      const [first, ...rest] = c.text.split("\n");
      const [title, ...msg] = first.split(": ");
      return { title: msg.length ? title : c.type, message: msg.length ? msg.join(": ") : first, stack: rest.join("\n") || c.location, at: fmtAt(c.at_ms) };
    }),
    networkErrors: run.network_errors.map((n) => ({
      method: n.method,
      path: (() => { try { const u = new URL(n.url); return u.host === host ? u.pathname : n.url; } catch { return n.url; } })(),
      status: n.status,
      statusText: n.status ? `${n.status} ${n.status_text ?? ""}`.trim() : n.failure ?? "Request failed",
      at: fmtAt(n.at_ms),
    })),
    domSnapshot: "DOM snapshots are kept in the run's diagnostics.json in storage.",
    environment: [
      ["Browser", "Chromium (headless)"],
      ["Viewport", run.flow.viewport === "mobile" ? "390 × 844 · iPhone 15" : "1440 × 900 · Desktop"],
      ["Runner", "GitHub Actions (free tier)"],
      ["Total duration", `${((run.duration_ms ?? 0) / 1000).toFixed(1)} seconds`],
    ],
    suggestion: run.explanation?.suggestion ?? (run.status === "FAILED" ? "Watch the recording and check the console and network tabs." : ""),
    evidence: run.explanation?.evidence ?? [],
    videoUrl,
    durationSeconds: Math.round((run.duration_ms ?? 0) / 1000),
  };
}
