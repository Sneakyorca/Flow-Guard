"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { validSlackWebhook, type AlertSettings } from "@/lib/alert-settings";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Button, Icon } from "./ui";
import { useToast } from "./toast";
import { useWorkspaceName } from "./workspace";
import { useFlows } from "./flows-store";
import { useLive } from "./live-data";

/**
 * /alerts and /settings. Signed in: reads and writes the workspace row in Supabase.
 * Demo (Supabase not configured): nothing is saved and the page says so.
 */
export function Preferences({ view, settings = null }: { view: "alerts" | "settings"; settings?: AlertSettings | null }) {
  return view === "alerts" ? <AlertsView settings={settings} /> : <SettingsView />;
}

function AlertsView({ settings }: { settings: AlertSettings | null }) {
  const notify = useToast();
  const router = useRouter();
  const live = useLive();
  const [webhook, setWebhook] = useState(settings?.slackWebhookUrl ?? "");
  const [alertEmail, setAlertEmail] = useState(settings?.alertEmail ?? true);
  const [publicReplays, setPublicReplays] = useState(settings?.publicReplays ?? true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const trimmed = webhook.trim();
  const badUrl = trimmed !== "" && !validSlackWebhook(trimmed);
  const canSave = Boolean(live && settings);

  async function save() {
    if (!canSave || !settings) return notify("Sample workspace: nothing is saved. Connect Supabase to save alert settings.", "info");
    if (badUrl) return notify("That isn’t a Slack incoming webhook. It should start with https://hooks.slack.com/services/", "bad");
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setSaving(true);
    const row: Record<string, unknown> = { slack_webhook_url: trimmed || null };
    if (!settings.needsMigration) Object.assign(row, { alert_email: alertEmail, public_replays: publicReplays });
    const { error } = await supabase.from("workspaces").update(row).eq("id", settings.workspaceId);
    setSaving(false);
    if (error) return notify(`Couldn’t save: ${error.message}`, "bad");
    notify(settings.needsMigration ? "Slack webhook saved. The other switches need database migration 0004 first." : "Saved.");
    router.refresh();
  }

  async function test() {
    if (!canSave) return notify("Sample workspace: nothing is sent. Connect Supabase to send a test message.", "info");
    if (!trimmed || badUrl) return notify("Paste a Slack incoming webhook URL first.", "bad");
    setTesting(true);
    const res = await fetch("/api/alerts/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: trimmed }) }).catch(() => null);
    const body = (await res?.json().catch(() => ({}))) as { message?: string } | undefined;
    setTesting(false);
    notify(body?.message ?? "Couldn’t reach the server.", res?.ok ? "ok" : "bad");
  }

  const locked = settings?.needsMigration ?? false;
  return (
    <div className="settings">
      <div className="page-head"><div><h1>Alerts</h1><p>Who hears about a failure, and how. A failed run is checked a second time before any alert goes out, and flaky runs (fail, then pass) are never alerted.</p></div></div>
      {locked && (
        <div className="notice" style={{ marginBottom: 16 }}>
          <Icon name="info" />
          <span>The email and replay-link switches need database migration <span className="mono">0004</span>. Run it in the Supabase SQL editor (see <span className="mono">docs/OWNER-TODO.md</span>). The Slack webhook already saves.</span>
        </div>
      )}
      <section className="panel">
        <div className="form-sec">
          <label className="field">Slack incoming webhook
            <span className="hint">In Slack: Apps → Incoming Webhooks → Add to a channel, then paste the URL here. Leave empty to turn Slack alerts off.</span>
            <input type="url" className="mono" value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://hooks.slack.com/services/T000/B000/XXXX" aria-invalid={badUrl} aria-describedby={badUrl ? "wh-err" : undefined} />
          </label>
          {badUrl && <p id="wh-err" className="auth-error" style={{ marginTop: -8 }}><Icon name="x-circle" size={14} /> Slack webhooks start with https://hooks.slack.com/services/</p>}
        </div>
        <label className="setting">
          <span><b>Email me</b><span>One email to the account’s address per confirmed failure. Sent only when email sending is set up on the server (free Brevo key); until then this switch is saved but nothing is sent.</span></span>
          <input className="switch" type="checkbox" role="switch" checked={alertEmail} onChange={(e) => setAlertEmail(e.target.checked)} disabled={locked} aria-label="Email me" />
        </label>
        <label className="setting">
          <span><b>Public replay links</b><span>On: anyone with a run’s link can watch it, so whoever fixes it doesn’t need an account. Off: links only open for you when you’re logged in.</span></span>
          <input className="switch" type="checkbox" role="switch" checked={publicReplays} onChange={(e) => setPublicReplays(e.target.checked)} disabled={locked} aria-label="Public replay links" />
        </label>
        <div className="actions">
          {!canSave && <span className="muted" style={{ marginRight: "auto", fontSize: 12.5 }}>Sample workspace: nothing is saved or sent.</span>}
          <Button onClick={test} disabled={testing}><Icon name="bell" size={14} /> {testing ? "Sending…" : "Send test message"}</Button>
          <Button variant="primary" onClick={save} disabled={saving}><Icon name="check" size={14} /> {saving ? "Saving…" : "Save"}</Button>
        </div>
      </section>
    </div>
  );
}

const CONFIRM = "delete my account";

function SettingsView() {
  const notify = useToast();
  const router = useRouter();
  const live = useLive();
  const flows = useFlows();
  const [workspace, setWorkspace] = useWorkspaceName();
  const [step, setStep] = useState<"idle" | "confirm" | "deleting">("idle");
  const [typed, setTyped] = useState("");

  async function deleteAccount() {
    setStep("deleting");
    const res = await fetch("/api/account", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: typed }) }).catch(() => null);
    const body = (await res?.json().catch(() => ({}))) as { message?: string } | undefined;
    if (!res?.ok) {
      setStep("confirm");
      return notify(body?.message ?? "Couldn’t reach the server.", "bad");
    }
    notify(body?.message ?? "Account deleted.");
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="settings">
      <div className="page-head"><div><h1>Settings</h1><p>Your workspace, plan and account.</p></div></div>
      <section className="panel">
        <div className="form-sec">
          <label className="field">Workspace name
            <span className="hint">{live ? "Saved as you type." : "Kept in this browser only (sample workspace)."}</span>
            <input value={workspace} onChange={(e) => setWorkspace(e.target.value)} />
          </label>
        </div>
        <div className="setting" style={{ borderTop: "1px solid var(--line)", borderBottom: 0 }}>
          <span>
            <b>{live ? "Free beta" : "Starter plan (sample)"}</b>
            <span className="num">{flows.length} flow{flows.length === 1 ? "" : "s"} · hourly runs · recordings kept 7 days (30 for failures). Billing isn’t switched on yet.</span>
          </span>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <div className="panel-head"><h2>Your data</h2></div>
        <div className="form-sec" style={{ paddingBottom: 14, fontSize: 13, color: "var(--ink-2)" }}>
          <p>What we store and for how long is in the <Link className="link" href="/privacy">Privacy Policy</Link>. To get a copy of your data, email the address on that page.</p>
        </div>
      </section>

      <section className="panel danger" style={{ marginTop: 16 }} aria-labelledby="del-acc">
        <div className="panel-head"><h2 id="del-acc">Delete account</h2></div>
        {step === "idle" ? (
          <div className="confirm">
            <p style={{ fontSize: 13, color: "var(--ink-2)" }}>Deletes your login, your workspace, every flow and run, and all recordings, screenshots and logs. Shared replay links stop working. This can’t be undone.</p>
            <div><Button onClick={() => (live ? setStep("confirm") : notify("Sample workspace: there’s no account to delete.", "info"))}><span className="t-bad">Delete my account…</span></Button></div>
          </div>
        ) : (
          <div className="confirm" role="alertdialog" aria-labelledby="del-acc-q">
            <p id="del-acc-q" style={{ fontSize: 13 }}><b>Delete {live?.user.email ?? "this account"} and all {flows.length} flow{flows.length === 1 ? "" : "s"}?</b> Type <span className="mono">{CONFIRM}</span> to confirm.</p>
            <input className="input mono" value={typed} onChange={(e) => setTyped(e.target.value)} aria-label={`Type ${CONFIRM} to confirm`} autoComplete="off" style={{ maxWidth: 320, marginTop: 0 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn danger-solid" disabled={typed.trim().toLowerCase() !== CONFIRM || step === "deleting"} onClick={deleteAccount}>{step === "deleting" ? "Deleting…" : "Delete everything"}</button>
              <Button onClick={() => { setStep("idle"); setTyped(""); }}>Cancel</Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
