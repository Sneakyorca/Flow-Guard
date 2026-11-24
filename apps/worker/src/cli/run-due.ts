/**
 * Zero-cost scheduler entry point (used by .github/workflows/scheduled-runs.yml).
 *
 *   npm run run-due -w @flowguard/worker                # run every flow whose cron is due
 *   npm run run-due -w @flowguard/worker -- --flow <id> # run one flow now (webhook/manual)
 *   npm run run-due -w @flowguard/worker -- --dry-run   # list due flows only
 *
 * Needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. Without them it exits 0 with a notice,
 * so forks and fresh clones don't get red scheduled builds.
 */
import { isDue } from "../cron.js";
import { executeAndPersist, loadActiveFlows, loadFlow, supabaseFromEnv } from "../persist.js";
import { loadDotEnv, parseArgs, runsDir } from "./common.js";

async function main() {
  loadDotEnv();
  const args = parseArgs();
  const db = supabaseFromEnv();
  if (!db) {
    console.log("run-due: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — nothing to do (skipping).");
    return;
  }

  const flows = typeof args.flow === "string" ? [await loadFlow(db, args.flow)] : (await loadActiveFlows(db)).filter((f) => isDue(f.schedule_cron, f.last_run_at));
  const limit = Number(process.env.FLOWGUARD_MAX_RUNS_PER_TICK || 20);
  console.log(`run-due: ${flows.length} flow(s) due${flows.length > limit ? `, running first ${limit}` : ""}`);
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
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
