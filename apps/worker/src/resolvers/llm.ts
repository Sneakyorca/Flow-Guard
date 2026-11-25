import { z } from "zod";
import { ResolvedPlan, selectorForId } from "@flowguard/shared";
import { renderNodes } from "../snapshot.js";
import type { ResolveInput, Resolver } from "./types.js";

/**
 * LLM resolvers. All providers share the same prompt and the same zod validation
 * into { actions: [{ action, target_id, selector_or_coordinates, value, reasoning }] }.
 */

export const SYSTEM_PROMPT = `You are the step resolver for Oluso, a browser test runner.
You receive ONE plain-English test step and a list of visible page elements. Each element line starts with #<id>.
Return JSON only, shaped exactly like:
{"actions":[{"action":"click|fill|press|navigate|assert_text|assert_url","target_id":"<id or null>","selector_or_coordinates":null,"value":"<string or null>","reasoning":"<one short sentence>"}]}
Rules:
- Use 1-3 actions. "Type X into Y and press Enter" = fill then press (value "Enter", same target_id).
- click: target_id required. fill: target_id + value (text to type). press: value is a Playwright key name (Enter, Tab, Escape); target_id optional.
- navigate: value is an absolute URL or a path; target_id null.
- assert_text: value is the text that must be visible; target_id is the element containing it if present, else null.
- assert_url: value is a substring the current URL must contain.
- Only use ids that appear in the list. Never invent ids. If nothing matches, pick the closest element and say so in reasoning.`;

export function userPrompt(input: ResolveInput): string {
  return [
    `Current URL: ${input.url}`,
    `Page title: ${input.title}`,
    input.previousError ? `A previous attempt at this step failed with: ${input.previousError}\nChoose a different element or approach.${input.excludeIds?.length ? ` Do not use these ids again: ${input.excludeIds.map((i) => `#${i}`).join(", ")}.` : ""}` : "",
    `Step: ${input.instruction}`,
    `Elements:\n${renderNodes(input.nodes)}`,
  ].filter(Boolean).join("\n\n");
}

/** Validate raw model output with zod; fill selectors from target ids. */
export function parsePlan(raw: unknown, input: ResolveInput): ResolvedPlan {
  let value = raw;
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    value = JSON.parse(cleaned);
  }
  // Accept a bare single action or array as well as {actions:[...]}.
  if (Array.isArray(value)) value = { actions: value };
  else if (value && typeof value === "object" && !("actions" in value)) value = { actions: [value] };
  const plan = ResolvedPlan.parse(value);
  const ids = new Set(input.nodes.map((n) => n.id));
  for (const a of plan.actions) {
    if (a.target_id) {
      a.target_id = a.target_id.replace(/^#/, "");
      if (!ids.has(a.target_id)) throw new Error(`Resolver returned unknown element id #${a.target_id}`);
      if (!a.selector_or_coordinates) a.selector_or_coordinates = selectorForId(a.target_id);
    }
  }
  return plan;
}

async function postJson(url: string, body: unknown, headers: Record<string, string>, timeoutMs = 30_000): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${new URL(url).host} responded ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

/* ---------------------------- Gemini (free tier) ---------------------------- */
export function geminiResolver(apiKey: string, model = process.env.GEMINI_MODEL || "gemini-2.5-flash"): Resolver {
  return {
    name: "gemini",
    async resolve(input) {
      const data = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userPrompt(input) }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0, maxOutputTokens: 1024 },
        },
        { "x-goog-api-key": apiKey },
      );
      const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
      if (!text) throw new Error(`Gemini returned no content (${data?.promptFeedback?.blockReason ?? data?.candidates?.[0]?.finishReason ?? "unknown"})`);
      return parsePlan(text, input);
    },
  };
}

/* ---------------------- Groq (free tier, OpenAI-compatible) ---------------------- */
export function groqResolver(apiKey: string, model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile"): Resolver {
  return {
    name: "groq",
    async resolve(input) {
      const data = await postJson(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt(input) },
          ],
        },
        { authorization: `Bearer ${apiKey}` },
      );
      const text = data?.choices?.[0]?.message?.content;
      if (!text) throw new Error("Groq returned no content");
      return parsePlan(text, input);
    },
  };
}

/* ------------------------- Anthropic (optional, paid) ------------------------- */
// Schema the model's structured output is constrained to. Plain nullable strings keep
// the JSON Schema simple; the result is then validated again through ResolvedPlan.
const AnthropicPlan = z.object({
  actions: z.array(
    z.object({
      action: z.enum(["click", "fill", "press", "navigate", "assert_text", "assert_url"]),
      target_id: z.string().nullable(),
      selector_or_coordinates: z.string().nullable(),
      value: z.string().nullable(),
      reasoning: z.string(),
    }),
  ),
});

export function anthropicResolver(model = process.env.ANTHROPIC_MODEL || "claude-opus-5-5"): Resolver {
  return {
    name: "anthropic",
    async resolve(input) {
      // Imported lazily so the free paths never load the SDK.
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const { zodOutputFormat } = await import("@anthropic-ai/sdk/helpers/zod");
      const client = new Anthropic();
      // Structured output via output_config.format (no forced tool_choice), low effort for speed/cost.
      const response = await client.messages.parse({
        model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        output_config: { effort: "low", format: zodOutputFormat(AnthropicPlan) },
        messages: [{ role: "user", content: userPrompt(input) }],
      });
      if (response.stop_reason === "refusal") throw new Error("Anthropic declined to resolve this step");
      if (!response.parsed_output) throw new Error(`Anthropic returned no parseable output (stop_reason=${response.stop_reason})`);
      return parsePlan(response.parsed_output, input);
    },
  };
}
