/**
 * Storage and data retention, run at the end of every `run-due`.
 *
 * Supabase's free tier has 1 GB of storage and every run uploads a video (1–3 MB), step
 * JPEGs and diagnostics. Without this, hourly runs fill the bucket within weeks.
 *
 * What it does (all configurable by env; the Privacy Policy states the defaults, so change
 * both together; see docs/legal/README.md):
 *   RETAIN_PASSING_DAYS   (7)   delete files of passing runs older than this; keep the row
 *   RETAIN_FAILED_DAYS    (30)  delete files of failed runs older than this; keep the row
 *   RETAIN_RUN_ROWS_DAYS  (90)  delete run rows (and any files left) older than this
 *   RETAIN_SCAN_DAYS      (30)  delete free-scan rows and their files older than this
 * Rows whose files are gone get video_url = null, so the replay page says the video expired.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "replays";
const DAY = 86_400_000;
const BATCH = 200;

function days(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

interface Listed { path: string; size: number }

async function listAll(db: SupabaseClient, prefix: string): Promise<Listed[]> {
  const out: Listed[] = [];
  const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: 1000 });
  if (error) throw new Error(`list ${prefix}: ${error.message}`);
  for (const item of data ?? []) {
    const path = `${prefix}/${item.name}`;
    if (item.id) out.push({ path, size: Number((item.metadata as { size?: number } | null)?.size ?? 0) });
    else out.push(...(await listAll(db, path)));
  }
  return out;
}

async function removeFolders(db: SupabaseClient, folders: string[]): Promise<{ files: number; bytes: number }> {
  let files = 0, bytes = 0;
  for (const folder of folders) {
    const listed = await listAll(db, folder);
    for (let i = 0; i < listed.length; i += 100) {
      const chunk = listed.slice(i, i + 100);
      const { error } = await db.storage.from(BUCKET).remove(chunk.map((f) => f.path));
      if (error) throw new Error(`remove in ${folder}: ${error.message}`);
      files += chunk.length;
      bytes += chunk.reduce((n, f) => n + f.size, 0);
    }
  }
  return { files, bytes };
}

interface RunRef { id: string; flows: { workspace_id: string } | { workspace_id: string }[] | null }
const folderOf = (r: RunRef) => {
  const f = Array.isArray(r.flows) ? r.flows[0] : r.flows;
  return f ? `${f.workspace_id}/${r.id}` : null;
};

export async function cleanupStorage(db: SupabaseClient, now = Date.now()): Promise<void> {
  const passDays = days("RETAIN_PASSING_DAYS", 7);
  const failDays = days("RETAIN_FAILED_DAYS", 30);
  const rowDays = days("RETAIN_RUN_ROWS_DAYS", 90);
  const scanDays = days("RETAIN_SCAN_DAYS", 30);
  let files = 0, bytes = 0, mediaRuns = 0, rows = 0, scans = 0;
  const iso = (d: number) => new Date(now - d * DAY).toISOString();

  // 1. Media of old runs: passing after passDays, failed after failDays. Rows are kept.
  for (const [status, d] of [["PASSING", passDays], ["FAILED", failDays]] as const) {
    const { data, error } = await db
      .from("flow_runs")
      .select("id, flows!inner(workspace_id)")
      .eq("status", status)
      .not("video_url", "is", null)
      .lt("started_at", iso(d))
      .limit(BATCH);
    if (error) { console.warn(`[cleanup] listing ${status} runs failed: ${error.message}`); continue; }
    const refs = (data ?? []) as unknown as RunRef[];
    if (!refs.length) continue;
    const removed = await removeFolders(db, refs.map(folderOf).filter((f): f is string => !!f));
    files += removed.files; bytes += removed.bytes; mediaRuns += refs.length;
    const { error: upErr } = await db.from("flow_runs").update({ video_url: null }).in("id", refs.map((r) => r.id));
    if (upErr) console.warn(`[cleanup] clearing video_url failed: ${upErr.message}`);
  }

  // 2. Whole run rows after rowDays (plus any files a failed upload left behind).
  {
    const { data, error } = await db.from("flow_runs").select("id, flows!inner(workspace_id)").lt("started_at", iso(rowDays)).limit(BATCH);
    if (error) console.warn(`[cleanup] listing old rows failed: ${error.message}`);
    const refs = (data ?? []) as unknown as RunRef[];
    if (refs.length) {
      const removed = await removeFolders(db, refs.map(folderOf).filter((f): f is string => !!f));
      files += removed.files; bytes += removed.bytes;
      const { error: delErr } = await db.from("flow_runs").delete().in("id", refs.map((r) => r.id));
      if (delErr) console.warn(`[cleanup] deleting old rows failed: ${delErr.message}`);
      else rows = refs.length;
    }
  }

  // 3. Free scans after scanDays (files live under scans/<scan id>/).
  {
    const { data, error } = await db.from("public_scans").select("id").lt("created_at", iso(scanDays)).limit(BATCH);
    if (error) console.warn(`[cleanup] listing old scans failed: ${error.message}`);
    const ids = (data ?? []).map((s) => s.id as string);
    if (ids.length) {
      const removed = await removeFolders(db, ids.map((id) => `scans/${id}`));
      files += removed.files; bytes += removed.bytes;
      const { error: delErr } = await db.from("public_scans").delete().in("id", ids);
      if (delErr) console.warn(`[cleanup] deleting old scans failed: ${delErr.message}`);
      else scans = ids.length;
    }
  }

  const mb = (bytes / 1_048_576).toFixed(1);
  console.log(
    `cleanup: freed ${mb} MB (${files} files) · media removed from ${mediaRuns} run(s) (passing > ${passDays}d, failed > ${failDays}d) · ` +
      `${rows} run row(s) > ${rowDays}d deleted · ${scans} scan(s) > ${scanDays}d deleted`,
  );
}
