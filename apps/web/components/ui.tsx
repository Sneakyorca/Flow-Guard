import type { ReactNode } from "react";
import type { Status } from "@/lib/demo-data";

const paths: Record<string, ReactNode> = {
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  play: <path d="m9 5 11 7-11 7V5Z" />,
  globe: <><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18" /></>,
  bell: <><path d="M5 17h14l-2-3V9A5 5 0 0 0 7 9v5l-2 3Z" /><path d="M10 21h4" /></>,
  settings: <><circle cx="12" cy="12" r="4" /><path d="m10 3-1 3-3 1-3 3v4l3 1 1 3 3 3h4l1-3 3-1 3-3v-4l-3-1-1-3-3-3h-4Z" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  down: <path d="m8 10 4 4 4-4" />,
  arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
  check: <path d="m5 12 4 4L19 6" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-1l2 6M4 12l2 6a7 7 0 0 0 12-1" /></>,
  link: <><path d="m10 8 3-3a5 5 0 0 1 7 7l-3 3M14 16l-3 3a5 5 0 0 1-7-7l3-3M8 16l8-8" /></>,
  code: <path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18" />,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9 9a3 3 0 1 1 4 3v2m-1 3h.01" /></>,
  external: <><path d="M14 3h7v7m0-7L10 14M10 4H4v16h16v-6" /></>,
  monitor: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4" /></>,
  mobile: <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z" />,
};

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.grid}
    </svg>
  );
}

export function Button({ children, onClick, primary = false, disabled = false, type = "button" }: { children: ReactNode; onClick?: () => void; primary?: boolean; disabled?: boolean; type?: "button" | "submit" }) {
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`btn ${primary ? "primary" : ""}`}>
      {children}
    </button>
  );
}

export function Badge({ status }: { status: Status }) {
  return <span className={`badge ${status}`}><span className="dot" />{status}</span>;
}

export function Uptime({ status, wide = false }: { status: Status; wide?: boolean }) {
  return (
    <div className={`uptime ${wide ? "wide" : ""}`} aria-label={`30-day uptime history, ${status}`} role="img">
      {Array.from({ length: wide ? 75 : 36 }, (_, i) => (
        <i
          key={i}
          className={status === "failed" && (i === 12 || i > (wide ? 71 : 33)) ? "red" : status === "warning" && (i === 24 || i === 29) ? "amber" : ""}
          style={{ height: wide ? `${20 + ((i * 7) % 19)}px` : undefined }}
        />
      ))}
    </div>
  );
}
