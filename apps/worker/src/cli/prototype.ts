/**
 * Standalone prototype: run a plain-English flow against a live URL.
 *
 *   npm run prototype
 *   npm run prototype -- --url https://demo.playwright.dev/todomvc --steps "Type \"Buy milk\" into the new todo input and press Enter | Assert \"Buy milk\" is in the list | Click the \"Active\" filter" --viewport desktop
 *
 * Options: --timeout <seconds per action> (default 10), --resolver heuristic|gemini|groq|anthropic,
 *          --retries 1 (re-run a failed flow once to detect flakes; the scheduler does this by default)
 * Steps are separated by "|" or newlines (or use --steps-file steps.txt).
 * Output: runs/<runId>/video.webm, diagnostics.json and failure.png (on failure).
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Viewport, parseSteps } from "@flowguard/shared";
import { runFlowConfirmed } from "../confirm.js";
import { getResolver } from "../resolvers/index.js";
import { loadDotEnv, newRunId, parseArgs, runsDir } from "./common.js";

export const DEMO_URL = "https://demo.playwright.dev/todomvc";
export const DEMO_STEPS = [
  'Type "Buy milk" into the new todo input and press Enter',
  'Assert "Buy milk" is in the list',
  'Click the "Active" filter',
].join("\n");

async function main() {
  loadDotEnv();
  const args = parseArgs();
  if (args.help) {
    console.log(readFileSync(new URL(import.meta.url), "utf8").split("*/")[0]);
    return;
  }
  const url = typeof args.url === "string" ? args.url : DEMO_URL;
  const stepsText = typeof args["steps-file"] === "string" ? readFileSync(args["steps-file"], "utf8") : typeof args.steps === "string" ? args.steps : DEMO_STEPS;
  const steps = parseSteps(stepsText);
  const viewport = Viewport.parse(typeof args.viewport === "string" ? args.viewport : "desktop");
  const resolver = getResolver(typeof args.resolver === "string" ? args.resolver : undefined);
  const runId = newRunId();
  const outDir = path.join(runsDir(), runId);

  console.log(`Oluso prototype · run ${runId}`);
  console.log(`url=${url} viewport=${viewport} resolver=${resolver.name} steps=${steps.length}`);
  const d = await runFlowConfirmed({ runId, startUrl: url, steps, viewport, resolver, outDir, stepTimeoutMs: typeof args.timeout === "string" ? Number(args.timeout) * 1000 : undefined, log: (m) => console.log(m) }, typeof args.retries === "string" ? Number(args.retries) : 0);

  console.log("");
  console.log(`${d.status === "PASSING" ? "PASSING" : "FAILED"}${d.flaky ? " (flaky: failed first, passed on re-run)" : d.attempts > 1 ? " (confirmed on re-run)" : ""} in ${(d.duration_ms / 1000).toFixed(1)}s`);
  for (const s of d.steps) console.log(`  ${s.status.padEnd(7)} ${String(s.duration_ms).padStart(5)}ms  ${s.index + 1}. ${s.instruction}`);
  if (d.error_message) console.log(`  error: ${d.error_message}`);
  if (d.explanation) {
    console.log(`  why:   ${d.explanation.title}. ${d.explanation.detail}`);
    console.log(`  fix:   ${d.explanation.suggestion}`);
    for (const e of d.explanation.evidence) console.log(`         · ${e}`);
  }
  console.log(`  console errors: ${d.console_logs.length} · network errors: ${d.network_errors.length}`);
  console.log(`  diagnostics: ${path.join(outDir, "diagnostics.json")}`);
  if (d.artifacts.video) console.log(`  video:       ${d.artifacts.video}`);
  if (d.artifacts.failure_screenshot) console.log(`  screenshot:  ${d.artifacts.failure_screenshot}`);
  process.exitCode = d.status === "PASSING" ? 0 : 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 2;
});
