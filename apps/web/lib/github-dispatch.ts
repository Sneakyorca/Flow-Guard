import "server-only";

/**
 * Start a GitHub Actions workflow (workflow_dispatch). Needs on the web host:
 *   GITHUB_DISPATCH_TOKEN  fine-grained token for this repo with "Actions: Read and write"
 *   GITHUB_REPO            owner/name, defaults to Sneakyorca/Flow-Guard
 */
export type DispatchResult = { ok: true } | { ok: false; reason: "no-token" | "refused"; status?: number };

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
    return { ok: false, reason: "refused", status: res?.status };
  }
  return { ok: true };
}
