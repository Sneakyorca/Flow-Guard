import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BrowserContext, Page } from "playwright";
import { ScanReport, VIEWPORTS, type BrokenLink, type OverflowIssue, type ScanConsoleError } from "@flowguard/shared";
import { launchBrowser, newContext } from "./browser.js";

export interface ScanOptions {
  scanId: string;
  url: string;
  outDir: string;
  budgetMs?: number;
  maxPages?: number;
  maxLinks?: number;
  /** Also check links to other domains (off by default: slower, and third parties often block bots). */
  checkExternal?: boolean;
  log?: (msg: string) => void;
}

const SKIP_EXT = /\.(pdf|zip|png|jpe?g|gif|webp|svg|mp4|webm|mp3|dmg|exe|docx?|xlsx?|pptx?)(\?|$)/i;

function normalize(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Free instant scan: within a fixed time budget, crawl same-origin pages on a mobile viewport,
 * record uncaught errors, horizontal overflow and broken links, plus a short video of the homepage.
 */
export async function scanSite(opts: ScanOptions): Promise<ScanReport> {
  const budget = opts.budgetMs ?? 60_000;
  const maxPages = opts.maxPages ?? 15;
  const maxLinks = opts.maxLinks ?? 120;
  const log = opts.log ?? (() => {});
  const started = Date.now();
  const deadline = started + budget;
  const left = () => deadline - Date.now();
  const startUrl = normalize(opts.url, opts.url);
  if (!startUrl) throw new Error(`Not an http(s) URL: ${opts.url}`);
  const origin = new URL(startUrl).origin;

  await mkdir(opts.outDir, { recursive: true });
  const videoTmp = path.join(opts.outDir, ".video-tmp");

  const pages: ScanReport["pages_scanned"] = [];
  const consoleErrors: ScanConsoleError[] = [];
  const overflow: OverflowIssue[] = [];
  const broken: BrokenLink[] = [];
  const linkSources = new Map<string, string>(); // url -> first page it was found on
  const statusByUrl = new Map<string, number | null>();
  let videoPath: string | null = null;

  const browser = await launchBrowser();
  try {
    // 1) Homepage on mobile with video (the "replay" a prospect sees in the report).
    const vctx = await newContext(browser, "mobile", videoTmp);
    const vpage = await vctx.newPage();
    try {
      await vpage.goto(startUrl, { waitUntil: "domcontentloaded", timeout: Math.min(20_000, left()) });
      await vpage.waitForLoadState("load", { timeout: 5_000 }).catch(() => {});
      await slowScroll(vpage, Math.min(6_000, Math.max(0, left() - 45_000)));
    } catch (err) {
      log(`homepage video: ${(err as Error).message.split("\n")[0]}`);
    }
    const video = vpage.video();
    await vctx.close();
    if (video) {
      videoPath = path.join(opts.outDir, "video.webm");
      await video.saveAs(videoPath).catch(() => { videoPath = null; });
      await video.delete().catch(() => {});
    }

    // 2) Same-origin crawl on mobile viewport.
    const ctx = await newContext(browser, "mobile");
    const queue: string[] = [startUrl];
    const queued = new Set(queue);
    while (queue.length && pages.length < maxPages && left() > 8_000) {
      const url = queue.shift()!;
      const result = await visit(ctx, url, Math.min(15_000, left() - 5_000), consoleErrors);
      pages.push({ url, status: result.status, load_ms: result.loadMs });
      statusByUrl.set(url, result.status);
      log(`page ${pages.length}: ${result.status ?? "ERR"} ${url} (${result.loadMs}ms, ${result.links.length} links)`);
      if (result.status !== null && result.status >= 400) {
        broken.push({ url, status: result.status, found_on: linkSources.get(url) ?? "(start URL)" });
      } else if (result.status === null) {
        broken.push({ url, status: null, found_on: linkSources.get(url) ?? "(start URL)", error: result.error });
      }
      if (result.overflow) overflow.push({ page: url, ...result.overflow });
      for (const href of result.links) {
        const n = normalize(href, url);
        if (!n) continue;
        if (!linkSources.has(n)) linkSources.set(n, url);
        if (n.startsWith(origin) && !queued.has(n) && !SKIP_EXT.test(n)) {
          queued.add(n);
          queue.push(n);
        }
      }
    }

    // 3) Check links we did not visit as pages (HEAD, falling back to GET).
    const toCheck = [...linkSources.keys()]
      .filter((u) => !statusByUrl.has(u))
      .filter((u) => opts.checkExternal || u.startsWith(origin))
      .slice(0, maxLinks);
    log(`checking ${toCheck.length} more links`);
    let i = 0;
    const worker = async () => {
      while (i < toCheck.length && left() > 2_000) {
        const u = toCheck[i++];
        const r = await checkLink(ctx, u, Math.min(8_000, left() - 1_000));
        statusByUrl.set(u, r.status);
        if (r.status === null || r.status >= 400) broken.push({ url: u, status: r.status, found_on: linkSources.get(u)!, error: r.error });
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    await ctx.close();
  } finally {
    await browser.close();
    await rm(videoTmp, { recursive: true, force: true }).catch(() => {});
  }

  const score = Math.max(
    0,
    100 - Math.min(40, broken.length * 10) - Math.min(30, overflow.length * 10) - Math.min(30, consoleErrors.length * 5),
  );
  const parts = [
    `${pages.length} page${pages.length === 1 ? "" : "s"} scanned`,
    broken.length ? `${broken.length} broken link${broken.length === 1 ? "" : "s"}` : "no broken links",
    overflow.length ? `${overflow.length} page${overflow.length === 1 ? "" : "s"} overflow on mobile` : "no mobile overflow",
    consoleErrors.length ? `${consoleErrors.length} uncaught JS error${consoleErrors.length === 1 ? "" : "s"}` : "no JS errors",
  ];
  const report = ScanReport.parse({
    scan_id: opts.scanId,
    url: startUrl,
    started_at: new Date(started).toISOString(),
    duration_ms: Date.now() - started,
    budget_ms: budget,
    pages_scanned: pages,
    links_checked: statusByUrl.size,
    broken_links: broken,
    mobile_overflow: overflow,
    console_errors: consoleErrors,
    score,
    summary: parts.join(" · "),
    video: videoPath,
  });
  await writeFile(path.join(opts.outDir, "report.json"), JSON.stringify(report, null, 2));
  return report;
}

async function slowScroll(page: Page, ms: number) {
  if (ms <= 0) return;
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const done = await page.evaluate(() => {
      window.scrollBy(0, Math.round(window.innerHeight * 0.6));
      return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    }).catch(() => true);
    if (done) break;
    await page.waitForTimeout(400);
  }
}

async function visit(ctx: BrowserContext, url: string, timeout: number, consoleErrors: ScanConsoleError[]) {
  const page = await ctx.newPage();
  const t0 = Date.now();
  const onConsole = (msg: import("playwright").ConsoleMessage) => {
    if (msg.type() === "error") consoleErrors.push({ page: url, type: "console.error", text: msg.text().slice(0, 500) });
  };
  const onPageError = (err: Error) => consoleErrors.push({ page: url, type: "uncaught", text: `${err.name}: ${err.message}`.slice(0, 500) });
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: Math.max(1_000, timeout) });
    await page.waitForLoadState("load", { timeout: 4_000 }).catch(() => {});
    const loadMs = Date.now() - t0;
    const status = res?.status() ?? null;
    const isHtml = (res?.headers()["content-type"] ?? "text/html").includes("html");
    if (!isHtml) return { status, loadMs, links: [] as string[], overflow: null };
    const data = await page.evaluate((vw: number) => {
      const links = Array.from(document.querySelectorAll("a[href]"), (a) => (a as HTMLAnchorElement).href);
      const sw = document.documentElement.scrollWidth;
      let offenders: string[] = [];
      if (sw > window.innerWidth + 1) {
        offenders = Array.from(document.querySelectorAll("body *"))
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.right > window.innerWidth + 1 && getComputedStyle(el).position !== "fixed";
          })
          // keep outermost offenders only
          .filter((el, _i, all) => !all.some((o) => o !== el && o.contains(el)))
          .slice(0, 5)
          .map((el) => {
            const id = el.id ? `#${el.id}` : "";
            const cls = typeof el.className === "string" && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "";
            return `${el.tagName.toLowerCase()}${id}${cls} (right edge ${Math.round(el.getBoundingClientRect().right)}px)`;
          });
      }
      return { links, overflow: sw > window.innerWidth + 1 ? { scroll_width: sw, viewport_width: vw, offenders } : null };
    }, VIEWPORTS.mobile.width);
    return { status, loadMs, ...data };
  } catch (err) {
    return { status: null, loadMs: Date.now() - t0, links: [] as string[], overflow: null, error: (err as Error).message.split("\n")[0] };
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
    await page.close().catch(() => {});
  }
}

async function checkLink(ctx: BrowserContext, url: string, timeout: number): Promise<{ status: number | null; error?: string }> {
  try {
    let res = await ctx.request.head(url, { timeout, maxRedirects: 5, failOnStatusCode: false });
    if ([403, 405, 501].includes(res.status())) {
      res = await ctx.request.get(url, { timeout, maxRedirects: 5, failOnStatusCode: false });
    }
    return { status: res.status() };
  } catch (err) {
    return { status: null, error: (err as Error).message.split("\n")[0] };
  }
}
