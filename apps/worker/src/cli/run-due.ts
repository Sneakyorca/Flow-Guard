/**
 * Zero-cost scheduler entry point (used by .github/workflows/scheduled-runs.yml).
 *
 *   npm run run-due -w @flowguard/worker                # run every flow whose cron is due
 *   npm run run-due -w @flowguard/worker -- --flow <id> # run one flow now (webhook/manual)
 *   npm run run-due -w @flowguard/worker -- --dry-run   # list due flows only
 *   npm run run-due -w @flowguard/worker -- --plan      # count due flows; writes due=N to $GITHUB_OUTPUT
 *   npm run run-due -w @flowguard/worker -- --cleanup-only  # only the retention cleanup (no browser)
 *
 * Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. Without them it exits 0 with a notice,
 * so forks and fresh clones don't get red scheduled builds.
 */
import { cleanupStorage } from "../cleanup.js";
import { isDue } from "../cron.js";
import { executeAndPersist, loadActiveFlows, loadFlow, supabaseFromEnv } from "../persist.js";
import { appendFileSync } from "node:fs";
import { loadDotEnv, parseArgs, runsDir } from "./common.js";

async function main() {
  loadDotEnv();
  const args = parseArgs();
  const db = supabaseFromEnv();
  if (!db) {
    console.log("run-due: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — nothing to do (skipping).");
    return;
  }

  if (args["cleanup-only"]) {
    await runCleanup(db);
    return;
  }

  const flows = typeof args.flow === "string" ? [await loadFlow(db, args.flow)] : (await loadActiveFlows(db)).filter((f) => isDue(f.schedule_cron, f.last_run_at));
  const limit = Number(process.env.FLOWGUARD_MAX_RUNS_PER_TICK || 20);
  console.log(`run-due: ${flows.length} flow(s) due${flows.length > limit ? `, running first ${limit}` : ""}`);
  if (args.plan) {
    // Cheap check the workflow runs before downloading a browser: no due flows, no browser.
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `due=${flows.length}\n`);
    return;
  }
  if (args["dry-run"]) {
    for (const f of flows) console.log(`  - ${f.name} (${f.start_url}, cron ${f.schedule_cron}, last ${f.last_run_at ?? "never"})`);
    return;
  }

  let failed = 0;
  for (const flow of flows.slice(0, limit)) {
    console.log(`▶ ${flow.name} — ${flow.start_url} [${flow.viewport}]`);
    try {
      const r = await executeAndPersist(db, flow, runsDir());
      console.log(`  ${r.diagnostics.status} in ${(r.diagnostics.duration_ms / 1000).toFixed(1)}s → ${r.replayUrl}`);
      if (r.diagnostics.status === "FAILED") failed++;
    } catch (err) {
      failed++;
      console.error(`  error running ${flow.id}: ${(err as Error).message}`);
    }
  }
  // Flow failures are reported via Slack/DB; the job itself only fails on infrastructure errors.
  console.log(`run-due: done, ${failed} failing flow(s).`);
  await runCleanup(db);
}

async function runCleanup(db: NonNullable<ReturnType<typeof supabaseFromEnv>>) {
  if (process.env.FLOWGUARD_SKIP_CLEANUP === "1") return;
  try {
    await cleanupStorage(db);
  } catch (err) {
    // Never fail the scheduled job over housekeeping; it retries next hour.
    console.warn(`cleanup: ${(err as Error).message}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
