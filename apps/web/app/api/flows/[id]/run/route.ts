import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * "Run now" for one flow. FlowGuard's browser runs happen on GitHub Actions (free), so this
 * starts the `scheduled-runs.yml` workflow with `flow_id` set. Results land in Monitors when
 * the run finishes, usually within 2–3 minutes.
 *
 * Needs on the web host (e.g. Vercel env vars):
 *   GITHUB_DISPATCH_TOKEN  fine-grained token for this repo with "Actions: Read and write"
 *   GITHUB_REPO            owner/name, defaults to Sneakyorca/Flow-Guard
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  if (!supabase) return NextResponse.json({ message: "Supabase isn’t connected, so there’s nothing real to run." }, { status: 400 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Log in again to run flows." }, { status: 401 });

  // RLS: this only returns the flow if it belongs to the signed-in user's workspace.
  const { data: flow } = await supabase.from("flows").select("id, name").eq("id", id).maybeSingle();
  if (!flow) return NextResponse.json({ message: "That flow doesn’t exist in your workspace." }, { status: 404 });

  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_REPO || "Sneakyorca/Flow-Guard";
  if (!token) {
    return NextResponse.json(
      { message: `Run now isn’t switched on yet (GITHUB_DISPATCH_TOKEN is missing). “${flow.name}” still runs on its hourly schedule.` },
      { status: 501 },
    );
  }

  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/scheduled-runs.yml/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "flowguard-web",
    },
    body: JSON.stringify({ ref: "main", inputs: { flow_id: flow.id } }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`[run-now] GitHub dispatch failed: ${res.status} ${detail.slice(0, 300)}`);
    return NextResponse.json({ message: `GitHub refused to start the run (${res.status}). Check the token’s repo access and Actions permission.` }, { status: 502 });
  }
  return NextResponse.json({ message: `“${flow.name}” is starting on GitHub Actions. Results appear here in about 2–3 minutes; refresh to see them.` }, { status: 202 });
}
