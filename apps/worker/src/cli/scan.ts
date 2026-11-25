/**
 * Free instant site scan (60s budget).
 *
 *   npm run scan -- --url https://books.toscrape.com
 *   npm run scan -- --url https://example.com --budget 60 --pages 15 --external
 *
 * Output: runs/<scanId>/report.json and video.webm (homepage on a mobile viewport).
 */
import path from "node:path";
import { scanSite } from "../scanner.js";
import { loadDotEnv, newRunId, parseArgs, runsDir } from "./common.js";

async function main() {
  loadDotEnv();
  const args = parseArgs();
  if (typeof args.url !== "string") {
    console.error("Usage: npm run scan -- --url https://yoursite.com [--budget 60] [--pages 15] [--external]");
    process.exitCode = 2;
    return;
  }
  const scanId = newRunId("scan");
  const outDir = path.join(runsDir(), scanId);
  const budgetMs = (typeof args.budget === "string" ? Number(args.budget) : 60) * 1000;
  const maxPages = typeof args.pages === "string" ? Number(args.pages) : 15;
  console.log(`Oluso free scan · ${scanId} · ${args.url} · budget ${budgetMs / 1000}s`);
  const r = await scanSite({ scanId, url: args.url, outDir, budgetMs, maxPages, checkExternal: args.external === true, log: (m) => console.log(`  ${m}`) });
  console.log("");
  console.log(`Score ${r.score}/100 — ${r.summary} (${(r.duration_ms / 1000).toFixed(1)}s)`);
  for (const b of r.broken_links.slice(0, 10)) console.log(`  broken  ${b.status ?? "ERR"} ${b.url}  (on ${b.found_on})`);
  for (const o of r.mobile_overflow.slice(0, 5)) console.log(`  overflow ${o.scroll_width}px > ${o.viewport_width}px on ${o.page}: ${o.offenders.join(", ")}`);
  for (const c of r.console_errors.slice(0, 5)) console.log(`  js      ${c.type}${c.count > 1 ? ` ×${c.count} pages` : ""} (first on ${c.page}): ${c.text.slice(0, 140)}`);
  console.log(`  report: ${path.join(outDir, "report.json")}`);
  if (r.video) console.log(`  video:  ${r.video}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 2;
});
