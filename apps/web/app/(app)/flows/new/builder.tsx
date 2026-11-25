"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { demoBuilderSteps } from "@/lib/demo-data";
import { SCHEDULES } from "@/lib/flow-detail";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Button, Icon } from "@/components/ui";
import { useToast } from "@/components/toast";
import { addFlow, updateFlow } from "@/components/flows-store";
import { useLive } from "@/components/live-data";
import { useRunTracker } from "@/components/run-tracker";

/** Existing flow being edited; absent for a new flow. */
export interface BuilderInitial {
  id: string;
  name: string;
  url: string;
  viewport: "desktop" | "mobile";
  scheduleCron: string | null;
  steps: string[];
  source: "live" | "demo";
}

export function Builder({ initial }: { initial?: BuilderInitial }) {
  const router = useRouter();
  const notify = useToast();
  const live = useLive();
  const tracker = useRunTracker();
  const editing = Boolean(initial);
  const [flowName, setFlowName] = useState(initial?.name ?? "");
  const [url, setUrl] = useState(initial?.url ?? "https://example.com");
  const [device, setDevice] = useState(initial?.viewport === "mobile" ? "Mobile" : "Desktop");
  const [schedule, setSchedule] = useState(SCHEDULES.find(([, c]) => c === initial?.scheduleCron)?.[0] ?? SCHEDULES[0][0]);
  const [steps, setSteps] = useState(initial?.steps.length ? initial.steps : demoBuilderSteps);
  const [tested, setTested] = useState(false);
  const [saving, setSaving] = useState(false);
  const back = initial ? `/flows/${initial.id}` : "/monitors";

  const edit = (fn: (s: string[]) => string[]) => { setSteps(fn); setTested(false); };

  /** Save (insert or update). Returns the flow id, or null on failure. */
  async function save(): Promise<string | null> {
    const domain = new URL(url).hostname;
    const supabase = getSupabaseBrowser();
    const row = {
      name: flowName.trim(),
      start_url: url,
      viewport: device === "Mobile" ? "mobile" : "desktop",
      schedule_cron: SCHEDULES.find(([l]) => l === schedule)?.[1] ?? "0 * * * *",
      steps_json: steps.filter((s) => s.trim()).map((instruction) => ({ instruction: instruction.trim() })),
    };
    if (supabase && live) {
      // Live mode: RLS makes sure the flow belongs to the signed-in user's workspace.
      setSaving(true);
      if (initial) {
        const { error } = await supabase.from("flows").update(row).eq("id", initial.id);
        setSaving(false);
        if (error) { notify(`Couldn’t save the flow: ${error.message}`, "bad"); return null; }
        return initial.id;
      }
      const { data: ws } = await supabase.from("workspaces").select("id").limit(1).maybeSingle();
      if (!ws) { setSaving(false); notify("Couldn’t find your workspace. Log out and back in, then try again.", "bad"); return null; }
      const { data, error } = await supabase.from("flows").insert({ ...row, workspace_id: ws.id }).select("id").single();
      setSaving(false);
      if (error) { notify(`Couldn’t save the flow: ${error.message}`, "bad"); return null; }
      return data.id as string;
    }
    if (initial) {
      updateFlow(initial.id, { name: row.name, domain, schedule, detail: `${row.steps_json.length} steps` });
      return initial.id;
    }
    const id = `f-${Date.now()}`;
    addFlow({ id, name: row.name, domain, status: "pending", time: "not run yet", detail: "Waiting for its first run.", duration: 0, schedule, lastRunLabel: "Not run yet" });
    return id;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = await save();
    if (!id) return;
    notify(live
      ? editing ? "Saved. The next run uses the new steps." : "Saved. It runs at the next scheduled check, or press Run now."
      : editing ? "Saved in this sample workspace." : "Added to this sample workspace. Connect Supabase to schedule real runs.");
    router.push(live || editing ? `/flows/${id}` : "/monitors");
    router.refresh();
  }

  /** Live: save, start a real run on GitHub Actions, and go to the flow page to watch it. */
  async function saveAndRun() {
    const form = document.getElementById("builder-form") as HTMLFormElement | null;
    if (form && !form.reportValidity()) return;
    const id = await save();
    if (!id) return;
    await tracker.start(id, flowName.trim());
    router.push(`/flows/${id}`);
    router.refresh();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <Link className="back" href={back}><Icon name="back" size={14} /> {initial ? initial.name : "Monitors"}</Link>
          <h1>{editing ? "Edit flow" : "New flow"}</h1>
          <p>Write the journey the way you’d explain it to a new teammate, one action per step. FlowGuard opens the page and works out which button or field you mean.</p>
        </div>
      </div>
      <form id="builder-form" onSubmit={onSubmit} className="builder">
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
            <div className="field">
              When it fails
              <span className="hint">A failed run is re-run once before anyone is alerted, so a single network blip won’t wake you up. Who gets told is set once for the whole workspace in <Link className="link" href="/alerts">Alerts</Link>.</span>
            </div>
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
                <li>Fresh test data on every run, for signups that reject an email they’ve seen: <code>{"Type {{random_email}} into the email field"}</code>, <code>{"Type \u201c{{random_name}}\u201d into the name field"}</code>, also <code>{"{{timestamp}}"}</code> and <code>{"{{random_number}}"}</code>.</li>
              </ul>
            </div>
          </div>
          <div className="actions">
            {live ? (
              <>
                <span className="msg muted" style={{ color: "var(--muted)" }}>Runs in a real browser on GitHub Actions, about 2–3 minutes.</span>
                <Button onClick={saveAndRun} disabled={saving}><Icon name="play" size={14} /> Save and run now</Button>
              </>
            ) : (
              <>
                {tested && <span className="msg" role="status"><Icon name="check-circle" size={14} /> Steps look runnable (sample check, no site visited)</span>}
                <Button onClick={() => { setTested(true); notify(`Checked ${steps.length} steps for a ${device.toLowerCase()} browser. Sample mode: no site was visited.`, "info"); }}>
                  <Icon name="play" size={14} /> {tested ? "Check again" : "Check steps"}
                </Button>
              </>
            )}
            <Button variant="primary" type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Create flow"}</Button>
          </div>
        </section>
      </form>
    </>
  );
}
