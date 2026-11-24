import type { DomNode, ResolvedPlan, ResolverName } from "@flowguard/shared";

export interface ResolveInput {
  instruction: string;
  nodes: DomNode[];
  url: string;
  title: string;
  /** Previous attempt's error, when re-resolving after a failed action (self-healing retry). */
  previousError?: string;
}

export interface Resolver {
  name: ResolverName;
  resolve(input: ResolveInput): Promise<ResolvedPlan>;
}
