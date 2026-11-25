import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Flow definition                                                     */
/* ------------------------------------------------------------------ */

export const Viewport = z.enum(["desktop", "mobile"]);
export type Viewport = z.infer<typeof Viewport>;

export const VIEWPORTS: Record<Viewport, { width: number; height: number; isMobile: boolean; userAgentHint: string }> = {
  desktop: { width: 1440, height: 900, isMobile: false, userAgentHint: "Desktop Chromium" },
  mobile: { width: 390, height: 844, isMobile: true, userAgentHint: "iPhone 15 (emulated)" },
};

export const FlowStatus = z.enum(["active", "paused"]);
export type FlowStatus = z.infer<typeof FlowStatus>;

/** A flow step as stored in `flows.steps_json`: just a plain-English instruction. */
export const FlowStep = z.object({
  instruction: z.string().min(1),
});
export type FlowStep = z.infer<typeof FlowStep>;

export const StepsJson = z.array(FlowStep).min(1);

/** Row shape of `public.flows`. */
export const FlowRow = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  name: z.string(),
  start_url: z.string().url(),
  viewport: Viewport,
  schedule_cron: z.string().nullable(),
  status: FlowStatus,
  steps_json: StepsJson,
  last_run_at: z.string().nullable().optional(),
  created_at: z.string().optional(),
});
export type FlowRow = z.infer<typeof FlowRow>;

/* ------------------------------------------------------------------ */
/* DOM snapshot + AI step resolver contract                            */
/* ------------------------------------------------------------------ */

export const DomNode = z.object({
  id: z.string(),
  role: z.string(),
  tag: z.string(),
  name: z.string(),
  text: z.string(),
  type: z.string().optional(),
  placeholder: z.string().optional(),
  href: z.string().optional(),
  value: z.string().optional(),
  checked: z.boolean().optional(),
  selected: z.boolean().optional(),
  /** id / name / class / data-testid tokens, useful for keyword matching ("new-todo"). */
  hint: z.string().optional(),
});
export type DomNode = z.infer<typeof DomNode>;

export const ActionType = z.enum(["click", "fill", "press", "navigate", "assert_text", "assert_url"]);
export type ActionType = z.infer<typeof ActionType>;

const nullableString = z.preprocess(
  (v) => (v === undefined || v === "" ? null : typeof v === "number" ? String(v) : v),
  z.string().nullable(),
);

/**
 * What every resolver (heuristic, gemini, groq, anthropic) must return.
 * Validated with zod before the executor acts on it.
 *  - target_id: the `data-fg-id` of the element to act on (null for navigate/press-on-page/assert_url)
 *  - selector_or_coordinates: CSS selector (e.g. `[data-fg-id="12"]`) or "x,y"; derived from target_id if omitted
 *  - value: text to type, key to press, URL to navigate to, or text/URL fragment to assert
 */
export const ResolvedStep = z.object({
  action: ActionType,
  target_id: nullableString.default(null),
  selector_or_coordinates: nullableString.default(null),
  value: nullableString.default(null),
  reasoning: z.string().default(""),
});
export type ResolvedStep = z.infer<typeof ResolvedStep>;

/** Resolver output may contain several actions for one instruction (e.g. type + press Enter). */
export const ResolvedPlan = z.object({
  actions: z.array(ResolvedStep).min(1),
});
export type ResolvedPlan = z.infer<typeof ResolvedPlan>;

export const ResolverName = z.enum(["heuristic", "gemini", "groq", "anthropic"]);
export type ResolverName = z.infer<typeof ResolverName>;

/* ------------------------------------------------------------------ */
/* Run results / diagnostics                                           */
/* ------------------------------------------------------------------ */

export const RunStatus = z.enum(["PASSING", "FAILED"]);
export type RunStatus = z.infer<typeof RunStatus>;

export const ConsoleLog = z.object({
  type: z.string(), // "error" | "warning" | "pageerror" | ...
  text: z.string(),
  location: z.string().optional(),
  at_ms: z.number(),
});
export type ConsoleLog = z.infer<typeof ConsoleLog>;

export const NetworkError = z.object({
  method: z.string(),
  url: z.string(),
  status: z.number().nullable(), // null for requestfailed
  status_text: z.string().optional(),
  failure: z.string().optional(),
  resource_type: z.string().optional(),
  at_ms: z.number(),
});
export type NetworkError = z.infer<typeof NetworkError>;

export const StepResult = z.object({
  index: z.number(),
  instruction: z.string(),
  status: z.enum(["passed", "failed", "skipped"]),
  duration_ms: z.number(),
  actions: z.array(ResolvedStep),
  reasoning: z.string(),
  error: z.string().optional(),
  /** Number of resolve+act attempts (2 = self-healing retry kicked in). */
  attempts: z.number().default(1),
  /** True when the first attempt failed and the re-resolved attempt passed. */
  healed: z.boolean().default(false),
  /** Offset from run start when this step began (ms); used to line up console/network logs. */
  started_ms: z.number().optional(),
  /** Path (relative to the run folder) of a JPEG taken right after this step. */
  screenshot: z.string().optional(),
});
export type StepResult = z.infer<typeof StepResult>;

export const FailureExplanation = z.object({
  category: z.enum(["site_down", "js_error", "server_error", "element_missing", "text_missing", "wrong_page", "not_interactable", "other"]),
  /** One short sentence, written for a non-developer. */
  title: z.string(),
  detail: z.string(),
  suggestion: z.string(),
  evidence: z.array(z.string()),
});
export type FailureExplanation = z.infer<typeof FailureExplanation>;

export const RunDiagnostics = z.object({
  run_id: z.string(),
  status: RunStatus,
  start_url: z.string(),
  final_url: z.string().optional(),
  viewport: Viewport,
  resolver: ResolverName,
  started_at: z.string(),
  duration_ms: z.number(),
  failed_step_index: z.number().nullable(),
  error_message: z.string().nullable(),
  explanation: FailureExplanation.nullable().default(null),
  /** How many full runs it took (2 = the first failed and was re-run before deciding). */
  attempts: z.number().default(1),
  /** First run failed, re-run passed: recorded, but nobody gets paged. */
  flaky: z.boolean().default(false),
  /** Error from the first attempt when the run was retried. */
  first_attempt_error: z.string().nullable().default(null),
  steps: z.array(StepResult),
  console_logs: z.array(ConsoleLog),
  network_errors: z.array(NetworkError),
  artifacts: z.object({
    video: z.string().nullable(),
    failure_screenshot: z.string().nullable(),
  }),
});
export type RunDiagnostics = z.infer<typeof RunDiagnostics>;

/** Row shape of `public.flow_runs`. */
export const FlowRunRow = z.object({
  id: z.string().uuid(),
  flow_id: z.string().uuid(),
  status: RunStatus,
  started_at: z.string(),
  duration_ms: z.number().nullable(),
  failed_step_index: z.number().nullable(),
  error_message: z.string().nullable(),
  video_url: z.string().nullable(),
  console_logs_json: z.array(ConsoleLog),
  network_errors_json: z.array(NetworkError),
  steps_result_json: z.array(StepResult).optional(),
  public_share_token: z.string(),
});
export type FlowRunRow = z.infer<typeof FlowRunRow>;

/* ------------------------------------------------------------------ */
/* Free scanner                                                        */
/* ------------------------------------------------------------------ */

export const BrokenLink = z.object({
  url: z.string(),
  status: z.number().nullable(),
  found_on: z.string(),
  error: z.string().optional(),
});
export type BrokenLink = z.infer<typeof BrokenLink>;

export const OverflowIssue = z.object({
  page: z.string(),
  scroll_width: z.number(),
  viewport_width: z.number(),
  offenders: z.array(z.string()),
});
export type OverflowIssue = z.infer<typeof OverflowIssue>;

export const ScanConsoleError = z.object({
  page: z.string(),
  type: z.string(),
  text: z.string(),
  /** Same error seen on this many pages (de-duplicated). */
  count: z.number().default(1),
  /** Up to 5 other pages it also appeared on. */
  also_on: z.array(z.string()).default([]),
});
export type ScanConsoleError = z.infer<typeof ScanConsoleError>;

export const ScanReport = z.object({
  scan_id: z.string(),
  url: z.string(),
  started_at: z.string(),
  duration_ms: z.number(),
  budget_ms: z.number(),
  pages_scanned: z.array(z.object({ url: z.string(), status: z.number().nullable(), load_ms: z.number() })),
  links_checked: z.number(),
  broken_links: z.array(BrokenLink),
  mobile_overflow: z.array(OverflowIssue),
  console_errors: z.array(ScanConsoleError),
  score: z.number(), // 0-100
  summary: z.string(),
  video: z.string().nullable(),
});
export type ScanReport = z.infer<typeof ScanReport>;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function selectorForId(id: string): string {
  return `[data-fg-id="${id}"]`;
}

/** Split a multi-line / numbered step blob ("1) foo\n2) bar") into instructions. */
export function parseSteps(input: string): FlowStep[] {
  return input
    .split(/\r?\n|;(?=\s*\d+[.)])|\|/)
    .map((s) => s.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, "").trim())
    .filter(Boolean)
    .map((instruction) => ({ instruction }));
}

/* ------------------------------------------------------------------ */
/* Public scan URL safety (SSRF): shared by the web API and the worker */
/* ------------------------------------------------------------------ */

function ipv4Parts(ip: string): number[] | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const p = m.slice(1).map(Number);
  return p.every((n) => n >= 0 && n <= 255) ? p : null;
}

/** True for loopback, private, link-local, CGNAT, multicast, reserved and cloud-metadata addresses. */
export function isPrivateIp(ip: string): boolean {
  const v = ip.trim().toLowerCase().replace(/^\[|\]$/g, "");
  const p4 = ipv4Parts(v.startsWith("::ffff:") ? v.slice(7) : v);
  if (p4) {
    const [a, b] = p4;
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) ||           // link-local, cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||             // 192.0.0.0/24 and 192.0.2.0/24 (TEST-NET-1)
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51) || (a === 203 && b === 0)
    );
  }
  if (v.includes(":")) {
    return v === "::" || v === "::1" || v.startsWith("::ffff:") || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff") || v.startsWith("64:ff9b") || v.startsWith("2001:db8");
  }
  return false;
}

export type ScanUrlCheck = { ok: true; url: string; host: string } | { ok: false; reason: string };

/** Syntax-level checks for a public scan URL (DNS is checked separately by the caller). */
export function checkScanUrl(input: string): ScanUrlCheck {
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  } catch {
    return { ok: false, reason: "That doesn’t look like a website address." };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return { ok: false, reason: "Only http and https addresses can be scanned." };
  if (u.username || u.password) return { ok: false, reason: "Addresses with a username or password can’t be scanned." };
  if (u.port && u.port !== "80" && u.port !== "443") return { ok: false, reason: "Only the standard web ports (80 and 443) can be scanned." };
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!host.includes(".") || /(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain|home\.arpa)$/.test(host)) {
    return { ok: false, reason: "That address isn’t on the public internet." };
  }
  if (isPrivateIp(host)) return { ok: false, reason: "That address isn’t on the public internet." };
  if (ipv4Parts(host) || host.includes(":")) return { ok: false, reason: "Please enter a domain name rather than an IP address." };
  u.hash = "";
  return { ok: true, url: u.toString(), host };
}
