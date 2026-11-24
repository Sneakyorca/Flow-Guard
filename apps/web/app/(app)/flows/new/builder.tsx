"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { demoBuilderSteps } from "@/lib/demo-data";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Button, Icon } from "@/components/ui";
import { useToast } from "@/components/toast";
import { addFlow } from "@/components/flows-store";

const SCHEDULES: Array<[string, string]> = [["Every 1 hour", "0 * * * *"], ["Every 6 hours", "0 */6 * * *"], ["Daily", "0 6 * * *"]];

export function Builder() {
  const router = useRouter();
  const notify = useToast();
  const [flowName, setFlowName] = useState("");
  const [url, setUrl] = useState("https://example.com");
  const [device, setDevice] = useState("Desktop");
  const [schedule, setSchedule] = useState(SCHEDULES[0][0]);
  const [steps, setSteps] = useState(demoBuilderSteps);
  const [tested, setTested] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const domain = new URL(url).hostname;
    const supabase = getSupabaseBrowser();
    if (supabase) {
      // Live mode: insert into the signed-in user's workspace (RLS enforces ownership).
      setSaving(true);
      const { data: ws } = await supabase.from("workspaces").select("id").limit(1).maybeSingle();
      if (ws) {
        const { error } = await supabase.from("flows").insert({
          workspace_id: ws.id,
          name: flowName,
          start_url: url,
          viewport: device === "Mobile" ? "mobile" : "desktop",
          schedule_cron: SCHEDULES.find(([l]) => l === schedule)?.[1] ?? "0 * * * *",
          steps_json: steps.filter((s) => s.trim()).map((instruction) => ({ instruction })),
        });
        setSaving(false);
        if (error) return notify(`Could not save flow: ${error.message}`);
        notify("Flow saved. The next scheduled run will pick it up.");
        return router.push("/monitors");
      }
      setSaving(false);
    }
    addFlow({ id: `f-${Date.now()}`, name: flowName, domain, status: "passing", time: tested ? "Just now" : "Not run", detail: `${steps.length} configured steps`, duration: 4.2, schedule });
    notify("Flow created in this demo session. Scheduled monitoring is not active.");
    router.push("/monitors");
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <Link className="back-link" href="/monitors">← Back to monitors</Link>
          <h1>Create critical flow</h1>
          <p>If you can describe it, FlowGuard can test it. No scripts required.</p>
        </div>
        <span className="pill">PLAIN ENGLISH. REAL CONFIDENCE.</span>
      </div>
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.3fr] gap-6">
          <section className="config-card">
            <h2><Icon name="settings" /> Configuration</h2>
            <label className="field">Flow name<input required value={flowName} onChange={(e) => setFlowName(e.target.value)} placeholder="e.g. Signup & onboarding" /></label>
            <label className="field">Starting URL<input required type="url" className="mono" value={url} onChange={(e) => setUrl(e.target.value)} /></label>
            <div className="field">
              Device viewport
              <div className="device-toggle">
                {["Desktop", "Mobile"].map((d) => (
                  <button type="button" aria-pressed={device === d} className={device === d ? "selected" : ""} key={d} onClick={() => setDevice(d)}>
                    <Icon name={d === "Desktop" ? "monitor" : "mobile"} /><b>{d}</b><small>{d === "Desktop" ? "1440px" : "iPhone 15"}</small>
                  </button>
                ))}
              </div>
            </div>
            <label className="field">Run schedule
              <select value={schedule} onChange={(e) => setSchedule(e.target.value)}>
                {SCHEDULES.map(([label]) => <option key={label}>{label}</option>)}
              </select>
            </label>
            <div className="field">
              Alert preferences
              {["Slack webhook", "Email notifications", "Shareable replay link"].map((a, i) => (
                <label className="check-label" key={a}><input type="checkbox" defaultChecked={i > 0} />{a}</label>
              ))}
            </div>
            <div className="info-box"><Icon name="shield" /><p>Demo configuration only. Real browser runs, schedules, and notifications require a connected backend.</p></div>
          </section>
          <section className="config-card steps-config">
            <h2><Icon name="code" /> Plain-English steps<span className="pill">{steps.length} STEPS</span></h2>
            <p className="muted mb-6">Describe what a user should do, one action at a time.</p>
            <div className="space-y-4">
              {steps.map((s, i) => (
                <div className="step-editor" key={i}>
                  <div>
                    <span>{String(i + 1).padStart(2, "0")}</span><b>Step {i + 1}</b>
                    <button type="button" aria-label={`Remove step ${i + 1}`} disabled={steps.length === 1} onClick={() => { setSteps((ss) => ss.filter((_, n) => n !== i)); setTested(false); }}>
                      <Icon name="x" size={16} />
                    </button>
                  </div>
                  <textarea required aria-label={`Instruction for step ${i + 1}`} value={s} onChange={(e) => { setSteps((ss) => ss.map((v, n) => (n === i ? e.target.value : v))); setTested(false); }} />
                </div>
              ))}
            </div>
            <button type="button" className="add-step" onClick={() => { setSteps((ss) => [...ss, ""]); setTested(false); }}><Icon name="plus" /> Add step</button>
            <div className="builder-actions">
              <Button onClick={() => { setTested(true); notify(`Demo test: ${steps.length} steps validated for ${device.toLowerCase()}. No website was accessed.`); }}>
                <Icon name="play" size={16} /> {tested ? "Test again" : "Test Run Flow"}
              </Button>
              <Button primary type="submit" disabled={saving}><Icon name="plus" size={16} /> {saving ? "Saving…" : "Create flow"}</Button>
            </div>
            {tested && <p className="text-green mt-4">✓ Sample test completed. Ready to create your demo flow.</p>}
          </section>
        </div>
      </form>
    </>
  );
}
