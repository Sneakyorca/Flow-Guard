/**
 * Run one queued public scan (used by .github/workflows/scan.yml).
 *
 *   npm run scan-one -w @flowguard/worker -- --scan <public_scans.id>
 *
 * Marks the row running, re-checks the address is public (DNS, against SSRF), runs the
 * 60-second scan with requests to private networks blocked, uploads the homepage video to
 * replays/scans/<id>/video.webm, and stores report_json + score. Errors end as status=error.
 */
import { lookup } from "node:dns/promises";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { checkScanUrl, isPrivateIp } from "@flowguard/shared";
import { REPLAYS_BUCKET, supabaseFromEnv } from "../persist.js";
import { scanSite } from "../scanner.js";
import { loadDotEnv, parseArgs, runsDir } from "./common.js";

async function main() {
  loadDotEnv();
  const args = parseArgs();
  const id = typeof args.scan === "string" ? args.scan : "";
  const db = supabaseFromEnv();
  if (!db || !id) {
    console.log("scan-one: needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and --scan <id>; nothing to do.");
    return;
  }
  const { data: row, error } = await db.from("public_scans").select("id, url, status").eq("id", id).maybeSingle();
  if (error || !row) throw new Error(`scan ${id} not found: ${error?.message ?? "no row"}`);
  if (row.status !== "queued") {
    console.log(`scan-one: ${id} is already ${row.status}; skipping.`);
    return;
  }
  const fail = async (message: string) => {
    console.log(`scan-one: ${message}`);
    await db.from("public_scans").update({ status: "error", report_json: { error: message } }).eq("id", id);
  };

  await db.from("public_scans").update({ status: "running" }).eq("id", id);
  const checked = checkScanUrl(row.url);
  if (!checked.ok) return fail(checked.reason);
  try {
    const addrs = await lookup(checked.host, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) return fail("That address isn’t on the public internet.");
  } catch {
    return fail(`Couldn’t find ${checked.host}. Check the address is spelled right.`);
  }

  const outDir = path.join(runsDir(), `scan-${id}`);
  console.log(`scan-one: ${id} · ${checked.url}`);
  try {
    const r = await scanSite({ scanId: id, url: checked.url, outDir, budgetMs: 60_000, maxPages: 15, blockPrivateNetwork: true, log: (m) => console.log(`  ${m}`) });
    let videoPath: string | null = null;
    if (r.video) {
      const key = `scans/${id}/video.webm`;
      const { error: upErr } = await db.storage.from(REPLAYS_BUCKET).upload(key, await readFile(r.video), { contentType: "video/webm", upsert: true });
      if (upErr) console.warn(`  video upload failed: ${upErr.message}`);
      else videoPath = key;
    }
    const { error: saveErr } = await db.from("public_scans").update({ status: "done", score: r.score, report_json: { ...r, video: null }, video_url: videoPath }).eq("id", id);
    if (saveErr) throw new Error(saveErr.message);
    console.log(`scan-one: done, score ${r.score}/100 (${(r.duration_ms / 1000).toFixed(1)}s)`);
  } catch (err) {
    await fail(`The scan couldn’t finish: ${(err as Error).message.split("\n")[0].slice(0, 200)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
