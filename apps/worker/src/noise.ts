import type { Request } from "playwright";

/**
 * Browser messages that show up on almost every healthy site and would bury the real
 * problem in a failure report. Found on the first real run (a Next.js site on Cloudflare).
 */

/** Console messages to drop. */
export function isNoiseConsole(type: string, text: string): boolean {
  // Performance hint, not a bug: a font/script was preloaded a moment before it was used.
  if (type === "warning" && /was preloaded using link preload but not used/i.test(text)) return true;
  // Chrome's console echo of a failed request. The network log already has it, with the URL.
  if (type === "error" && /^Failed to load resource: /i.test(text)) return true;
  return false;
}

/** Failed requests to drop: work the browser or framework cancelled on purpose. */
export function isNoiseRequestFailure(req: Request, failure: string): boolean {
  if (!/ERR_ABORTED/.test(failure)) return false;
  // Media, analytics beacons and pings get cut off whenever the page navigates.
  if (["media", "ping", "beacon"].includes(req.resourceType())) return true;
  // Link prefetches (Next.js RSC `?_rsc=`, <link rel=prefetch>, speculation rules) are
  // cancelled when the user (or Oluso) navigates before they finish.
  const h = req.headers();
  if (/[?&]_rsc=/.test(req.url()) || h["next-router-prefetch"] || h["rsc"] || /prefetch/i.test(h["sec-purpose"] ?? h["purpose"] ?? "")) return true;
  return false;
}
