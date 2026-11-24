import path from "node:path";
import { readdir, rename, rm, writeFile } from "node:fs/promises";
import type { RunDiagnostics } from "@flowguard/shared";
import { runFlow, type RunOptions } from "./executor.js";

/**
 * Flakiness detection: when a run fails, run the whole flow again once before believing it.
 * - fail, then pass → PASSING with flaky=true (recorded, no alert)
 * - fail, then fail → FAILED with attempts=2 (alert)
 * The first attempt's artifacts are kept in `<outDir>/attempt-1/`.
 */
export async function runFlowConfirmed(opts: RunOptions, retries = Number(process.env.FLOWGUARD_RETRY_ON_FAILURE ?? 1)): Promise<RunDiagnostics> {
  const firstDir = retries > 0 ? path.join(opts.outDir, "attempt-1") : opts.outDir;
  const first = await runFlow({ ...opts, outDir: firstDir });
  if (first.status === "PASSING" || retries <= 0) {
    if (retries > 0) return finalize(await moveUp(first, opts), opts.outDir);
    return first;
  }
  opts.log?.(`↻ first attempt failed (${first.error_message?.slice(0, 120)}); re-running once to rule out a flake`);
  const second = await runFlow(opts);
  const merged: RunDiagnostics = {
    ...second,
    attempts: 2,
    flaky: second.status === "PASSING",
    first_attempt_error: first.error_message,
  };
  return finalize(merged, opts.outDir);
}

/** The first attempt passed: move its files from attempt-1/ up into the run folder. */
async function moveUp(d: RunDiagnostics, opts: RunOptions): Promise<RunDiagnostics> {
  const from = path.join(opts.outDir, "attempt-1");
  // Move the passing attempt's files up one level so the run folder looks the same either way.
  for (const f of await readdir(from)) await rename(path.join(from, f), path.join(opts.outDir, f));
  await rm(from, { recursive: true, force: true });
  const fix = (p: string | null) => (p ? path.join(opts.outDir, path.basename(p)) : null);
  return { ...d, artifacts: { video: fix(d.artifacts.video), failure_screenshot: fix(d.artifacts.failure_screenshot) } };
}

async function finalize(d: RunDiagnostics, outDir: string): Promise<RunDiagnostics> {
  await writeFile(path.join(outDir, "diagnostics.json"), JSON.stringify(d, null, 2));
  return d;
}
