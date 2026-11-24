import { ResolverName } from "@flowguard/shared";
import { heuristicResolver } from "./heuristic.js";
import { anthropicResolver, geminiResolver, groqResolver } from "./llm.js";
import type { ResolveInput, Resolver } from "./types.js";

export type { ResolveInput, Resolver } from "./types.js";
export { heuristicResolver } from "./heuristic.js";

/**
 * Pick the resolver from FLOWGUARD_RESOLVER.
 * Unset: gemini if GEMINI_API_KEY is present, otherwise the zero-key heuristic.
 * LLM resolvers fall back to the heuristic on API errors (rate limits on free tiers etc.)
 * so a flaky provider never turns into a false "FAILED" alert.
 */
export function getResolver(name = process.env.FLOWGUARD_RESOLVER): Resolver {
  const chosen = name ? ResolverName.parse(name.trim().toLowerCase()) : process.env.GEMINI_API_KEY ? "gemini" : "heuristic";
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
    case "anthropic":
      if (!process.env.ANTHROPIC_API_KEY) throw new Error("FLOWGUARD_RESOLVER=anthropic but ANTHROPIC_API_KEY is not set");
      return withFallback(anthropicResolver());
  }
}

function withFallback(primary: Resolver): Resolver {
  return {
    name: primary.name,
    async resolve(input: ResolveInput) {
      try {
        return await primary.resolve(input);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[resolver] ${primary.name} failed (${msg.slice(0, 200)}); falling back to heuristic`);
        const plan = await heuristicResolver.resolve(input);
        for (const a of plan.actions) a.reasoning = `[heuristic fallback: ${primary.name} unavailable] ${a.reasoning}`;
        return plan;
      }
    },
  };
}
