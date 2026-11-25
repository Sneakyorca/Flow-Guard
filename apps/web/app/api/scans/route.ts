import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import { NextResponse } from "next/server";
import { checkScanUrl, isPrivateIp } from "@flowguard/shared";
import { dispatchWorkflow } from "@/lib/github-dispatch";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const IP_WINDOW_MS = 3 * 60_000;   // one scan per IP every 3 minutes
const URL_REUSE_MS = 10 * 60_000;  // same URL within 10 minutes → show that scan
const HOURLY_CAP = 20;             // whole site, protects the free GitHub Actions minutes

function clientIp(req: Request): string {
  // Vercel sets x-forwarded-for; the first entry is the visitor.
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/**
 * Start a free public scan: validate the address (no private networks), rate-limit,
 * insert a queued public_scans row and start .github/workflows/scan.yml for it.
 * Responds with the share token; the report lives at /scan/<token>.
 */
export async function POST(req: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ message: "Scans from the website aren’t switched on in this copy of FlowGuard yet." }, { status: 501 });

  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  const checked = checkScanUrl(String(url ?? "").slice(0, 2000));
  if (!checked.ok) return NextResponse.json({ message: checked.reason }, { status: 400 });

  try {
    const addrs = await lookup(checked.host, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) {
      return NextResponse.json({ message: "That address isn’t on the public internet." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ message: `Couldn’t find ${checked.host}. Check the address is spelled right.` }, { status: 400 });
  }

  const salt = process.env.SCAN_IP_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const ipHash = createHash("sha256").update(`${salt}:${clientIp(req)}`).digest("hex");
  const since = (ms: number) => new Date(Date.now() - ms).toISOString();

  // Same URL scanned in the last few minutes (by anyone): show that report instead of re-running.
  const { data: recent } = await admin
    .from("public_scans").select("share_token, status").eq("url", checked.url).neq("status", "error")
    .gte("created_at", since(URL_REUSE_MS)).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (recent) return NextResponse.json({ token: recent.share_token, reused: true });

  const { count: mine } = await admin.from("public_scans").select("id", { count: "exact", head: true }).eq("requester_ip_hash", ipHash).gte("created_at", since(IP_WINDOW_MS));
  if ((mine ?? 0) > 0) return NextResponse.json({ message: "One scan every few minutes, please. Try again shortly." }, { status: 429 });
  const { count: hour } = await admin.from("public_scans").select("id", { count: "exact", head: true }).gte("created_at", since(3_600_000));
  if ((hour ?? 0) >= HOURLY_CAP) return NextResponse.json({ message: "Lots of people are scanning right now. Try again in a few minutes." }, { status: 429 });

  const { data: row, error } = await admin.from("public_scans").insert({ url: checked.url, status: "queued", requester_ip_hash: ipHash }).select("id, share_token").single();
  if (error || !row) return NextResponse.json({ message: "Couldn’t queue the scan. Try again in a minute." }, { status: 500 });

  const started = await dispatchWorkflow("scan.yml", { scan_id: row.id });
  if (!started.ok) {
    await admin.from("public_scans").delete().eq("id", row.id);
    return NextResponse.json(
      { message: started.reason === "no-token" ? "Scans from the website aren’t switched on yet (the server can’t start GitHub Actions)." : "Couldn’t start the scan. Try again in a minute." },
      { status: started.reason === "no-token" ? 501 : 502 },
    );
  }
  return NextResponse.json({ token: row.share_token }, { status: 202 });
}
