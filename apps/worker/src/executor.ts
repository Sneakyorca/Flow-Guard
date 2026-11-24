import { mkdir, rm, writeFile } from "node:fs/promises";
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
  const { runId, startUrl, steps, viewport, resolver, outDir } = opts;
  const timeout = opts.stepTimeoutMs ?? DEFAULT_STEP_TIMEOUT;
  const log = opts.log ?? (() => {});
  await mkdir(outDir, { recursive: true });
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
      if (msg.type() === "error" || msg.type() === "warning") {
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
      // Aborted media/beacon requests on navigation are noise.
      if (/ERR_ABORTED/.test(failure) && ["media", "ping", "beacon"].includes(req.resourceType())) return;
      networkErrors.push({ method: req.method(), url: req.url().slice(0, 500), status: null, failure, resource_type: req.resourceType(), at_ms: t() });
    });

    // Step 0: open the start URL (not counted as a user step).
    try {
      log(`→ open ${startUrl}`);
      await page.goto(startUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await settle(page);
    } catch (err) {
      failedIndex = 0;
      errorMessage = `Could not load start URL ${startUrl}: ${errMsg(err)}`;
    }

    for (let i = 0; i < steps.length; i++) {
      const instruction = steps[i].instruction;
      if (failedIndex !== null) {
        results.push({ index: i, instruction, status: "skipped", duration_ms: 0, actions: [], reasoning: "Skipped after an earlier failure." });
        continue;
      }
      const s0 = Date.now();
      let actions: ResolvedStep[] = [];
      try {
        const nodes = await takeSnapshot(page);
        const plan = await resolver.resolve({ instruction, nodes, url: page.url(), title: await page.title() });
        actions = plan.actions;
        for (const a of actions) {
          log(`  [${i + 1}] ${a.action}${a.target_id ? ` #${a.target_id}` : ""}${a.value ? ` "${a.value}"` : ""}`);
          await execute(page, a, timeout);
        }
        results.push({ index: i, instruction, status: "passed", duration_ms: Date.now() - s0, actions, reasoning: actions.map((a) => a.reasoning).join(" ") });
        log(`✓ step ${i + 1}: ${instruction} (${Date.now() - s0}ms)`);
      } catch (err) {
        failedIndex = i;
        errorMessage = `Step ${i + 1} ("${instruction}") failed: ${errMsg(err)}`;
        results.push({ index: i, instruction, status: "failed", duration_ms: Date.now() - s0, actions, reasoning: actions.map((a) => a.reasoning).join(" "), error: errMsg(err) });
        log(`✗ step ${i + 1}: ${errMsg(err)}`);
      }
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

  const diagnostics = RunDiagnostics.parse({
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
  });
  await writeFile(path.join(outDir, "diagnostics.json"), JSON.stringify(diagnostics, null, 2));
  return diagnostics;
}

async function settle(page: Page) {
  await page.waitForLoadState("load", { timeout: 8_000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {});
}

function errMsg(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
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
      await page.goto(new URL(a.value, page.url()).toString(), { waitUntil: "domcontentloaded", timeout: 30_000 });
      await settle(page);
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
