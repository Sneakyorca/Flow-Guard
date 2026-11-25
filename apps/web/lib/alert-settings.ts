/** Workspace alert settings (workspaces.slack_webhook_url, alert_email, public_replays). */
export interface AlertSettings {
  workspaceId: string;
  slackWebhookUrl: string;
  alertEmail: boolean;
  publicReplays: boolean;
  /** True when migration 0004 hasn't been run yet, so only the Slack webhook can be saved. */
  needsMigration: boolean;
}

export const SLACK_PREFIX = "https://hooks.slack.com/services/";

export function validSlackWebhook(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "hooks.slack.com" && u.pathname.startsWith("/services/") && u.pathname.length > "/services/".length + 8;
  } catch {
    return false;
  }
}
