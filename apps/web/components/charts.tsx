"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { formatMs, type Bucket } from "@/lib/runs-data";

/*
 * Hand-rolled SVG charts (no chart library). Rules, from docs/research/design.md:
 * - colour means state only: green passed, red failed, amber hatched = flaky (passed on retry).
 *   Flaky also carries a texture and failures sit on top of each bar, so the
 *   red/amber pair never relies on colour alone.
 * - every value is reachable three ways: hover, keyboard (focus the chart, then ← →), and a
 *   visually hidden table for screen readers.
 * - geometry is computed in real pixels (ResizeObserver) so gaps stay 2px on any screen.
 */

const H = 120;

function useWidth<T extends HTMLElement>(fallback = 600) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(120, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

/** Shared hover/keyboard behaviour: which slot is active, and the handlers that move it. */
function useScrub(n: number) {
  const [i, setI] = useState<number | null>(null);
  const fromPointer = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setI(Math.min(n - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * n))));
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const move: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
    if (e.key in move) {
      e.preventDefault();
      setI((c) => Math.min(n - 1, Math.max(0, (c ?? n - 1) + move[e.key])));
    } else if (e.key === "Home") { e.preventDefault(); setI(0); }
    else if (e.key === "End") { e.preventDefault(); setI(n - 1); }
    else if (e.key === "Escape") setI(null);
  };
  return {
    i,
    handlers: {
      tabIndex: 0,
      onPointerMove: fromPointer,
      onPointerDown: fromPointer,
      onPointerLeave: () => setI(null),
      onFocus: () => setI((c) => c ?? n - 1),
      onBlur: () => setI(null),
      onKeyDown,
    },
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Readable label for one slot. Local time in the browser (tooltips), UTC on the server (tables). */
export function slotLabel(t: number, size: number, utc = false): string {
  const d = new Date(t);
  const e = new Date(t + size);
  const day = (x: Date) => x.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", ...(utc ? { timeZone: "UTC" } : {}) });
  const hm = (x: Date) => (utc ? `${pad(x.getUTCHours())}:00` : `${pad(x.getHours())}:00`);
  const z = utc ? " UTC" : "";
  if (size >= 86_400_000) return `${day(d)}${z}`;
  return `${day(d)}, ${hm(d)}–${hm(e)}${z}`;
}

function runsLine(b: Bucket): string {
  const total = b.pass + b.fail + b.flaky;
  if (!total) return "No runs";
  const parts = [`${b.pass + b.flaky} passed`];
  if (b.fail) parts.push(`${b.fail} failed`);
  if (b.flaky) parts.push(`${b.flaky} flaky`);
  return `${total} run${total === 1 ? "" : "s"}: ${parts.join(", ")}`;
}

function Tooltip({ i, n, children }: { i: number | null; n: number; children: ReactNode }) {
  if (i === null) return null;
  const x = ((i + 0.5) / n) * 100;
  // Keep the box inside the chart: anchor left near the start, right near the end.
  const align = x < 20 ? "0%" : x > 80 ? "-100%" : "-50%";
  return <div className="chart-tip" style={{ left: `${x}%`, transform: `translateX(${align})` }}>{children}</div>;
}

function Hatch({ id }: { id: string }) {
  return (
    <pattern id={id} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="5" height="5" fill="var(--warn)" opacity="0.35" />
      <line x1="0" y1="0" x2="0" y2="5" stroke="var(--warn)" strokeWidth="2.5" />
    </pattern>
  );
}

export function ChartLegend({ flaky = true }: { flaky?: boolean }) {
  const id = useId();
  return (
    <ul className="chart-legend" aria-hidden="true">
      <li><svg width="10" height="10"><rect width="10" height="10" rx="2" fill="var(--ok-soft)" /></svg>Passed</li>
      <li><svg width="10" height="10"><rect width="10" height="10" rx="2" fill="var(--bad)" /></svg>Failed</li>
      {flaky && <li><svg width="10" height="10"><defs><Hatch id={id} /></defs><rect width="10" height="10" rx="2" fill={`url(#${id})`} /></svg>Flaky (passed on retry)</li>}
    </ul>
  );
}

/** Stacked bars: runs per slot, split into passed / flaky / failed. */
export function RunsChart({ buckets, size, label, startLabel }: { buckets: Bucket[]; size: number; label: string; startLabel: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const { i, handlers } = useScrub(buckets.length);
  const hatch = useId();
  const n = buckets.length;
  const gap = n > 24 ? 2 : 3;
  const bw = Math.max(1, (w - gap * (n - 1)) / n);
  const max = Math.max(1, ...buckets.map((b) => b.pass + b.fail + b.flaky));
  const top = 14;
  const scale = (v: number) => (v / max) * (H - top - 2);
  const any = buckets.some((b) => b.pass + b.fail + b.flaky > 0);

  return (
    <figure className="chart">
      <div ref={ref} className="chart-plot" role="img" aria-label={`${label}. Focus and use the arrow keys to read each bar.`} {...handlers}>
        <span className="chart-y" style={{ top: 0 }}>{max} run{max === 1 ? "" : "s"}</span>
        <svg width="100%" height={H} viewBox={`0 0 ${w} ${H}`} aria-hidden="true">
          <defs><Hatch id={hatch} /></defs>
          <line x1="0" x2={w} y1={top + 0.5} y2={top + 0.5} className="grid" />
          <line x1="0" x2={w} y1={H - 0.5} y2={H - 0.5} className="axis" />
          {buckets.map((b, k) => {
            const x = k * (bw + gap);
            const total = b.pass + b.fail + b.flaky;
            const segs: Array<[number, string]> = [[b.pass, "var(--ok-soft)"], [b.flaky, `url(#${hatch})`], [b.fail, "var(--bad)"]];
            let y = H - 1;
            return (
              <g key={b.t}>
                {i === k && <rect x={x - gap / 2} y={0} width={bw + gap} height={H} className="hover-col" />}
                {total === 0 ? (
                  <rect x={x} y={H - 3} width={bw} height={2} fill="var(--line-strong)" />
                ) : (
                  segs.filter(([v]) => v > 0).map(([v, fill], s, arr) => {
                    const h = Math.max(2, scale(v) - (s < arr.length - 1 ? 2 : 0));
                    y -= h;
                    const el = <rect key={s} x={x} y={y} width={bw} height={h} rx={Math.min(2, bw / 3)} fill={fill} />;
                    y -= 2; // 2px surface gap between segments
                    return el;
                  })
                )}
              </g>
            );
          })}
        </svg>
        <Tooltip i={i} n={n}>
          {i !== null && <><b>{runsLine(buckets[i])}</b><span>{slotLabel(buckets[i].t, size)}</span></>}
        </Tooltip>
        {!any && <p className="chart-empty">No runs in this period yet.</p>}
      </div>
      <div className="chart-x" aria-hidden="true"><span>{startLabel}</span><span>now</span></div>
      <BucketTable caption={label} buckets={buckets} size={size} />
    </figure>
  );
}

/** Nice round ceiling for a y-axis in milliseconds (1s, 2s, 5s, 10s, ...). */
function niceMax(ms: number): number {
  const steps = [1000, 2000, 4000, 6000, 10_000, 15_000, 20_000, 30_000, 60_000, 120_000, 300_000];
  return steps.find((s) => s >= ms) ?? Math.ceil(ms / 60_000) * 60_000;
}

/** Line: median run time per slot. Gaps where nothing ran. One series, so no legend. */
export function DurationChart({ buckets, size, label, startLabel }: { buckets: Bucket[]; size: number; label: string; startLabel: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const { i, handlers } = useScrub(buckets.length);
  const n = buckets.length;
  const top = 14;
  const maxMs = niceMax(Math.max(1, ...buckets.map((b) => b.ms ?? 0)));
  const x = (k: number) => ((k + 0.5) / n) * w;
  const y = (ms: number) => H - 1 - (ms / maxMs) * (H - top - 2);
  // Break the line wherever a slot had no runs.
  const segments: Array<Array<[number, number]>> = [];
  let cur: Array<[number, number]> = [];
  buckets.forEach((b, k) => {
    if (b.ms === null) { if (cur.length) segments.push(cur); cur = []; }
    else cur.push([x(k), y(b.ms)]);
  });
  if (cur.length) segments.push(cur);
  const path = (pts: Array<[number, number]>) => pts.map(([px, py], k) => `${k ? "L" : "M"}${px.toFixed(1)},${py.toFixed(1)}`).join("");
  const hb = i !== null ? buckets[i] : null;

  return (
    <figure className="chart">
      <div ref={ref} className="chart-plot" role="img" aria-label={`${label}. Focus and use the arrow keys to read each point.`} {...handlers}>
        <span className="chart-y" style={{ top: 0 }}>{formatMs(maxMs)}</span>
        <span className="chart-y" style={{ top: (H - top) / 2 + top - 16 }}>{formatMs(maxMs / 2)}</span>
        <svg width="100%" height={H} viewBox={`0 0 ${w} ${H}`} aria-hidden="true">
          <line x1="0" x2={w} y1={top + 0.5} y2={top + 0.5} className="grid" />
          <line x1="0" x2={w} y1={Math.round(y(maxMs / 2)) + 0.5} y2={Math.round(y(maxMs / 2)) + 0.5} className="grid" />
          <line x1="0" x2={w} y1={H - 0.5} y2={H - 0.5} className="axis" />
          {segments.map((s, k) => (
            <g key={k}>
              {s.length > 1 && <path d={`${path(s)}L${s[s.length - 1][0].toFixed(1)},${H - 1}L${s[0][0].toFixed(1)},${H - 1}Z`} className="area" />}
              {s.length > 1 ? <path d={path(s)} className="line" /> : <circle cx={s[0][0]} cy={s[0][1]} r={2} fill="var(--ink-2)" />}
            </g>
          ))}
          {i !== null && <line x1={x(i)} x2={x(i)} y1={top} y2={H - 1} className="crosshair" />}
          {hb && hb.ms !== null && <circle cx={x(i!)} cy={y(hb.ms)} r={4} className="dot" />}
        </svg>
        <Tooltip i={i} n={n}>
          {hb && <><b>{hb.ms === null ? "No runs" : `${formatMs(hb.ms)} median`}</b><span>{slotLabel(hb.t, size)}{hb.ms !== null ? ` · ${hb.pass + hb.fail + hb.flaky} runs` : ""}</span></>}
        </Tooltip>
      </div>
      <div className="chart-x" aria-hidden="true"><span>{startLabel}</span><span>now</span></div>
      <BucketTable caption={label} buckets={buckets} size={size} duration />
    </figure>
  );
}

/** Compact 30-day strip for table rows and the flow page: one cell per day. */
export function DayStrip({ buckets, label }: { buckets: Bucket[]; label: string }) {
  const [ref, w] = useWidth<HTMLDivElement>(220);
  const { i, handlers } = useScrub(buckets.length);
  const hatch = useId();
  const n = buckets.length;
  const gap = 2;
  const bw = Math.max(1, (w - gap * (n - 1)) / n);
  const h = 22;
  const bad = buckets.filter((b) => b.fail > 0).length;
  const ran = buckets.filter((b) => b.pass + b.fail + b.flaky > 0).length;
  const summary = ran === 0 ? "no runs" : bad ? `${bad} day${bad === 1 ? "" : "s"} with failures` : "no failures";
  return (
    <div ref={ref} className="strip" role="img" aria-label={`${label}, last ${n} days: ${summary}. Focus and use the arrow keys for each day.`} {...handlers}>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <defs><Hatch id={hatch} /></defs>
        {buckets.map((b, k) => {
          const total = b.pass + b.fail + b.flaky;
          const fill = b.fail ? "var(--bad)" : b.flaky ? `url(#${hatch})` : total ? "var(--ok-soft)" : "var(--line-strong)";
          // Failed days are full height; clean days slightly shorter; empty days a stub.
          const ch = !total ? 4 : b.fail ? h : h - 4;
          return <rect key={b.t} x={k * (bw + gap)} y={h - ch} width={bw} height={ch} rx={1} fill={fill} opacity={i === null || i === k ? 1 : 0.55} />;
        })}
      </svg>
      <Tooltip i={i} n={n}>
        {i !== null && <><b>{runsLine(buckets[i])}</b><span>{slotLabel(buckets[i].t, 86_400_000)}{buckets[i].ms !== null ? ` · ${formatMs(buckets[i].ms)} median` : ""}</span></>}
      </Tooltip>
    </div>
  );
}

/** Screen-reader table with the same numbers as the chart. */
function BucketTable({ caption, buckets, size, duration = false }: { caption: string; buckets: Bucket[]; size: number; duration?: boolean }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead><tr><th scope="col">Period</th><th scope="col">Passed</th><th scope="col">Failed</th><th scope="col">Flaky</th>{duration && <th scope="col">Median run time</th>}</tr></thead>
      <tbody>
        {buckets.map((b) => (
          <tr key={b.t}>
            <th scope="row" suppressHydrationWarning>{slotLabel(b.t, size, true)}</th>
            <td>{b.pass}</td><td>{b.fail}</td><td>{b.flaky}</td>
            {duration && <td>{formatMs(b.ms)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
