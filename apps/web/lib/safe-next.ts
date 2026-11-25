/** Only allow same-site relative paths after login, so ?next= can't bounce users to another site. */
export function safeNext(next: string | null | undefined, fallback = "/monitors"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
