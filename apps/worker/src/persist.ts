import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { FlowRow, type RunDiagnostics } from "@flowguard/shared";
import { runFlow } from "./executor.js";
import { getResolver } from "./resolvers/index.js";
import { sendSlackAlert } from "./alerts.js";

export const REPLAYS_BUCKET = "replays";

/** Service-role client, or null when the secrets are not configured. */
export function supabaseFromEnv(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes("YOUR-PROJECT")) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type FlowWithWorkspace = FlowRow & { workspaces: { id: string; slack_webhook_url: string | null } | null };

export async function loadActiveFlows(db: SupabaseClient): Promise<FlowWithWorkspace[]> {
  const { data, error } = await db
    .from("flows")
    .select("*, workspaces(id, slack_webhook_url)")
    .eq("status", "active")
    .not("schedule_cron", "is", null);
  if (error) throw new Error(`Loading flows failed: ${error.message}`);
  return (data ?? []).flatMap((row) => {
    const parsed = FlowRow.safeParse(row);
    if (!parsed.success) {
      console.warn(`[run-due] skipping flow ${row.id}: ${parsed.error.issues[0]?.message}`);
      return [];
    }
    return [{ ...parsed.data, workspaces: row.workspaces ?? null }];
  });
}

export async function loadFlow(db: SupabaseClient, flowId: string): Promise<FlowWithWorkspace> {
  const { data, error } = await db.from("flows").select("*, workspaces(id, slack_webhook_url)").eq("id", flowId).single();
  if (error) throw new Error(`Loading flow ${flowId} failed: ${error.message}`);
  return { ...FlowRow.parse(data), workspaces: data.workspaces ?? null };
}

export interface PersistedRun {
  runId: string;
  shareToken: string;
  diagnostics: RunDiagnostics;
  replayUrl: string;
}

/**
 * Shared executor for every scheduler (GitHub Actions cron, BullMQ worker, manual):
 * run the flow, upload artifacts to the private `replays` bucket, insert `flow_runs`,
 * bump `flows.last_run_at`, and alert Slack on failure.
 */
export async function executeAndPersist(db: SupabaseClient, flow: FlowWithWorkspace, runsRoot: string): Promise<PersistedRun> {
  const runId = randomUUID();
  const outDir = path.join(runsRoot, runId);
  const diagnostics = await runFlow({
    runId,
    startUrl: flow.start_url,
    steps: flow.steps_json,
    viewport: flow.viewport,
    resolver: getResolver(),
    outDir,
    log: (m) => console.log(`  ${m}`),
  });

  const prefix = `${flow.workspace_id}/${runId}`;
  const uploads: Array<[string, string, string]> = [["diagnostics.json", path.join(outDir, "diagnostics.json"), "application/json"]];
  if (diagnostics.artifacts.video) uploads.push(["video.webm", diagnostics.artifacts.video, "video/webm"]);
  if (diagnostics.artifacts.failure_screenshot) uploads.push(["failure.png", diagnostics.artifacts.failure_screenshot, "image/png"]);
  let videoPath: string | null = null;
  for (const [name, file, contentType] of uploads) {
    const { error } = await db.storage.from(REPLAYS_BUCKET).upload(`${prefix}/${name}`, await readFile(file), { contentType, upsert: true });
    if (error) console.warn(`[persist] upload ${name} failed: ${error.message}`);
    else if (name === "video.webm") videoPath = `${prefix}/${name}`;
  }

  const { data: inserted, error: insErr } = await db
    .from("flow_runs")
    .insert({
      id: runId,
      flow_id: flow.id,
      status: diagnostics.status,
      started_at: diagnostics.started_at,
      duration_ms: diagnostics.duration_ms,
      failed_step_index: diagnostics.failed_step_index,
      error_message: diagnostics.error_message,
      video_url: videoPath,
      console_logs_json: diagnostics.console_logs,
      network_errors_json: diagnostics.network_errors,
      steps_result_json: diagnostics.steps,
    })
    .select("public_share_token")
    .single();
  if (insErr) throw new Error(`Inserting flow_runs failed: ${insErr.message}`);
  await db.from("flows").update({ last_run_at: diagnostics.started_at }).eq("id", flow.id);

  const shareToken = inserted.public_share_token as string;
  const appUrl = (process.env.PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const replayUrl = `${appUrl}/replay/${shareToken}`;

  if (diagnostics.status === "FAILED") {
    const webhook = flow.workspaces?.slack_webhook_url || process.env.SLACK_WEBHOOK_URL;
    if (webhook) await sendSlackAlert(webhook, flow, diagnostics, replayUrl).catch((e) => console.warn(`[alert] slack failed: ${e.message}`));
  }
  return { runId, shareToken, diagnostics, replayUrl };
}
