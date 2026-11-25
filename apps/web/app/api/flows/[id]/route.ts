import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseServer } from "@/lib/supabase/server";
import { removeReplayFolders } from "@/lib/replay-files";

/**
 * Delete one flow: its recordings and screenshots in storage, then the flow row
 * (its flow_runs rows go with it through `on delete cascade`).
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  if (!supabase) return NextResponse.json({ message: "Supabase isn’t connected." }, { status: 400 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Log in again to delete flows." }, { status: 401 });

  // RLS: only finds the flow if it belongs to the signed-in user's workspace.
  const { data: flow } = await supabase.from("flows").select("id, name, workspace_id").eq("id", id).maybeSingle();
  if (!flow) return NextResponse.json({ message: "That flow doesn’t exist in your workspace." }, { status: 404 });

  let note = "";
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data: runs } = await supabase.from("flow_runs").select("id").eq("flow_id", id).limit(10_000);
    try {
      await removeReplayFolders(admin, (runs ?? []).map((r) => `${flow.workspace_id}/${r.id}`));
    } catch (e) {
      console.error(`[delete-flow] ${(e as Error).message}`);
      return NextResponse.json({ message: "Couldn’t remove the flow’s recordings, so nothing was deleted. Try again in a minute." }, { status: 502 });
    }
  } else {
    note = " Its recordings stay in storage until they expire (SUPABASE_SERVICE_ROLE_KEY isn’t set on this server).";
  }

  const { error } = await supabase.from("flows").delete().eq("id", id);
  if (error) return NextResponse.json({ message: `Couldn’t delete the flow: ${error.message}` }, { status: 500 });
  return NextResponse.json({ message: `Deleted “${flow.name}” and its runs.${note}` });
}
