/**
 * Tiny 5-field cron matcher (minute hour day-of-month month day-of-week), UTC.
 * Supports *, numbers, ranges (a-b), steps (*\/n, a-b/n) and lists (a,b).
 * Enough to decide "is this flow due?" without another dependency.
 */

function parseField(field: string, min: number, max: number): Set<number> {
  const out = new Set<number>();
  for (const part of field.split(",")) {
    const [range, stepStr] = part.split("/");
    const step = stepStr ? Number(stepStr) : 1;
    let lo = min;
    let hi = max;
    if (range !== "*") {
      const [a, b] = range.split("-").map(Number);
      lo = a;
      hi = b ?? (stepStr ? max : a);
    }
    if (![lo, hi, step].every(Number.isFinite) || step < 1) throw new Error(`Bad cron field "${field}"`);
    for (let v = lo; v <= hi; v += step) out.add(v);
  }
  return out;
}

export interface Cron {
  matches(d: Date): boolean;
}

export function parseCron(expr: string): Cron {
  const aliases: Record<string, string> = { "@hourly": "0 * * * *", "@daily": "0 0 * * *", "@weekly": "0 0 * * 0" };
  const fields = (aliases[expr.trim()] ?? expr).trim().split(/\s+/);
  if (fields.length !== 5) throw new Error(`Cron needs 5 fields: "${expr}"`);
  const [mi, h, dom, mo, dow] = [
    parseField(fields[0], 0, 59),
    parseField(fields[1], 0, 23),
    parseField(fields[2], 1, 31),
    parseField(fields[3], 1, 12),
    parseField(fields[4], 0, 7),
  ];
  if (dow.has(7)) dow.add(0);
  const domStar = fields[2] === "*";
  const dowStar = fields[4] === "*";
  return {
    matches(d: Date) {
      if (!mi.has(d.getUTCMinutes()) || !h.has(d.getUTCHours()) || !mo.has(d.getUTCMonth() + 1)) return false;
      const domOk = dom.has(d.getUTCDate());
      const dowOk = dow.has(d.getUTCDay());
      // Standard cron: if both day fields are restricted, either may match.
      return domStar || dowStar ? domOk && dowOk : domOk || dowOk;
    },
  };
}

/** Most recent time at or before `now` that matches the cron (searches back up to 35 days). */
export function previousOccurrence(expr: string, now = new Date()): Date | null {
  const cron = parseCron(expr);
  const d = new Date(now);
  d.setUTCSeconds(0, 0);
  for (let i = 0; i < 35 * 24 * 60; i++) {
    if (cron.matches(d)) return d;
    d.setUTCMinutes(d.getUTCMinutes() - 1);
  }
  return null;
}

/**
 * A flow is due if it never ran, or a scheduled time has passed since its last run.
 * GitHub Actions cron can start late, so "missed" occurrences still trigger a run.
 */
export function isDue(expr: string | null, lastRunAt: string | null | undefined, now = new Date()): boolean {
  if (!expr) return false;
  if (!lastRunAt) return true;
  const prev = previousOccurrence(expr, now);
  return prev !== null && prev.getTime() > new Date(lastRunAt).getTime();
}
