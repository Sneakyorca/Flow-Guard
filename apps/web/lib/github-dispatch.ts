import "server-only";

/**
 * Start a GitHub Actions workflow (workflow_dispatch). Needs on the web host:
 *   GITHUB_DISPATCH_TOKEN  fine-grained token for this repo with "Actions: Read and write"
 *   GITHUB_REPO            owner/name, defaults to Sneakyorca/Flow-Guard
 */
export type DispatchResult = { ok: true } | { ok: false; reason: "no-token" | "refused"; status?: number; hint?: string };

/** What the owner should change, from GitHub's answer. Shown in the error so it can be fixed without reading server logs. */
export function dispatchHint(status: number | undefined, detail: string): string {
  if (status === undefined) return "the server couldn’t reach GitHub";
  if (status === 401) return "GitHub says the token is wrong or expired (401): paste a fresh GITHUB_DISPATCH_TOKEN and redeploy";
  if (status === 403) return "the token isn’t allowed to start workflows (403): give it Actions: Read and write on this repository";
  if (status === 404) return "GitHub can’t find the repository or workflow for this token (404): the token must include this repository, and GITHUB_REPO (if set) must be owner/name";
  if (status === 422) return `GitHub rejected the request (422): ${detail.slice(0, 120)}`;
  return `GitHub answered ${status}`;
}

/**
 * The token as pasted into the host's settings, cleaned of common paste mistakes:
 * surrounding spaces or quotes, a "Bearer " prefix, or the variable name itself
 * ("GITHUB_DISPATCH_TOKEN=github_pat_…"). Any of these makes GitHub answer 401.
 */
function cleanToken(raw: string | undefined): string {
  return (raw ?? "")
    .trim()
    .replace(/^GITHUB_DISPATCH_TOKEN\s*=\s*/i, "")
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

export function dispatchConfigured(): boolean {
  return Boolean(cleanToken(process.env.GITHUB_DISPATCH_TOKEN));
}

export async function dispatchWorkflow(workflow: string, inputs: Record<string, string>): Promise<DispatchResult> {
  const token = cleanToken(process.env.GITHUB_DISPATCH_TOKEN);
  const repo = (process.env.GITHUB_REPO || "Sneakyorca/Flow-Guard").trim();
  if (!token) return { ok: false, reason: "no-token" };
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${workflow}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "flowguard-web",
    },
    body: JSON.stringify({ ref: "main", inputs }),
  }).catch(() => null);
  if (!res?.ok) {
    const detail = res ? await res.text().catch(() => "") : "network error";
    console.error(`[dispatch] ${workflow} failed: ${res?.status ?? "-"} ${detail.slice(0, 300)}`);
    let message = detail;
    try { message = (JSON.parse(detail) as { message?: string }).message ?? detail; } catch {}
    return { ok: false, reason: "refused", status: res?.status, hint: dispatchHint(res?.status, message) };
  }
  return { ok: true };
}
