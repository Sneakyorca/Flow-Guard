import "server-only";
import type { AlertSettings } from "./alert-settings";
import { getSupabaseServer } from "./supabase/server";

/** The signed-in user's alert settings, or null in demo mode / signed out. */
export async function getAlertSettings(): Promise<AlertSettings | null> {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const full = await supabase.from("workspaces").select("id, slack_webhook_url, alert_email, public_replays").order("created_at").limit(1).maybeSingle();
  if (!full.error && full.data) {
    return { workspaceId: full.data.id, slackWebhookUrl: full.data.slack_webhook_url ?? "", alertEmail: full.data.alert_email, publicReplays: full.data.public_replays, needsMigration: false };
  }
  // Migration 0004 not applied yet: the new columns don't exist.
  const basic = await supabase.from("workspaces").select("id, slack_webhook_url").order("created_at").limit(1).maybeSingle();
  if (!basic.data) return null;
  return { workspaceId: basic.data.id, slackWebhookUrl: basic.data.slack_webhook_url ?? "", alertEmail: true, publicReplays: true, needsMigration: true };
}
