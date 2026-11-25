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

function withFallback(primary: Resolver, next: Resolver = heuristicResolver): Resolver {
  return {
    name: primary.name,
    async resolve(input: ResolveInput) {
      try {
        return await primary.resolve(input);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[resolver] ${primary.name} failed (${msg.slice(0, 200)}); falling back to ${next.name}`);
        const plan = await next.resolve(input);
        for (const a of plan.actions) {
          if (!a.reasoning.startsWith("[")) a.reasoning = `[${next.name} fallback: ${primary.name} unavailable] ${a.reasoning}`;
        }
        return plan;
      }
    },
  };
}
