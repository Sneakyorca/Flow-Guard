import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

/** Repo root (npm sets INIT_CWD to where `npm run` was invoked). */
export function invocationDir(): string {
  return process.env.INIT_CWD || process.cwd();
}

export function runsDir(): string {
  return path.resolve(process.env.FLOWGUARD_RUNS_DIR || path.join(invocationDir(), "runs"));
}

export function newRunId(prefix = "run"): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  return `${prefix}-${stamp}-${randomUUID().slice(0, 6)}`;
}

/** Minimal `--key value` / `--flag` parser (works the same in cmd, PowerShell and bash). */
export function parseArgs(argv = process.argv.slice(2)): Record<string, string | true> {
  const out: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const eq = a.indexOf("=");
    if (eq > -1) { out[a.slice(2, eq)] = a.slice(eq + 1); continue; }
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) { out[a.slice(2)] = next; i++; }
    else out[a.slice(2)] = true;
  }
  return out;
}

/** Load KEY=VALUE lines from .env files (root and cwd) without overriding real env vars. */
export function loadDotEnv(): void {
  const candidates = [path.join(invocationDir(), ".env"), path.join(process.cwd(), ".env"), path.resolve(process.cwd(), "../../.env")];
  for (const file of new Set(candidates)) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m || process.env[m[1]] !== undefined) continue;
      const v = m[2].replace(/^["']|["']$/g, "");
      if (v !== "") process.env[m[1]] = v;
    }
  }
}
