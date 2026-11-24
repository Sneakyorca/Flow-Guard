import type { FlowRow, RunDiagnostics } from "@flowguard/shared";

/** Post a failure alert to a Slack incoming webhook (free). */
export async function sendSlackAlert(webhookUrl: string, flow: Pick<FlowRow, "name" | "start_url" | "viewport">, d: RunDiagnostics, replayUrl: string): Promise<void> {
  const failed = d.failed_step_index !== null ? d.steps[d.failed_step_index] : undefined;
  const stepLine = failed ? `Step ${failed.index + 1}: ${failed.instruction}` : "Could not load the start page";
  const extras = [
    d.console_logs.filter((c) => c.type === "pageerror" || c.type === "error").length ? `${d.console_logs.filter((c) => c.type === "pageerror" || c.type === "error").length} JS errors` : null,
    d.network_errors.length ? `${d.network_errors.length} failed requests` : null,
  ].filter(Boolean).join(" · ");

  const text = `FlowGuard: "${flow.name}" failed — ${d.explanation?.title ?? stepLine}`;
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
