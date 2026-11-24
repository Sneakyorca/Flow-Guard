"use client";
import { useState } from "react";
import { Button, Icon } from "./ui";
import { useToast } from "./toast";
import { useWorkspaceName } from "./workspace";
import { useFlows } from "./flows-store";

const ALERT_SETTINGS = [
  { id: "email", label: "Email", hint: "One email per confirmed failure, and one when it recovers.", on: true },
  { id: "slack", label: "Slack", hint: "Posts to the channel behind the webhook below. Flaky runs are never posted.", on: false },
  { id: "links", label: "Include the replay link", hint: "Alerts link to the public replay so whoever fixes it doesn’t need an account.", on: true },
];

export function Preferences({ view }: { view: "alerts" | "settings" }) {
  const notify = useToast();
  const flows = useFlows();
  const [workspace, setWorkspace] = useWorkspaceName();
  const [webhook, setWebhook] = useState("");
  const save = () => notify("Saved in this browser. Connect Supabase to save for your whole team.");

  if (view === "alerts") {
    return (
      <div className="settings">
        <div className="page-head"><div><h1>Alerts</h1><p>Who hears about a failure, and how. A failed run is checked a second time before any alert goes out.</p></div></div>
        <section className="panel">
          {ALERT_SETTINGS.map((s) => (
            <label className="setting" key={s.id}>
              <span><b>{s.label}</b><span>{s.hint}</span></span>
              <input className="switch" type="checkbox" role="switch" defaultChecked={s.on} aria-label={s.label} />
            </label>
          ))}
          <div className="form-sec">
            <label className="field">Slack incoming webhook
              <span className="hint">In Slack: Apps → Incoming Webhooks → Add to a channel, then paste the URL here.</span>
              <input type="url" className="mono" value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://hooks.slack.com/services/T000/B000/XXXX" />
            </label>
          </div>
          <div className="actions">
            <span className="muted" style={{ marginRight: "auto", fontSize: 12.5 }}>Sample workspace: nothing is sent.</span>
            <Button variant="primary" onClick={save}><Icon name="check" size={14} /> Save</Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="settings">
      <div className="page-head"><div><h1>Settings</h1><p>Workspace name, time zone and plan.</p></div></div>
      <section className="panel">
        <div className="form-sec">
          <label className="field">Workspace name<input value={workspace} onChange={(e) => setWorkspace(e.target.value)} /></label>
          <label className="field">Time zone
            <span className="hint">Used for run times in alerts and replays.</span>
            <select defaultValue="Africa/Lagos">
              <option value="UTC">UTC</option>
              <option value="Africa/Lagos">Africa/Lagos (WAT, UTC+1)</option>
              <option value="Africa/Nairobi">Africa/Nairobi (EAT, UTC+3)</option>
              <option value="Africa/Johannesburg">Africa/Johannesburg (SAST, UTC+2)</option>
              <option value="Europe/London">Europe/London</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </label>
        </div>
        <div className="setting" style={{ borderTop: "1px solid var(--line)" }}>
          <span><b>Starter plan</b><span className="num">{flows.length} of 25 flows used · hourly runs · 30 days of replays. Billing isn’t connected yet.</span></span>
        </div>
        <div className="actions"><Button variant="primary" onClick={save}><Icon name="check" size={14} /> Save</Button></div>
      </section>
    </div>
  );
}
