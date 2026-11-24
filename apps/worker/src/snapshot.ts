import type { Page } from "playwright";
import type { DomNode } from "@flowguard/shared";

export const MAX_NODES = 400;

/**
 * Walk visible interactive + text elements, stamp each with a fresh `data-fg-id`
 * and return a compact description the resolver can reason about.
 * Runs inside the page; must be self-contained (no closures over Node scope).
 */
export async function takeSnapshot(page: Page, maxNodes = MAX_NODES): Promise<DomNode[]> {
  await page.evaluate("globalThis.__name = globalThis.__name || ((f) => f);");
  return page.evaluate((limit: number) => {
    const INTERACTIVE = "a[href],button,input:not([type=hidden]),select,textarea,summary,label,[role=button],[role=link],[role=checkbox],[role=radio],[role=tab],[role=menuitem],[role=option],[role=switch],[role=combobox],[role=textbox],[onclick],[contenteditable=''],[contenteditable=true],[tabindex]:not([tabindex='-1'])";
    const TEXTY = new Set(["H1", "H2", "H3", "H4", "H5", "H6", "P", "LI", "TD", "TH", "SPAN", "DIV", "STRONG", "EM", "B", "SMALL", "DT", "DD", "LABEL", "FIGCAPTION", "LEGEND", "BLOCKQUOTE", "PRE", "CODE"]);

    const clean = (s: string | null | undefined, n = 120) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, n);

    function visible(el: Element): boolean {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return false;
      const st = getComputedStyle(el);
      if (st.visibility === "hidden" || st.display === "none" || Number(st.opacity) === 0) return false;
      return true;
    }

    function ownText(el: Element): string {
      let t = "";
      el.childNodes.forEach((c) => { if (c.nodeType === Node.TEXT_NODE) t += c.textContent ?? ""; });
      return clean(t);
    }

    function implicitRole(el: Element): string {
      const explicit = el.getAttribute("role");
      if (explicit) return explicit;
      const tag = el.tagName;
      if (tag === "A") return el.hasAttribute("href") ? "link" : "text";
      if (tag === "BUTTON" || tag === "SUMMARY") return "button";
      if (tag === "SELECT") return "combobox";
      if (tag === "TEXTAREA") return "textbox";
      if (tag === "INPUT") {
        const t = (el.getAttribute("type") || "text").toLowerCase();
        if (["button", "submit", "reset", "image"].includes(t)) return "button";
        if (t === "checkbox") return "checkbox";
        if (t === "radio") return "radio";
        if (t === "range") return "slider";
        return "textbox";
      }
      if (/^H[1-6]$/.test(tag)) return "heading";
      if (tag === "LI") return "listitem";
      if (tag === "LABEL") return "label";
      if ((el as HTMLElement).isContentEditable) return "textbox";
      return "text";
    }

    function accessibleName(el: Element): string {
      const aria = el.getAttribute("aria-label");
      if (aria) return clean(aria);
      const labelledby = el.getAttribute("aria-labelledby");
      if (labelledby) {
        const txt = labelledby.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
        if (clean(txt)) return clean(txt);
      }
      const id = el.getAttribute("id");
      if (id) {
        const lab = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (lab && clean(lab.textContent)) return clean(lab.textContent);
      }
      const wrapping = el.closest("label");
      if (wrapping && wrapping !== el && clean(wrapping.textContent)) return clean(wrapping.textContent);
      const alt = el.getAttribute("alt") || el.querySelector("img[alt]")?.getAttribute("alt");
      if (alt) return clean(alt);
      if (el.tagName === "INPUT" && ["submit", "button"].includes((el as HTMLInputElement).type)) return clean((el as HTMLInputElement).value);
      const title = el.getAttribute("title");
      const text = clean((el as HTMLElement).innerText ?? el.textContent);
      return text || clean(title) || clean(el.getAttribute("placeholder"));
    }

    document.querySelectorAll("[data-fg-id]").forEach((el) => el.removeAttribute("data-fg-id"));

    const out: DomNode[] = [];
    const seen = new Set<Element>();
    let counter = 0;

    const candidates: Element[] = [];
    document.querySelectorAll(INTERACTIVE).forEach((el) => candidates.push(el));
    // Text nodes: elements whose own (direct) text is meaningful.
    document.querySelectorAll("body *").forEach((el) => {
      if (TEXTY.has(el.tagName) && ownText(el).length > 1) candidates.push(el);
    });
    // Keep document order.
    candidates.sort((a, b) => (a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

    for (const el of candidates) {
      if (out.length >= limit) break;
      if (seen.has(el)) continue;
      seen.add(el);
      if (!visible(el)) continue;
      const id = String(++counter);
      el.setAttribute("data-fg-id", id);
      const role = implicitRole(el);
      const tag = el.tagName.toLowerCase();
      const isField = tag === "input" || tag === "textarea" || tag === "select";
      const node: DomNode = {
        id,
        role,
        tag,
        name: accessibleName(el),
        text: role === "text" || role === "listitem" || role === "heading" ? clean((el as HTMLElement).innerText, 160) : ownText(el),
      };
      const type = el.getAttribute("type"); if (type) node.type = type;
      const ph = el.getAttribute("placeholder"); if (ph) node.placeholder = clean(ph);
      const href = el.getAttribute("href"); if (href && tag === "a") node.href = href.slice(0, 200);
      if (isField && tag !== "select" && (el as HTMLInputElement).type !== "password") {
        const v = (el as HTMLInputElement).value; if (v) node.value = clean(v, 80);
      }
      if (tag === "input" && ["checkbox", "radio"].includes((el as HTMLInputElement).type)) node.checked = (el as HTMLInputElement).checked;
      if (el.getAttribute("aria-selected") === "true" || el.classList.contains("selected")) node.selected = true;
      const hint = [el.getAttribute("id"), el.getAttribute("name"), el.getAttribute("data-testid"), typeof el.className === "string" ? el.className : ""]
        .filter(Boolean).join(" ");
      if (hint) node.hint = clean(hint, 100);
      out.push(node);
    }
    return out;
  }, maxNodes);
}

/** Compact one-line-per-node rendering used in LLM prompts (keeps tokens low on free tiers). */
export function renderNodes(nodes: DomNode[]): string {
  return nodes
    .map((n) => {
      const parts = [`#${n.id}`, n.role, `<${n.tag}${n.type ? ` type=${n.type}` : ""}>`];
      if (n.name) parts.push(`name="${n.name}"`);
      if (n.text && n.text !== n.name) parts.push(`text="${n.text}"`);
      if (n.placeholder) parts.push(`placeholder="${n.placeholder}"`);
      if (n.href) parts.push(`href="${n.href}"`);
      if (n.value) parts.push(`value="${n.value}"`);
      if (n.checked !== undefined) parts.push(`checked=${n.checked}`);
      if (n.selected) parts.push("selected");
      if (n.hint) parts.push(`hint="${n.hint}"`);
      return parts.join(" ");
    })
    .join("\n");
}
