"use client";
import { demoFlows } from "@/lib/demo-data";
import { Button, Icon } from "./ui";
import { useToast } from "./toast";
import { useWorkspaceName } from "./workspace";

export function Preferences({ view }: { view: "alerts" | "settings" }) {
  const notify = useToast();
  const [workspace, setWorkspace] = useWorkspaceName();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">WORKSPACE CONFIGURATION</div>
          <h1>{view === "alerts" ? "Alerts & integrations" : "Workspace settings"}</h1>
          <p>Demo preferences are kept for this session only.</p>
        </div>
      </div>
      <section className="config-card max-w-3xl">
        {view === "alerts" ? (
          <>
            <h2><Icon name="bell" /> Stay one step ahead</h2>
            {["Email alerts", "Slack notifications", "Include replay links"].map((s) => (
              <label className="check-label integration-row" key={s}>
                <span><b>{s}</b><small className="block muted">Configure your demo notification preference</small></span>
                <input type="checkbox" defaultChecked={s !== "Slack notifications"} />
              </label>
            ))}
            <label className="field mt-5">Slack webhook URL<input type="url" placeholder="https://hooks.slack.com/services/…" /></label>
            <div className="info-box mb-5">No notifications are sent in this prototype.</div>
          </>
        ) : (
          <>
            <h2><Icon name="settings" /> General settings</h2>
            <label className="field">Workspace name<input value={workspace} onChange={(e) => setWorkspace(e.target.value)} /></label>
            <label className="field">Timezone
              <select>
                <option>UTC — Coordinated Universal Time</option>
                <option>Africa/Lagos — WAT</option>
                <option>America/New_York — Eastern</option>
              </select>
            </label>
            <div className="info-box mb-5"><Icon name="shield" /><p>Pro plan · {demoFlows.length} of 25 flows used. Billing is not connected in this demo.</p></div>
          </>
        )}
        <Button primary onClick={() => notify("Demo preferences saved for this session.")}>Save preferences <Icon name="check" size={16} /></Button>
      </section>
    </>
  );
}
