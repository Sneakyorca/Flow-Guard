import type { FlowRow, RunDiagnostics } from "@flowguard/shared";

/** Post a failure alert to a Slack incoming webhook (free). */
export async function sendSlackAlert(webhookUrl: string, flow: Pick<FlowRow, "name" | "start_url" | "viewport">, d: RunDiagnostics, replayUrl: string): Promise<void> {
  const failed = d.failed_step_index !== null ? d.steps[d.failed_step_index] : undefined;
  const stepLine = failed ? `Step ${failed.index + 1}: ${failed.instruction}` : "Could not load the start page";
  const extras = [
    d.console_logs.filter((c) => c.type === "pageerror" || c.type === "error").length ? `${d.console_logs.filter((c) => c.type === "pageerror" || c.type === "error").length} JS errors` : null,
    d.network_errors.length ? `${d.network_errors.length} failed requests` : null,
  ].filter(Boolean).join(" · ");

  const text = `Oluso: "${flow.name}" failed — ${d.explanation?.title ?? stepLine}`;
  const body = {
    text,
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: `*${escape(flow.name)}* failed on ${escape(new URL(flow.start_url).host)} (${flow.viewport})` } },
      { type: "section", text: { type: "mrkdwn", text: `*${escape(d.explanation?.title ?? stepLine)}*\n${escape(d.explanation ? `${d.explanation.detail} ${d.explanation.suggestion}` : "")}\n${escape(stepLine)}\n\`${escape((d.error_message ?? "").slice(0, 300))}\`${extras ? `\n${extras}` : ""}` } },
      { type: "actions", elements: [{ type: "button", text: { type: "plain_text", text: "Watch the replay" }, url: replayUrl }] },
    ],
  };
  const res = await fetch(webhookUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Slack responded ${res.status}`);
}

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Optional free email alerts through Brevo's transactional API (300 emails/day free,
 * no domain needed: verify one sender address in Brevo). Skips quietly when
 * BREVO_API_KEY or ALERT_FROM_EMAIL isn't set.
 */
export async function sendEmailAlert(to: string, flow: Pick<FlowRow, "name" | "start_url" | "viewport">, d: RunDiagnostics, replayUrl: string): Promise<boolean> {
  const key = process.env.BREVO_API_KEY;
  const from = process.env.ALERT_FROM_EMAIL;
  if (!key || !from) return false;
  const host = new URL(flow.start_url).host;
  const failed = d.failed_step_index !== null ? d.steps[d.failed_step_index] : undefined;
  const headline = d.explanation?.title ?? (failed ? `Step ${failed.index + 1} failed: ${failed.instruction}` : "The start page didn't load");
  const html = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
  const lines = [
    `${flow.name} failed on ${host} (${flow.viewport}), twice in a row.`,
    "",
    headline,
    d.explanation?.suggestion ? `What to check: ${d.explanation.suggestion}` : "",
    "",
    `Watch the replay: ${replayUrl}`,
    "",
    "You get this because email alerts are on in Oluso → Alerts.",
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "");
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": key, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { email: from, name: process.env.ALERT_FROM_NAME || "Oluso" },
      to: [{ email: to }],
      subject: `Failing: ${flow.name} on ${host}`,
      textContent: lines.join("\n"),
      htmlContent: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#17160f">
<p><b>${html(flow.name)}</b> failed on ${html(host)} (${html(flow.viewport)}), twice in a row.</p>
<p style="padding:12px 14px;background:#fbecea;border-radius:6px">${html(headline)}</p>
${d.explanation?.suggestion ? `<p><b>What to check:</b> ${html(d.explanation.suggestion)}</p>` : ""}
<p><a href="${html(replayUrl)}" style="display:inline-block;padding:9px 14px;background:#17160f;color:#f6f5f1;border-radius:6px;text-decoration:none">Watch the replay</a></p>
<p style="color:#6b685e;font-size:13px">You get this because email alerts are on in Oluso → Alerts.</p></div>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Brevo responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return true;
}
