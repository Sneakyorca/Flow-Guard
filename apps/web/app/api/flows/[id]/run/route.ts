import { NextResponse } from "next/server";
import { dispatchWorkflow } from "@/lib/github-dispatch";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * "Run now" for one flow. FlowGuard's browser runs happen on GitHub Actions (free), so this
 * starts the `scheduled-runs.yml` workflow with `flow_id` set. Results land in Monitors when
 * the run finishes, usually within 2–3 minutes.
 *
 * Needs GITHUB_DISPATCH_TOKEN on the web host (see lib/github-dispatch.ts).
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

  const result = await dispatchWorkflow("scheduled-runs.yml", { flow_id: flow.id });
  if (!result.ok && result.reason === "no-token") {
    return NextResponse.json(
      { message: `“Run now” isn’t set up on this server yet (GITHUB_DISPATCH_TOKEN is missing), so nothing was started. Scheduled runs are unaffected by this setting.` },
      { status: 501 },
    );
  }
  if (!result.ok) {
    return NextResponse.json({ message: `GitHub refused to start the run (${result.status ?? "no answer"}). Check the token’s repo access and Actions permission.` }, { status: 502 });
  }
  return NextResponse.json({ message: `“${flow.name}” is starting on GitHub Actions. The result usually lands in 2–3 minutes; this page updates by itself.` }, { status: 202 });
}
