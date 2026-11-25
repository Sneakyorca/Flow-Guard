import "server-only";
import type { ScanReport } from "@flowguard/shared";
import { getSupabaseAdmin, getSupabaseServer } from "./supabase/server";

export interface PublicScan {
  url: string;
  host: string;
  status: "queued" | "running" | "done" | "error";
  score: number | null;
  report: ScanReport | null;
  error: string | null;
  videoUrl: string | null;
  createdAt: string;
}

/** A public scan by share token, through get_public_scan(); null when not found or Supabase is off. */
export async function getPublicScan(token: string): Promise<PublicScan | null> {
  const db = await getSupabaseServer();
  if (!db) return null;
  const { data, error } = await db.rpc("get_public_scan", { token });
  if (error || !data) return null;
  const s = data as { url: string; status: PublicScan["status"]; score: number | null; report: (ScanReport & { error?: string }) | null; video_path: string | null; created_at: string };
  let videoUrl: string | null = null;
  const admin = getSupabaseAdmin();
  if (admin && s.video_path && s.status === "done") {
    videoUrl = (await admin.storage.from("replays").createSignedUrl(s.video_path, 3600)).data?.signedUrl ?? null;
  }
  let host = s.url;
  try { host = new URL(s.url).host; } catch {}
  return {
    url: s.url,
    host,
    status: s.status,
    score: s.score,
    report: s.status === "done" ? s.report : null,
    error: s.status === "error" ? s.report?.error ?? "The scan couldn’t finish." : null,
    videoUrl,
    createdAt: s.created_at,
  };
}
