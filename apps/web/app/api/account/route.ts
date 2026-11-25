import { NextResponse } from "next/server";
import { getSupabaseAdmin, getSupabaseServer } from "@/lib/supabase/server";
import { removeReplayFolders } from "@/lib/replay-files";

/**
 * Delete the signed-in user's account and everything in it:
 * 1. recordings, screenshots and diagnostics in the `replays` bucket (folder per workspace),
 * 2. the auth user, which cascades to workspaces → flows → flow_runs.
 * Needs SUPABASE_SERVICE_ROLE_KEY on the server; the browser sends a typed confirmation.
 */
export async function DELETE(req: Request) {
  const supabase = await getSupabaseServer();
  if (!supabase) return NextResponse.json({ message: "Supabase isn’t connected, so there’s no account to delete." }, { status: 400 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Log in again to delete your account." }, { status: 401 });

  const { confirm } = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (confirm?.trim().toLowerCase() !== "delete my account") {
    return NextResponse.json({ message: "Type “delete my account” to confirm." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Account deletion isn’t set up on this server (SUPABASE_SERVICE_ROLE_KEY is missing). Email us and we’ll delete it by hand." }, { status: 501 });
  }

  // RLS: only the user's own workspaces.
  const { data: workspaces } = await supabase.from("workspaces").select("id");
  try {
    await removeReplayFolders(admin, (workspaces ?? []).map((w) => w.id as string));
  } catch (e) {
    console.error(`[delete-account] storage: ${(e as Error).message}`);
    return NextResponse.json({ message: "Couldn’t remove your recordings, so nothing was deleted. Try again in a minute." }, { status: 502 });
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error(`[delete-account] auth: ${error.message}`);
    return NextResponse.json({ message: "Your recordings were removed but the account couldn’t be deleted. Try again, or email us." }, { status: 500 });
  }
  await supabase.auth.signOut().catch(() => {});
  return NextResponse.json({ message: "Your account and all its data have been deleted." });
}
