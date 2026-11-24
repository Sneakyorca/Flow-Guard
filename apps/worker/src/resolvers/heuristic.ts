import type { DomNode, ResolvedStep } from "@flowguard/shared";
import { selectorForId } from "@flowguard/shared";
import type { ResolveInput, Resolver } from "./types.js";

/**
 * Zero-key resolver: parses the instruction with a few verb patterns, then scores
 * DOM snapshot nodes by keyword overlap, quoted-text matches and role hints.
 * Deterministic, free, and good enough for most "click X / type Y into Z / check Z" flows.
 */

const STOP = new Set(["the", "a", "an", "on", "in", "into", "to", "of", "and", "then", "field", "box", "button", "link", "input", "filter", "tab", "with", "for", "that", "is", "it", "this", "page", "element", "named", "called", "labelled", "labeled"]);
const KEY_ALIASES: Record<string, string> = {
  enter: "Enter", return: "Enter", tab: "Tab", escape: "Escape", esc: "Escape", space: "Space",
  backspace: "Backspace", delete: "Delete", "arrow down": "ArrowDown", "arrow up": "ArrowUp",
  down: "ArrowDown", up: "ArrowUp", left: "ArrowLeft", right: "ArrowRight",
};

const ROLE_HINTS: Array<[RegExp, string[]]> = [
  [/\b(input|field|textbox|text box|box|textarea|search bar|search box)\b/, ["textbox", "combobox"]],
  [/\b(button|btn|cta)\b/, ["button"]],
  [/\b(link|filter|tab|nav|menu item)\b/, ["link", "tab", "button", "menuitem"]],
  [/\b(checkbox|tick|toggle)\b/, ["checkbox", "switch"]],
  [/\b(dropdown|select|combobox)\b/, ["combobox"]],
  [/\b(heading|title)\b/, ["heading"]],
];

/**
 * Words people use interchangeably for the same control. Phrases are folded into one
 * canonical token first, then single words, so "Sign up", "Register" and "Create account"
 * all become "signup" on both sides of the comparison.
 */
const PHRASES: Array<[RegExp, string]> = [
  [/\b(sign|signing) up\b|\bcreate (an |your )?account\b|\bget started\b/g, "signup"],
  [/\b(log|sign|logging|signing) in(to)?\b/g, "login"],
  [/\b(log|sign|logging|signing) out\b/g, "logout"],
  [/\bcheck out\b|\bplace (my |the )?order\b|\bproceed to (checkout|payment)\b|\bbuy now\b|\bpay now\b/g, "checkout"],
  [/\badd to (cart|bag|basket)\b/g, "addtocart"],
  [/\be-?mail address\b/g, "email"],
  [/\bphone number\b|\bmobile number\b/g, "phone"],
  [/\bfull name\b/g, "name"],
];
const WORDS: Record<string, string> = {
  register: "signup", join: "signup", enroll: "signup", signup: "signup",
  signin: "login", login: "login", logon: "login",
  signout: "logout", logout: "logout",
  bag: "cart", basket: "cart", trolley: "cart", cart: "cart",
  pay: "checkout", purchase: "checkout", checkout: "checkout",
  find: "search", lookup: "search",
  mail: "email", "e-mail": "email",
  passcode: "password", pwd: "password",
  send: "submit", continue: "submit", proceed: "submit", next: "submit", go: "submit",
  dismiss: "close", hamburger: "menu", telephone: "phone", mobile: "phone",
  newsletter: "subscribe", qty: "quantity",
};

function stem(t: string): string {
  if (t.length > 5 && t.endsWith("ing")) return t.slice(0, -3);
  if (t.length > 4 && t.endsWith("ed")) return t.slice(0, -2);
  if (t.length > 3 && t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

export function canonical(s: string): string {
  let out = s.toLowerCase();
  for (const [re, rep] of PHRASES) out = out.replace(re, ` ${rep} `);
  return out;
}

export function tokenize(s: string): string[] {
  return canonical(s)
    .replace(/[^a-z0-9@._\s-]/g, " ")
    .split(/[\s_-]+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map((t) => WORDS[t] ?? WORDS[stem(t)] ?? stem(t));
}

function quoted(s: string): string[] {
  const out: string[] = [];
  const re = /["“”'‘’]([^"“”'‘’]+)["“”'‘’]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.push(m[1].trim());
  return out;
}

function stripQuotes(s: string) {
  return s.replace(/^["“”'‘’]|["“”'‘’]$/g, "").trim();
}

function norm(s: string | undefined) {
  return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

const INTERACTIVE_ROLES = new Set(["button", "link", "textbox", "combobox", "checkbox", "radio", "tab", "menuitem", "option", "switch", "slider"]);

export interface Scored { node: DomNode; score: number }

/** Score how well a node matches a free-text target description. */
export function scoreNodes(nodes: DomNode[], description: string, opts: { wantRoles?: string[]; preferFields?: boolean } = {}): Scored[] {
  const desc = description.toLowerCase();
  const q = quoted(description).map(norm);
  const tokens = tokenize(description.replace(/["“”'‘’][^"“”'‘’]+["“”'‘’]/g, (m) => ` ${m} `));
  const wantRoles = opts.wantRoles ?? ROLE_HINTS.filter(([re]) => re.test(desc)).flatMap(([, r]) => r);

  return nodes
    .map((node) => {
      const name = norm(node.name);
      const text = norm(node.text);
      const ph = norm(node.placeholder);
      const hint = norm(node.hint);
      const hay = `${name} ${text} ${ph} ${hint} ${norm(node.href)}`;
      let score = 0;

      for (const qq of q) {
        if (!qq) continue;
        if (name === qq || text === qq) score += 60;
        else if (ph === qq) score += 50;
        else if (name.includes(qq) || text.includes(qq) || ph.includes(qq)) score += 25 - Math.min(15, Math.abs(name.length - qq.length) / 4);
      }
      const hayTokens = new Set(tokenize(hay));
      let hits = 0;
      for (const t of tokens) {
        if (hayTokens.has(t)) { hits++; score += 8; }
        else if (hay.includes(t)) { hits++; score += 4; }
      }
      if (tokens.length && hits === tokens.length) score += 6;

      if (wantRoles.length) {
        if (wantRoles.includes(node.role)) score += 12;
        else if (INTERACTIVE_ROLES.has(node.role)) score -= 2;
        else score -= 8;
      }
      if (opts.preferFields && (node.role === "textbox" || node.role === "combobox")) score += 10;
      if (INTERACTIVE_ROLES.has(node.role)) score += 2;
      // Prefer concise nodes: a container whose text merely *contains* the target is a weaker match.
      if (name.length > 80) score -= 4;
      return { node, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

function step(action: ResolvedStep["action"], node: DomNode | null, value: string | null, reasoning: string): ResolvedStep {
  return {
    action,
    target_id: node?.id ?? null,
    selector_or_coordinates: node ? selectorForId(node.id) : null,
    value,
    reasoning,
  };
}

function describe(n: DomNode) {
  return `#${n.id} ${n.role} "${n.name || n.text || n.placeholder || n.hint || n.tag}"`;
}

function pick(nodes: DomNode[], target: string, opts: Parameters<typeof scoreNodes>[2], verb: string): { node: DomNode; why: string } {
  const ranked = scoreNodes(nodes, target, opts);
  const best = ranked[0];
  if (!best || best.score < 10) {
    throw new HeuristicMiss(`No element on the page matches "${target}" for ${verb}. Closest: ${ranked.slice(0, 3).map((r) => describe(r.node)).join(", ") || "none"}`);
  }
  const runner = ranked[1];
  const margin = runner ? ` (next best ${describe(runner.node)} scored ${runner.score.toFixed(0)})` : "";
  return { node: best.node, why: `Matched "${target}" to ${describe(best.node)} with score ${best.score.toFixed(0)}${margin}.` };
}

export class HeuristicMiss extends Error {}

/** Parse one clause (no "and then") into actions. */
function resolveClause(clause: string, input: ResolveInput, prev: ResolvedStep | undefined): ResolvedStep[] {
  const c = clause.trim().replace(/[.]$/, "");
  const lower = c.toLowerCase();
  const { nodes } = input;
  let m: RegExpMatchArray | null;

  // press <key> [in <target>]
  if ((m = lower.match(/^(?:press|hit|tap)\s+(?:the\s+)?(enter|return|tab|escape|esc|space|backspace|delete|arrow down|arrow up|down|up|left|right)(?:\s+key)?(?:\s+(?:in|on)\s+(.+))?$/))) {
    const key = KEY_ALIASES[m[1]] ?? m[1];
    if (m[2]) {
      const { node, why } = pick(nodes, m[2], { preferFields: true }, "press");
      return [step("press", node, key, `Press ${key}. ${why}`)];
    }
    // Pressing after typing: reuse the field we just filled.
    if (prev?.target_id) return [{ ...step("press", null, key, `Press ${key} in the field filled by the previous action.`), target_id: prev.target_id, selector_or_coordinates: prev.selector_or_coordinates }];
    return [step("press", null, key, `Press ${key} on the focused element.`)];
  }

  // navigate / go to / open / visit
  if ((m = c.match(/^(?:navigate|go|browse)\s+(?:to\s+)?(.+)$|^(?:open|visit|load)\s+(.+)$/i))) {
    const raw = stripQuotes((m[1] ?? m[2]).trim());
    const urlish = raw.match(/(https?:\/\/\S+|\/\S*)/);
    if (urlish) {
      const url = new URL(urlish[1], input.url).toString();
      return [step("navigate", null, url, `Navigate to ${url}.`)];
    }
    // "go to the pricing page" -> click the matching link instead
    const { node, why } = pick(nodes, raw.replace(/\bpage\b/i, ""), { wantRoles: ["link", "button", "tab", "menuitem"] }, "navigation");
    return [step("click", node, null, `No URL given; clicking the link instead. ${why}`)];
  }

  // assert URL
  if ((m = c.match(/\b(?:url|address|location)\b.*?\b(?:contains?|includes?|is|equals?|ends with|matches)\s+(.+)$/i))) {
    const val = stripQuotes(m[1].trim());
    return [step("assert_url", null, val, `Check that the current URL contains "${val}".`)];
  }

  // assert text
  if (/^(?:assert|verify|check|confirm|expect|ensure|make sure|see|wait for|should see)\b/i.test(c) || /\b(?:is|are)\s+(?:visible|shown|displayed|listed|present)\b|\bappears?\b|\bin the list\b/i.test(c)) {
    const q = quoted(c);
    if (q.length) {
      const text = q[0];
      const ranked = scoreNodes(nodes, `"${text}"`, { wantRoles: [] }).filter((r) => norm(r.node.text).includes(norm(text)) || norm(r.node.name).includes(norm(text)));
      // Prefer a listitem/heading when the instruction mentions a list/heading.
      const wantList = /\blist\b/i.test(c);
      const node = (wantList ? ranked.find((r) => r.node.role === "listitem") : undefined)?.node ?? ranked[0]?.node ?? null;
      return [step("assert_text", node, text, node ? `Expect "${text}" to be visible; currently found in ${describe(node)}.` : `Expect "${text}" to appear somewhere on the page.`)];
    }
    const tail = c.replace(/^(?:assert|verify|check|confirm|expect|ensure|make sure|see|wait for|should see)\s+(?:that\s+)?/i, "");
    const words = tail.replace(/\b(?:is|are)\s+(?:visible|shown|displayed|listed|present).*$/i, "").replace(/\b(?:loads?|appears?)\b.*$/i, "").trim();
    return [step("assert_text", null, words, `Expect "${words}" to appear on the page.`)];
  }

  // fill: type "X" into Y | fill Y with "X" | enter "X" in Y
  if ((m = c.match(/^(?:type|enter|input|write|put)\s+(["“'‘].+?["”'’]|\S+)\s+(?:into|in|on)\s+(.+)$/i))) {
    const value = stripQuotes(m[1]);
    const { node, why } = pick(nodes, m[2], { preferFields: true }, "typing");
    return [step("fill", node, value, `Type "${value}". ${why}`)];
  }
  if ((m = c.match(/^(?:fill(?:\s+in|\s+out)?|set|complete)\s+(.+?)\s+(?:with|to|as)\s+(.+)$/i))) {
    const value = stripQuotes(m[2]);
    const { node, why } = pick(nodes, m[1], { preferFields: true }, "typing");
    return [step("fill", node, value, `Fill with "${value}". ${why}`)];
  }
  if ((m = c.match(/^(?:type|enter|input|write|search(?:\s+for)?)\s+(.+)$/i))) {
    const value = stripQuotes(m[1]);
    const ranked = scoreNodes(nodes, "input field", { preferFields: true, wantRoles: ["textbox", "combobox"] });
    if (!ranked[0]) throw new HeuristicMiss(`No text field on the page to type "${value}" into.`);
    return [step("fill", ranked[0].node, value, `Type "${value}" into the most likely text field ${describe(ranked[0].node)}.`)];
  }

  // check / select checkbox or option
  if ((m = c.match(/^(?:click|tap|press|select|choose|pick|open|toggle|tick|check|hit)\s+(?:on\s+)?(.+)$/i))) {
    const target = m[1];
    const { node, why } = pick(nodes, target, {}, "click");
    return [step("click", node, null, `Click. ${why}`)];
  }

  // Fallback: treat the whole thing as a click target description.
  const { node, why } = pick(nodes, c, {}, "click");
  return [step("click", node, null, `Interpreted as a click. ${why}`)];
}

export function splitClauses(instruction: string): string[] {
  // Protect quoted text so we don't split "Buy milk and eggs".
  const stash: string[] = [];
  const masked = instruction.replace(/["“”'‘’][^"“”'‘’]*["“”'‘’]/g, (m) => { stash.push(m); return `\u0000${stash.length - 1}\u0000`; });
  return masked
    .split(/\s*(?:,\s*)?\b(?:and then|then|and)\b\s+(?=(?:press|hit|click|tap|type|enter|fill|select|choose|check|verify|assert|confirm|navigate|go|open|submit|wait|expect|ensure|make sure)\b)|\s*;\s*/i)
    .map((p) => p.replace(/\u0000(\d+)\u0000/g, (_, i) => stash[Number(i)]))
    .filter((p) => p.trim().length > 0);
}

export const heuristicResolver: Resolver = {
  name: "heuristic",
  async resolve(raw) {
    // Self-healing retries pass the ids that already failed; drop them from consideration.
    const input = raw.excludeIds?.length ? { ...raw, nodes: raw.nodes.filter((n) => !raw.excludeIds!.includes(n.id)) } : raw;
    const actions: ResolvedStep[] = [];
    for (const clause of splitClauses(input.instruction)) {
      const lower = clause.toLowerCase().trim();
      if (/^submit\b/.test(lower)) {
        const ranked = scoreNodes(input.nodes, clause.replace(/^submit/i, "submit"), { wantRoles: ["button"] });
        const node = ranked[0]?.node;
        if (node) actions.push(step("click", node, null, `Submit by clicking ${describe(node)}.`));
        else actions.push(step("press", actions.at(-1)?.target_id ? input.nodes.find((n) => n.id === actions.at(-1)?.target_id) ?? null : null, "Enter", "No submit button found; pressing Enter."));
        continue;
      }
      actions.push(...resolveClause(clause, input, actions.at(-1)));
    }
    return { actions };
  },
};
