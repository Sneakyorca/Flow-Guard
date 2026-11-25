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
const ALERTS = [
  { id: "slack", label: "Post to Slack", hint: "One message per confirmed failure", on: false },
  { id: "email", label: "Email me", hint: "To the workspace owner", on: true },
  { id: "share", label: "Make the replay link public", hint: "Anyone with the link can watch it", on: true },
];

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

  const edit = (fn: (s: string[]) => string[]) => { setSteps(fn); setTested(false); };

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
        if (error) return notify(`Couldn’t save the flow: ${error.message}`);
        notify("Saved. It runs at the next hourly check, or press Run on Monitors to start it now.");
        router.push("/monitors");
        return router.refresh();
      }
      setSaving(false);
    }
    addFlow({ id: `f-${Date.now()}`, name: flowName, domain, status: "passing", time: tested ? "just now" : "not run yet", detail: `${steps.length} steps`, duration: 4.2, schedule });
    notify("Added to this sample workspace. Connect Supabase to schedule real runs.");
    router.push("/monitors");
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Link className="back" href="/monitors"><Icon name="back" size={14} /> Monitors</Link>
          <h1>New flow</h1>
          <p>Write the journey the way you’d explain it to a new teammate, one action per step. FlowGuard opens the page and works out which button or field you mean.</p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="builder">
        <section className="panel" aria-labelledby="cfg">
          <div className="panel-head"><h2 id="cfg">Where and when</h2></div>
          <div className="form-sec">
            <label className="field">Name<input required value={flowName} onChange={(e) => setFlowName(e.target.value)} placeholder="Guest checkout" /></label>
            <label className="field">Start page<span className="hint">The first URL the browser opens.</span><input required type="url" className="mono" value={url} onChange={(e) => setUrl(e.target.value)} /></label>
            <div className="field" role="group" aria-label="Screen size">
              Screen size
              <div className="choice">
                {[["Desktop", "monitor", "1440 × 900"], ["Mobile", "mobile", "390 × 844, like an iPhone 15"]].map(([d, icon, sub]) => (
                  <button type="button" key={d} aria-pressed={device === d} onClick={() => setDevice(d)}>
                    <Icon name={icon} size={18} /><span><b>{d}</b><small>{sub}</small></span>
                  </button>
                ))}
              </div>
            </div>
            <label className="field">How often
              <select value={schedule} onChange={(e) => setSchedule(e.target.value)}>
                {SCHEDULES.map(([label]) => <option key={label}>{label}</option>)}
              </select>
            </label>
            <fieldset className="field">
              <legend>When it fails</legend>
              {ALERTS.map((a) => (
                <label className="check" key={a.id}><input type="checkbox" defaultChecked={a.on} /><span>{a.label} <span className="muted">· {a.hint}</span></span></label>
              ))}
            </fieldset>
            <p className="muted" style={{ fontSize: 12.5, paddingBottom: 12 }}>A failed run is re-run once before anyone is alerted, so a single network blip won’t wake you up.</p>
          </div>
        </section>

        <section className="panel" aria-labelledby="steps-h">
          <div className="panel-head"><h2 id="steps-h">Steps</h2><span className="meta num">{steps.length} step{steps.length === 1 ? "" : "s"}</span></div>
          <div className="form-sec" style={{ paddingTop: 4 }}>
            <ol className="steps">
              {steps.map((s, i) => (
                <li key={i}>
                  <textarea required rows={1} aria-label={`Step ${i + 1}`} value={s} placeholder="Click “Add to cart”" onChange={(e) => edit((ss) => ss.map((v, n) => (n === i ? e.target.value : v)))} />
                  <button type="button" className="rm" aria-label={`Remove step ${i + 1}`} disabled={steps.length === 1} onClick={() => edit((ss) => ss.filter((_, n) => n !== i))}>
                    <Icon name="x" size={15} />
                  </button>
                </li>
              ))}
            </ol>
            <Button variant="ghost" onClick={() => edit((ss) => [...ss, ""])}><Icon name="plus" /> Add a step</Button>
            <div className="guide">
              <b>Phrasing that works well</b>
              <ul>
                <li><code>Click “Sign up”</code> or <code>Click the Active filter</code></li>
                <li><code>Type “ada@example.com” into the email field</code>, add <code>and press Enter</code> to submit</li>
                <li><code>Go to /pricing</code> or a full URL</li>
                <li><code>Check that “Order confirmed” is visible</code>, <code>Check the URL contains /thank-you</code></li>
              </ul>
            </div>
          </div>
          <div className="actions">
            {tested && <span className="msg" role="status"><Icon name="check-circle" size={14} /> Steps look runnable (sample check, no site visited)</span>}
            <Button onClick={() => { setTested(true); notify(`Checked ${steps.length} steps for a ${device.toLowerCase()} browser. Sample mode: no site was visited.`); }}>
              <Icon name="play" size={14} /> {tested ? "Test again" : "Test run"}
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Create flow"}</Button>
          </div>
        </section>
      </form>
    </>
  );
}
