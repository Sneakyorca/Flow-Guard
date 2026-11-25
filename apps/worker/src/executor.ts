import { mkdir, rm, writeFile } from "node:fs/promises";
import { fillPlaceholders, makePlaceholderValues } from "./placeholders.js";
import path from "node:path";
import type { Page } from "playwright";
import {
  RunDiagnostics,
  type ConsoleLog,
  type FlowStep,
  type NetworkError,
  type ResolvedStep,
  type StepResult,
  type Viewport,
} from "@flowguard/shared";
import { launchBrowser, newContext } from "./browser.js";
import { takeSnapshot } from "./snapshot.js";
import { explainFailure } from "./explain.js";
import { isNoiseConsole, isNoiseRequestFailure } from "./noise.js";
import type { Resolver } from "./resolvers/index.js";

export interface RunOptions {
  runId: string;
  startUrl: string;
  steps: FlowStep[];
  viewport: Viewport;
  resolver: Resolver;
  /** Directory for video.webm, failure.png, diagnostics.json */
  outDir: string;
  stepTimeoutMs?: number;
  log?: (msg: string) => void;
}

const DEFAULT_STEP_TIMEOUT = 10_000;

/** Run a plain-English flow end to end. Never throws for flow failures; returns diagnostics. */
export async function runFlow(opts: RunOptions): Promise<RunDiagnostics> {
  const { runId, startUrl, viewport, resolver, outDir } = opts;
  // Fresh {{random_email}} etc. for this attempt; the same value in every step.
  const values = makePlaceholderValues();
  const steps = opts.steps.map((s) => ({ ...s, instruction: fillPlaceholders(s.instruction, values) }));
  const timeout = opts.stepTimeoutMs ?? DEFAULT_STEP_TIMEOUT;
  const log = opts.log ?? (() => {});
  await mkdir(path.join(outDir, "steps"), { recursive: true });
  const videoTmp = path.join(outDir, ".video-tmp");

  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const consoleLogs: ConsoleLog[] = [];
  const networkErrors: NetworkError[] = [];
  const results: StepResult[] = [];
  let failedIndex: number | null = null;
  let errorMessage: string | null = null;
  let finalUrl: string | undefined;
  let screenshot: string | null = null;
  let videoPath: string | null = null;

  const browser = await launchBrowser();
  try {
    const context = await newContext(browser, viewport, videoTmp);
    context.setDefaultTimeout(timeout);
    const page = await context.newPage();
    const t = () => Date.now() - started;

    page.on("console", (msg) => {
      if ((msg.type() === "error" || msg.type() === "warning") && !isNoiseConsole(msg.type(), msg.text())) {
        const loc = msg.location();
        consoleLogs.push({ type: msg.type(), text: msg.text().slice(0, 2000), location: loc.url ? `${loc.url}:${loc.lineNumber}:${loc.columnNumber}` : undefined, at_ms: t() });
      }
    });
    page.on("pageerror", (err) => {
      consoleLogs.push({ type: "pageerror", text: `${err.name}: ${err.message}${err.stack ? `\n${err.stack.split("\n").slice(1, 6).join("\n")}` : ""}`.slice(0, 2000), at_ms: t() });
    });
    page.on("response", (res) => {
      if (res.status() >= 400) {
        networkErrors.push({ method: res.request().method(), url: res.url().slice(0, 500), status: res.status(), status_text: res.statusText(), resource_type: res.request().resourceType(), at_ms: t() });
      }
    });
    page.on("requestfailed", (req) => {
      const failure = req.failure()?.errorText ?? "failed";
      // Cancelled prefetches, media and beacons on navigation are noise (see noise.ts).
      if (isNoiseRequestFailure(req, failure)) return;
      networkErrors.push({ method: req.method(), url: req.url().slice(0, 500), status: null, failure, resource_type: req.resourceType(), at_ms: t() });
    });

    // Step 0: open the start URL (not counted as a user step).
    try {
      log(`→ open ${startUrl}`);
      const res = await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await settle(page);
      if (res && res.status() >= 400) {
        failedIndex = 0;
        errorMessage = `Start page returned ${res.status()} ${res.statusText()} for ${startUrl}`;
      }
    } catch (err) {
      failedIndex = 0;
      errorMessage = `Could not load start URL ${startUrl}: ${errMsg(err)}`;
    }

    for (let i = 0; i < steps.length; i++) {
      const instruction = steps[i].instruction;
      if (failedIndex !== null) {
        results.push({ index: i, instruction, status: "skipped", duration_ms: 0, actions: [], reasoning: "Skipped after an earlier failure.", attempts: 0, healed: false });
        continue;
      }
      const s0 = Date.now();
      const startedMs = s0 - started;
      const attempt = await attemptStep(page, resolver, instruction, timeout, log, i);
      if (!attempt.error) {
        results.push({ index: i, instruction, status: "passed", duration_ms: Date.now() - s0, actions: attempt.actions, reasoning: attempt.reasoning, attempts: attempt.attempts, healed: attempt.attempts > 1, started_ms: startedMs });
        log(`✓ step ${i + 1}: ${instruction} (${Date.now() - s0}ms)${attempt.attempts > 1 ? " [healed on retry]" : ""}`);
      } else {
        failedIndex = i;
        errorMessage = `Step ${i + 1} ("${instruction}") failed: ${attempt.error}`;
        results.push({ index: i, instruction, status: "failed", duration_ms: Date.now() - s0, actions: attempt.actions, reasoning: attempt.reasoning, error: attempt.error, attempts: attempt.attempts, healed: false, started_ms: startedMs });
        log(`✗ step ${i + 1}: ${attempt.error}`);
      }
      // Timeline: a small JPEG of the page right after each step (passed or failed).
      const shot = path.join("steps", `step-${String(i + 1).padStart(2, "0")}.jpg`);
      const ok = await page.screenshot({ path: path.join(outDir, shot), type: "jpeg", quality: 55 }).then(() => true, () => false);
      if (ok) results[results.length - 1].screenshot = shot.split(path.sep).join("/");
    }

    finalUrl = page.url();
    if (failedIndex !== null) {
      screenshot = path.join(outDir, "failure.png");
      await page.screenshot({ path: screenshot, fullPage: false }).catch(() => { screenshot = null; });
    }
    const video = page.video();
    await context.close();
    if (video) {
      videoPath = path.join(outDir, "video.webm");
      await video.saveAs(videoPath);
      await video.delete().catch(() => {});
    }
  } finally {
    await browser.close();
    await rm(videoTmp, { recursive: true, force: true }).catch(() => {});
  }

  const base = {
    run_id: runId,
    status: failedIndex === null ? "PASSING" : "FAILED",
    start_url: startUrl,
    final_url: finalUrl,
    viewport,
    resolver: resolver.name,
    started_at: startedAt,
    duration_ms: Date.now() - started,
    failed_step_index: failedIndex,
    error_message: errorMessage,
    steps: results,
    console_logs: consoleLogs,
    network_errors: networkErrors,
    artifacts: { video: videoPath, failure_screenshot: screenshot },
  };
  const diagnostics = RunDiagnostics.parse({ ...base, explanation: explainFailure(RunDiagnostics.parse(base)) });
  await writeFile(path.join(outDir, "diagnostics.json"), JSON.stringify(diagnostics, null, 2));
  return diagnostics;
}

interface Attempt {
  actions: ResolvedStep[];
  reasoning: string;
  attempts: number;
  error?: string;
}

/**
 * Resolve and run one step. If an action (not an assertion) fails, heal once:
 * wait briefly, take a fresh snapshot, and re-resolve with the error and the
 * element that didn't work excluded. Assertions are not retried: if the text
 * isn't there after the full timeout, a second look won't change that.
 */
async function attemptStep(page: Page, resolver: Resolver, instruction: string, timeout: number, log: (m: string) => void, i: number): Promise<Attempt> {
  let previousError: string | undefined;
  const excludeIds: string[] = [];
  const history: ResolvedStep[] = [];
  const reasons: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    let failedAction: ResolvedStep | undefined;
    try {
      const nodes = await takeSnapshot(page);
      const plan = await resolver.resolve({ instruction, nodes, url: page.url(), title: await page.title(), previousError, excludeIds: excludeIds.length ? [...excludeIds] : undefined });
      history.push(...plan.actions);
      reasons.push((attempt > 1 ? "[retry] " : "") + plan.actions.map((a) => a.reasoning).join(" "));
      for (const a of plan.actions) {
        failedAction = a;
        log(`  [${i + 1}${attempt > 1 ? " retry" : ""}] ${a.action}${a.target_id ? ` #${a.target_id}` : ""}${a.value ? ` "${a.value}"` : ""}`);
        await execute(page, a, timeout);
      }
      return { actions: history, reasoning: reasons.join(" "), attempts: attempt };
    } catch (err) {
      const msg = errMsg(err);
      const isAssertion = failedAction?.action === "assert_text" || failedAction?.action === "assert_url";
      // A URL that answers 404/500 will answer the same a second later: no point healing.
      const isMissingPage = failedAction?.action === "navigate" && /returned [45]\d\d/.test(msg);
      if (attempt === 2 || isAssertion || isMissingPage) {
        return { actions: history, reasoning: reasons.join(" "), attempts: attempt, error: attempt === 2 && previousError && previousError !== msg ? `${msg} (first attempt: ${previousError})` : msg };
      }
      previousError = msg;
      if (failedAction?.target_id) excludeIds.push(failedAction.target_id);
      log(`  [${i + 1}] attempt failed (${msg.slice(0, 120)}); re-snapshotting and re-resolving once`);
      await page.waitForTimeout(1_000);
      await settle(page);
    }
  }
  return { actions: history, reasoning: reasons.join(" "), attempts: 2, error: previousError };
}

async function settle(page: Page) {
  await page.waitForLoadState("load", { timeout: 8_000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {});
}

function errMsg(err: unknown): string {
  // Strip ANSI colour codes Playwright adds to its call logs.
  const m = (err instanceof Error ? err.message : String(err)).replace(/\x1b\[[0-9;]*m/g, "");
  // Playwright messages include a long call log; keep the first lines.
  return m.split("\n").filter(Boolean).slice(0, 3).join(" | ").slice(0, 600);
}

function coords(s: string | null): { x: number; y: number } | null {
  const m = s?.match(/^\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*$/);
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
}

/** Execute one resolved action. Throws with a readable message on failure. */
export async function execute(page: Page, a: ResolvedStep, timeout: number): Promise<void> {
  const xy = coords(a.selector_or_coordinates);
  const locator = a.selector_or_coordinates && !xy ? page.locator(a.selector_or_coordinates).first() : null;

  switch (a.action) {
    case "click": {
      if (xy) await page.mouse.click(xy.x, xy.y);
      else if (locator) await locator.click({ timeout });
      else throw new Error("click needs a target element");
      await settle(page);
      return;
    }
    case "fill": {
      if (!locator) throw new Error("fill needs a target element");
      await locator.fill(a.value ?? "", { timeout });
      return;
    }
    case "press": {
      const key = a.value || "Enter";
      if (locator) await locator.press(key, { timeout });
      else await page.keyboard.press(key);
      await settle(page);
      return;
    }
    case "navigate": {
      if (!a.value) throw new Error("navigate needs a URL");
      const target = new URL(a.value, page.url()).toString();
      const res = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await settle(page);
      // A 404/500 page still "loads"; treat it as the step failing, not as a pass.
      if (res && res.status() >= 400) {
        throw new Error(`Page ${target} returned ${res.status()}${res.statusText() ? ` ${res.statusText()}` : ""}`);
      }
      return;
    }
    case "assert_text": {
      const text = a.value ?? "";
      if (!text) throw new Error("assert_text needs text to look for");
      try {
        await page.waitForFunction(
          (t) => (document.body?.innerText ?? "").toLowerCase().includes(t.toLowerCase()),
          text,
          { timeout },
        );
      } catch {
        throw new Error(`Expected text "${text}" to be visible on ${page.url()} but it never appeared within ${timeout}ms`);
      }
      return;
    }
    case "assert_url": {
      const frag = a.value ?? "";
      try {
        await page.waitForURL((u) => u.href.includes(frag), { timeout });
      } catch {
        throw new Error(`Expected URL to contain "${frag}" but it is ${page.url()}`);
      }
      return;
    }
  }
}
