import { NextResponse } from "next/server";
import { validSlackWebhook } from "@/lib/alert-settings";
import { getSupabaseServer } from "@/lib/supabase/server";

/** Post a short test message to a Slack incoming webhook. Signed-in users only. */
export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  if (!supabase) return NextResponse.json({ message: "Supabase isn’t connected, so nothing is sent from this copy." }, { status: 400 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ message: "Log in again to send a test." }, { status: 401 });

  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (!url || !validSlackWebhook(url)) {
    return NextResponse.json({ message: "That isn’t a Slack incoming webhook. It should start with https://hooks.slack.com/services/" }, { status: 400 });
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Oluso test: alerts for failed flows will appear in this channel. Nothing is broken." }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!res) return NextResponse.json({ message: "Couldn’t reach Slack. Try again in a minute." }, { status: 502 });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const why = body === "no_service" || res.status === 404 ? "Slack says this webhook doesn’t exist (it may have been removed)." : `Slack answered ${res.status} ${body.slice(0, 80)}`.trim();
    return NextResponse.json({ message: why }, { status: 502 });
  }
  return NextResponse.json({ message: "Sent. Check the Slack channel for the test message." });
}
