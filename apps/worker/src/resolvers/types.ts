import type { DomNode, ResolvedPlan, ResolverName } from "@flowguard/shared";

export interface ResolveInput {
  instruction: string;
  nodes: DomNode[];
  url: string;
  title: string;
  /** Previous attempt's error, when re-resolving after a failed action (self-healing retry). */
  previousError?: string;
  /** Element ids that already failed for this step; the resolver must not pick them again. */
  excludeIds?: string[];
}

export interface Resolver {
  name: ResolverName;
  resolve(input: ResolveInput): Promise<ResolvedPlan>;
}
