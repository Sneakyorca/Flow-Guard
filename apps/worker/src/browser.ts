import { chromium, type Browser, type BrowserContext } from "playwright";
import { VIEWPORTS, type Viewport } from "@flowguard/shared";

const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

/** Honour HTTPS_PROXY for both the browser and Playwright's API request context (link checks). */
function proxyFromEnv() {
  const server = process.env.HTTPS_PROXY || process.env.https_proxy;
  if (!server) return undefined;
  const bypass = (process.env.NO_PROXY || process.env.no_proxy || "").split(",").map((s) => s.trim()).filter(Boolean).join(",");
  return { server, ...(bypass ? { bypass } : {}) };
}

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({ headless: process.env.HEADFUL !== "1", proxy: proxyFromEnv() });
}

/**
 * tsx/esbuild compiles nested functions with a `__name(fn, "name")` helper. Functions we pass
 * to page.evaluate() are serialised into the page, where that helper does not exist.
 * This no-op shim makes them run unchanged.
 */
export const NAME_SHIM = "globalThis.__name = globalThis.__name || ((f) => f);";

export async function newContext(browser: Browser, viewport: Viewport, videoDir?: string): Promise<BrowserContext> {
  const vp = VIEWPORTS[viewport];
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: vp.isMobile,
    hasTouch: vp.isMobile,
    deviceScaleFactor: vp.isMobile ? 2 : 1,
    userAgent: vp.isMobile ? MOBILE_UA : undefined,
    ignoreHTTPSErrors: false,
    ...(videoDir
      ? { recordVideo: { dir: videoDir, size: vp.isMobile ? { width: vp.width, height: vp.height } : { width: 1280, height: 800 } } }
      : {}),
  });
  await context.addInitScript({ content: NAME_SHIM });
  return context;
}
