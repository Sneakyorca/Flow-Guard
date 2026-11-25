import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * The newest run of one flow, polled by the Run button while a run is in progress.
 * Small on purpose: one row, five columns, scoped to the signed-in user by RLS.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServer();
  if (!supabase) return NextResponse.json({ run: null }, { status: 400 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ run: null }, { status: 401 });

  const { data, error } = await supabase
    .from("flow_runs")
    .select("id, status, flaky, started_at, public_share_token")
    .eq("flow_id", id)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ run: null }, { status: 500 });
  return NextResponse.json({ run: data ?? null }, { headers: { "Cache-Control": "no-store" } });
}
