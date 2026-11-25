import type { ReactNode } from "react";
import type { DayResult, Status } from "@/lib/demo-data";

const paths: Record<string, ReactNode> = {
  mark: <><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" /><path d="M8 12.5h3l1.5-3 2 6 1.5-3h0" /></>,
  grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
  play: <path d="M8 5.5v13l10.5-6.5L8 5.5Z" />,
  pause: <><path d="M8 5v14M16 5v14" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
  bell: <><path d="M6 16.5h12l-1.5-2.5V10a4.5 4.5 0 0 0-9 0v4L6 16.5Z" /><path d="M10 20h4" /></>,
  settings: <><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  back: <path d="M19 12H5m5-5-5 5 5 5" />,
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  "check-circle": <><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.8 2.8L16.5 9" /></>,
  "x-circle": <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></>,
  "alert-circle": <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></>,
  minus: <><circle cx="12" cy="12" r="9" /><path d="M8.5 12h7" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  refresh: <><path d="M20 6v5h-5" /><path d="M19.5 11A7.5 7.5 0 1 0 17 17.5" /></>,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>,
  code: <path d="m8.5 7-5 5 5 5m7-10 5 5-5 5" />,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 16.5v.01" /></>,
  monitor: <><rect x="3" y="4.5" width="18" height="12" rx="1.5" /><path d="M8.5 20h7M12 16.5V20" /></>,
  mobile: <><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /></>,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.5v.01" /></>,
  file: <><path d="M6 3.5h8l4 4v13H6v-17Z" /><path d="M14 3.5v4h4" /></>,
  cursor: <path d="m6 4 12 7-5.5 1.5L10 18 6 4Z" />,
};

export function Icon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] ?? paths.grid}
    </svg>
  );
}

export function Button({ children, onClick, variant, size, disabled = false, type = "button", label }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "accent" | "ghost"; size?: "sm" | "lg"; disabled?: boolean; type?: "button" | "submit"; label?: string }) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} aria-label={label} className={["btn", variant, size].filter(Boolean).join(" ")}>
      {children}
    </button>
  );
}

const STATUS_WORD: Record<Status, string> = { passing: "Passing", failed: "Failing", warning: "Slow", pending: "Not run yet" };

export function StatusLabel({ status, text }: { status: Status; text?: string }) {
  return <span className={`status ${status}`}><span className="d" aria-hidden="true" />{text ?? STATUS_WORD[status]}</span>;
}

/** Status icon for a single run/step. */
export function StepIcon({ status }: { status: "passed" | "failed" | "skipped" | "warning" }) {
  if (status === "passed") return <Icon name="check-circle" className="t-ok" />;
  if (status === "failed") return <Icon name="x-circle" className="t-bad" />;
  if (status === "warning") return <Icon name="alert-circle" className="t-warn" />;
  return <Icon name="minus" className="faint" />;
}

/** 30 days of daily results, oldest first. Real `history` when given, otherwise a demo pattern per status. */
export function Uptime({ status, days = 30, history }: { status: Status; days?: number; history?: DayResult[] }) {
  if (history) {
    const failingDays = history.filter((d) => d === "bad").length;
    const ran = history.filter((d) => d !== "none").length;
    const label = ran === 0 ? "No runs in the last 30 days" : `Last ${history.length} days: ${failingDays ? `${failingDays} days with failures` : "no failures"}`;
    return (
      <div className="uptime" role="img" aria-label={label}>
        {history.map((d, i) => <i key={i} className={d === "ok" ? "" : d} />)}
      </div>
    );
  }
  const bad = (i: number) => status === "failed" && (i === 11 || i >= days - 1);
  const warn = (i: number) => status === "warning" && (i === 19 || i === 26);
  const failing = Array.from({ length: days }, (_, i) => bad(i)).filter(Boolean).length;
  return (
    <div className="uptime" role="img" aria-label={`Last ${days} days: ${failing ? `${failing} days with failures` : "no failures"}`}>
      {Array.from({ length: days }, (_, i) => <i key={i} className={bad(i) ? "bad" : warn(i) ? "warn" : ""} />)}
    </div>
  );
}
