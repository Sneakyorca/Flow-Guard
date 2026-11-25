/**
 * Run history in the shape the charts draw. Shared by the server (live data, aggregated
 * before it reaches the browser) and the client (demo data), so it must stay framework-free.
 */

export type RunOutcome = "pass" | "fail" | "flaky";

/** One run, reduced to what a chart needs. `t` is the start time in ms since epoch. */
export interface RunPoint { t: number; s: RunOutcome; ms: number | null }

/** One time slot of a chart. `t` is the slot's start; `ms` is the median run time, null if no runs. */
export interface Bucket { t: number; pass: number; fail: number; flaky: number; ms: number | null }

export type RangeKey = "24h" | "7d" | "30d";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** How each range is sliced: 24 hourly bars, 28 six-hour bars, 30 daily bars. */
export const RANGES: Record<RangeKey, { count: number; size: number; label: string; long: string }> = {
  "24h": { count: 24, size: HOUR, label: "24h", long: "last 24 hours" },
  "7d": { count: 28, size: 6 * HOUR, label: "7d", long: "last 7 days" },
  "30d": { count: 30, size: DAY, label: "30d", long: "last 30 days" },
};

export type RangeBuckets = Record<RangeKey, Bucket[]>;

/** Split runs into `count` slots of `size` ms ending at the slot that contains `now`. Oldest first. */
export function bucketize(points: RunPoint[], now: number, count: number, size: number): Bucket[] {
  // Align to slot boundaries so bars don't shift every minute (UTC hours/days).
  const end = Math.floor(now / size) * size + size;
  const start = end - count * size;
  const buckets: Bucket[] = Array.from({ length: count }, (_, i) => ({ t: start + i * size, pass: 0, fail: 0, flaky: 0, ms: null }));
  const durations: number[][] = Array.from({ length: count }, () => []);
  for (const p of points) {
    const i = Math.floor((p.t - start) / size);
    if (i < 0 || i >= count) continue;
    buckets[i][p.s] += 1;
    if (typeof p.ms === "number") durations[i].push(p.ms);
  }
  buckets.forEach((b, i) => { b.ms = median(durations[i]); });
  return buckets;
}

export function allRanges(points: RunPoint[], now: number): RangeBuckets {
  return {
    "24h": bucketize(points, now, RANGES["24h"].count, RANGES["24h"].size),
    "7d": bucketize(points, now, RANGES["7d"].count, RANGES["7d"].size),
    "30d": bucketize(points, now, RANGES["30d"].count, RANGES["30d"].size),
  };
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/** Totals for a set of buckets. A flaky run passed in the end, so it counts as passed. */
export function totals(buckets: Bucket[]) {
  let pass = 0, fail = 0, flaky = 0;
  const ms: number[] = [];
  for (const b of buckets) {
    pass += b.pass; fail += b.fail; flaky += b.flaky;
    if (b.ms !== null) ms.push(b.ms);
  }
  const runs = pass + fail + flaky;
  return { runs, pass, fail, flaky, passed: pass + flaky, rate: runs ? (pass + flaky) / runs : null, medianMs: median(ms) };
}

export function formatRate(rate: number | null): string {
  if (rate === null) return "–";
  const pct = Math.floor(rate * 1000) / 10; // floor: never round 99.96% up to 100%
  return `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1)}%`;
}

export function formatMs(ms: number | null): string {
  if (ms === null) return "–";
  return ms < 9_950 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms / 1000)}s`;
}

// ---------------------------------------------------------------------------
// Demo data: deterministic, so the server render and the browser agree.
// ---------------------------------------------------------------------------

/** Small seeded PRNG (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * 30 days of hourly sample runs for one demo flow. Shapes follow the flow's status:
 * a failing flow broke in the last two hours (and once 19 days ago), a slow one got slower,
 * the rest pass with the odd flaky run.
 */
export function demoPoints(flowId: string, status: string, baseMs: number, now: number): RunPoint[] {
  const r = rng(hash(flowId));
  const top = Math.floor(now / HOUR) * HOUR;
  const out: RunPoint[] = [];
  for (let h = 30 * 24 - 1; h >= 0; h--) {
    const t = top - h * HOUR + 7 * 60_000; // runs start at :07
    if (t > now) continue;
    let s: RunOutcome = r() < 0.004 ? "flaky" : "pass";
    if (status === "failed" && (h < 2 || (h >= 19 * 24 && h < 19 * 24 + 3))) s = "fail";
    const slow = status === "warning" ? 1 + Math.max(0, (72 - h) / 72) * 0.6 : 1;
    const ms = Math.round(baseMs * 1000 * slow * (0.85 + r() * 0.3) * (s === "fail" ? 1.6 : 1));
    out.push({ t, s, ms });
  }
  return out;
}
