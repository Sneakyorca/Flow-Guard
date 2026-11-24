import type { FailureExplanation, RunDiagnostics } from "@flowguard/shared";

/**
 * Turn a failed run into one plain sentence a non-developer can act on, plus the evidence.
 * Rules are ordered: the most specific signal wins.
 */
export function explainFailure(d: Omit<RunDiagnostics, "explanation">): FailureExplanation | null {
  if (d.status !== "FAILED") return null;
  const err = d.error_message ?? "";
  const idx = d.failed_step_index ?? 0;
  const step = d.steps[idx];
  const stepLabel = step ? `step ${idx + 1} (“${step.instruction}”)` : "the first page load";

  // Evidence gathered during the failing step (or the whole run if we can't window it).
  // Start the window at the previous step: a click that crashes the page often only shows up
  // as a failure in the next step ("expected text never appeared").
  const prev = idx > 0 ? d.steps[idx - 1] : undefined;
  const from = prev?.started_ms ?? step?.started_ms ?? 0;
  const to = step ? from + step.duration_ms + 1500 : Number.POSITIVE_INFINITY;
  const inWindow = (t: number) => t >= from - 250 && t <= to;
  const jsErrors = d.console_logs.filter((c) => c.type === "pageerror" && inWindow(c.at_ms));
  const serverErrors = d.network_errors.filter((n) => (n.status ?? 0) >= 500 && inWindow(n.at_ms));
  const failedRequests = d.network_errors.filter((n) => n.status === null && n.resource_type !== "image" && inWindow(n.at_ms));
  const evidence: string[] = [];
  for (const j of jsErrors.slice(0, 2)) evidence.push(`JavaScript error: ${j.text.split("\n")[0]}`);
  for (const s of serverErrors.slice(0, 2)) evidence.push(`${s.method} ${shortUrl(s.url)} returned ${s.status}`);
  for (const f of failedRequests.slice(0, 2)) evidence.push(`${f.method} ${shortUrl(f.url)} failed (${f.failure ?? "no response"})`);

  const make = (category: FailureExplanation["category"], title: string, detail: string, suggestion: string): FailureExplanation => ({ category, title, detail, suggestion, evidence });

  if (/Could not load start URL|Start page returned/.test(err)) {
    if (/ERR_NAME_NOT_RESOLVED/.test(err)) return make("site_down", "The site's address doesn't resolve", `The domain for ${d.start_url} could not be found.`, "Check the domain's DNS records and that it hasn't expired.");
    if (/returned 4\d\d/.test(err)) return make("site_down", "The start page doesn't exist", `The start page responded with ${after(err, "Start page returned ").split(" for ")[0]}.`, "The page was moved or deleted. Update the flow's start URL or restore the page.");
    if (/returned 5\d\d/.test(err)) return make("site_down", "The site is returning a server error", `The start page responded with an error: ${after(err, "Start page ")}`, "Check your hosting provider and server logs; the site is down for everyone.");
    return make("site_down", "The site didn't load", `Opening ${d.start_url} failed: ${firstClause(err)}`, "Check that the site is up and reachable from outside your network.");
  }

  // A JS exception right when the step ran is usually the real cause, whatever the step error says.
  if (jsErrors.length) {
    const during = prev && jsErrors[0].at_ms < (step?.started_ms ?? 0) ? `step ${idx} (“${prev.instruction}”)` : stepLabel;
    return make("js_error", `A JavaScript error broke ${during}`, `The page threw “${jsErrors[0].text.split("\n")[0]}” during ${during}, and ${stepLabel} then failed: ${firstClause(err)}`, "Open the console tab of the replay for the stack trace. Usually a script (for example a payment SDK) failed to load or crashed.");
  }
  if (serverErrors.length) {
    return make("server_error", `Your server failed during ${stepLabel}`, `${serverErrors[0].method} ${shortUrl(serverErrors[0].url)} returned ${serverErrors[0].status} while this step ran.`, "Check the API/server logs for that endpoint at the time of the run.");
  }
  if (/No element on the page matches|unknown element id|No text field/.test(err)) {
    return make("element_missing", `Couldn't find what ${stepLabel} describes`, "Nothing on the page matched the description, even after taking a fresh look.", "If the button or field was renamed or moved, update the step wording. If it should be there, the page may not have finished rendering.");
  }
  if (/Expected text/.test(err)) {
    const m = err.match(/Expected text "([^"]+)"/);
    return make("text_missing", `“${m?.[1] ?? "The expected text"}” never appeared`, `At ${stepLabel}, FlowGuard waited for this text but the page never showed it.`, "Either the previous action didn't do what it should (look at the step screenshot), or the wording on the page changed.");
  }
  if (/Expected URL/.test(err)) {
    return make("wrong_page", "Ended up on the wrong page", firstClause(err), "A link or redirect may have changed. Watch the replay to see where the browser went.");
  }
  if (/Timeout \d+ms exceeded/.test(err)) {
    return make("not_interactable", `The element for ${stepLabel} couldn't be used`, "It was found on the page but stayed disabled, hidden or covered (for example by a popup or cookie banner) until the timeout.", "Look at the step screenshot for an overlay or a disabled button.");
  }
  return make("other", `Failed at ${stepLabel}`, firstClause(err), "Watch the replay and check the console and network tabs.");
}

function shortUrl(u: string) {
  try {
    const url = new URL(u);
    return `${url.host}${url.pathname}`.slice(0, 120);
  } catch {
    return u.slice(0, 120);
  }
}

function firstClause(s: string) {
  return s.replace(/^Step \d+ \(".*?"\) failed: /, "").split(" | ")[0].slice(0, 300);
}

function after(s: string, marker: string) {
  const i = s.indexOf(marker);
  return i >= 0 ? s.slice(i + marker.length).split(" | ")[0] : s;
}
