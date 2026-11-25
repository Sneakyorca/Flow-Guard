import { ResolverName } from "@flowguard/shared";
import { heuristicResolver } from "./heuristic.js";
import { anthropicResolver, geminiResolver, groqResolver } from "./llm.js";
import type { ResolveInput, Resolver } from "./types.js";

export type { ResolveInput, Resolver } from "./types.js";
export { heuristicResolver } from "./heuristic.js";

/**
 * Pick the resolver from FLOWGUARD_RESOLVER.
 * Unset: anthropic if ANTHROPIC_API_KEY is present, else gemini if GEMINI_API_KEY is, else the zero-key heuristic.
 * LLM resolvers fall back to the heuristic on API errors (rate limits on free tiers etc.)
 * so a flaky provider never turns into a false "FAILED" alert.
 */
export function getResolver(name = process.env.FLOWGUARD_RESOLVER): Resolver {
  const chosen = name?.trim()
    ? ResolverName.parse(name.trim().toLowerCase())
    : process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.GEMINI_API_KEY ? "gemini" : "heuristic";
  switch (chosen) {
    case "heuristic":
      return heuristicResolver;
    case "gemini": {
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error("FLOWGUARD_RESOLVER=gemini but GEMINI_API_KEY is not set (get a free key at aistudio.google.com)");
      return withFallback(geminiResolver(key));
    }
    case "groq": {
      const key = process.env.GROQ_API_KEY;
      if (!key) throw new Error("FLOWGUARD_RESOLVER=groq but GROQ_API_KEY is not set (free key at console.groq.com)");
      return withFallback(groqResolver(key));
    }
    case "anthropic": {
      if (!process.env.ANTHROPIC_API_KEY) throw new Error("FLOWGUARD_RESOLVER=anthropic but ANTHROPIC_API_KEY is not set");
      // Paid credits can run out (or expire); drop to free Gemini when a key is set, then the heuristic.
      const gemini = process.env.GEMINI_API_KEY;
      return withFallback(anthropicResolver(), gemini ? withFallback(geminiResolver(gemini)) : heuristicResolver);
    }
  }
}

/**
 * Circuit breaker: providers that failed with an auth or configuration error (bad key, no
 * credit, no permission, unknown model) are skipped for the rest of this process. Without it,
 * an invalid key is retried on every step, flooding logs and slowing every run.
 * Transient errors (429, 5xx, timeouts) still fall back per step and try again next step.
 */
const disabled = new Map<string, string>();

function httpStatus(err: unknown): number | null {
  const s = (err as { status?: unknown })?.status;
  if (typeof s === "number") return s;
  const m = (err instanceof Error ? err.message : String(err)).match(/responded (\d{3})/);
  return m ? Number(m[1]) : null;
}

/** True for errors that won't fix themselves within this run. */
export function isConfigError(err: unknown): boolean {
  const status = httpStatus(err);
  const msg = err instanceof Error ? err.message : String(err);
  if (status === 401 || status === 403 || status === 404) return true;
  if (status === 400 && /api[ _-]?key|credit|billing|permission|not valid|invalid.*(key|auth)|unauthori[sz]ed|model/i.test(msg)) return true;
  return /API key not valid|invalid x-api-key|authentication_error|permission_error|credit balance/i.test(msg);
}

/** For tests and long-lived workers (BullMQ): clear the breaker. */
export function resetResolverBreaker(): void {
  disabled.clear();
}

function withFallback(primary: Resolver, next: Resolver = heuristicResolver): Resolver {
  const mark = (plan: Awaited<ReturnType<Resolver["resolve"]>>, why: string) => {
    for (const a of plan.actions) {
      if (!a.reasoning.startsWith("[")) a.reasoning = `[${next.name} fallback: ${primary.name} ${why}] ${a.reasoning}`;
    }
    return plan;
  };
  return {
    name: primary.name,
    async resolve(input: ResolveInput) {
      if (disabled.has(primary.name)) return mark(await next.resolve(input), "disabled");
      try {
        return await primary.resolve(input);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isConfigError(err)) {
          disabled.set(primary.name, msg);
          console.warn(`[resolver] ${primary.name} is misconfigured (${msg.slice(0, 200)}). Not calling it again in this run; using ${next.name}. Check the API key secret.`);
        } else {
          console.warn(`[resolver] ${primary.name} failed (${msg.slice(0, 200)}); falling back to ${next.name}`);
        }
        return mark(await next.resolve(input), "unavailable");
      }
    },
  };
}
