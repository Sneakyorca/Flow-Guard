/**
 * Demo data shown until Supabase is connected. Mirrors the Figma reference
 * (docs/design-reference/App.tsx) so the UI can be reviewed without a backend.
 */

export type Status = "passing" | "failed" | "warning" | "pending";

/** One cell of the 30-day bar: a day with failures, a flaky day, a clean day, or no runs. */
export type DayResult = "ok" | "bad" | "warn" | "none";

export interface DemoFlow {
  id: string;
  name: string;
  domain: string;
  status: Status;
  time: string;
  detail: string;
  duration: number;
  schedule: string;
  // ---- Set only for real (Supabase) data; demo rows leave them undefined. ----
  /** Overrides the status word, e.g. "Flaky". */
  statusText?: string;
  /** Text under the status in the "Last run" column. */
  lastRunLabel?: string;
  /** Pass rate over the last 30 days, e.g. "96.7%"; "–" when there are no runs. */
  uptime?: string;
  history?: DayResult[];
  /** Share token of the latest run, used for /replay/[token]. */
  replayToken?: string;
}

const passingNames = [
  "Account Login & Password Reset",
  "Product Search & Add to Cart",
  "Subscription Upgrade",
  "Contact Sales Form",
  "Customer Portal Access",
  "Newsletter Subscription",
  "Product Detail & Wishlist",
  "Team Invite & Acceptance",
  "Documentation Search",
];

export const demoFlows: DemoFlow[] = [
  { id: "f-checkout", name: "Guest Checkout & Paystack Modal", domain: "shopkemi.com", status: "failed", time: "14m ago", detail: "Step 4 · Button “Pay Now” unresponsive", duration: 11, schedule: "Every 1 hour" },
  { id: "f-signup", name: "New User Signup + Onboarding", domain: "app.ledgerly.co", status: "passing", time: "8m ago", detail: "All 5 steps completed successfully", duration: 3.8, schedule: "Every 1 hour" },
  { id: "f-demo", name: "Pricing Page → Book Demo Form", domain: "ledgerly.co", status: "warning", time: "22m ago", detail: "Slow API response · 4,900ms", duration: 4.9, schedule: "Every 1 hour" },
  ...passingNames.map((name, i) => ({
    id: `f-${i}`,
    name,
    domain: i % 2 ? "shopkemi.com" : "app.ledgerly.co",
    status: "passing" as Status,
    time: `${i + 2}m ago`,
    detail: "All steps completed successfully",
    duration: 3.1 + i / 10,
    schedule: "Every 1 hour",
  })),
];

export const demoActivity: Array<{ status: Status; title: string; desc: string; time: string }> = [
  { status: "failed", title: "Checkout flow failed", desc: "shopkemi.com · Step 4: Pay Now", time: "14m ago" },
  { status: "passing", title: "Signup flow passed", desc: "app.ledgerly.co · All 5 steps completed", time: "8m ago" },
  { status: "warning", title: "Slow response detected", desc: "ledgerly.co · API latency exceeded 3s", time: "22m ago" },
];

export const demoBuilderSteps = [
  'Navigate to "/pricing"',
  'Click "Start Free Trial" button',
  "Fill email field with test inbox and submit form",
  'Assert dashboard loads and "Welcome" heading is visible',
];

/** Shape the replay page renders; filled from get_public_run() or from this demo. */
export interface ReplayData {
  source: "demo" | "live";
  runLabel: string;
  status: "PASSING" | "FAILED";
  flowName: string;
  domain: string;
  detectedAt: string;
  summaryTitle: string;
  summaryBody: string;
  steps: Array<{ instruction: string; status: "passed" | "failed" | "skipped"; duration: string; error?: string }>;
  consoleErrors: Array<{ title: string; message: string; stack?: string; at: string }>;
  networkErrors: Array<{ method: string; path: string; status: number | null; statusText: string; at: string; details?: string }>;
  domSnapshot: string;
  environment: Array<[string, string]>;
  /** What to do about it (from the worker's failure explanation). */
  suggestion: string;
  /** Console/network lines that back the explanation. */
  evidence: string[];
  videoUrl: string | null;
  durationSeconds: number;
}

export const demoReplay: ReplayData = {
  source: "demo",
  runLabel: "RUN #482",
  status: "FAILED",
  flowName: "Guest Checkout & Paystack Modal",
  domain: "shopkemi.com",
  detectedAt: "Failed Oct 24, 14:02 UTC · sample incident",
  summaryTitle: "A JavaScript error broke step 4 (“Pay Now”)",
  summaryBody: "Steps 1–3 passed. Clicking “Pay Now” threw a TypeError before the Paystack modal could open, so no customer can pay right now.",
  steps: [
    { instruction: "Navigate to shopkemi.com", status: "passed", duration: "1.2s" },
    { instruction: "Add Everyday Body Oil to cart", status: "passed", duration: "2.4s" },
    { instruction: "Fill contact & delivery details", status: "passed", duration: "3.1s" },
    {
      instruction: "Click “Pay Now” and assert Paystack modal opens",
      status: "failed",
      duration: "4.3s",
      error: "TimeoutError: Click intent 'Pay Now' triggered uncaught TypeError: Cannot read properties of undefined (reading 'initialize')",
    },
  ],
  consoleErrors: [
    {
      title: "TypeError",
      message: "Cannot read properties of undefined\n(reading 'initialize')",
      stack: "at initializePayment\n  checkout.js:142:18\nat HTMLButtonElement.onClick\n  checkout.js:98:5\nat dispatchEvent\n  react-dom.production.js:216:9\nat processDispatchQueue\n  react-dom.production.js:245:7",
      at: "00:11.042",
    },
  ],
  networkErrors: [
    {
      method: "POST",
      path: "/api/checkout",
      status: 500,
      statusText: "500 Internal Server Error",
      at: "00:11.103",
      details: 'Request headers\nContent-Type: application/json\n\nRequest body\n{ "amount": 20500,\n  "currency": "NGN" }\n\nResponse · 1,240ms\n{ "error": "Payment provider\n  initialization failed" }',
    },
  ],
  domSnapshot:
    '<main id="checkout">\n  <form id="payment-form">\n    <input type="email"\n      value="amara@example.com" />\n    <button id="pay-now"\n      type="submit">\n      Pay Now\n    </button>\n  </form>\n  <!-- Paystack modal not found -->\n</main>',
  environment: [
    ["Browser", "Chromium 147, mobile emulation"],
    ["Viewport", "390 × 844 · iPhone 15"],
    ["Runner", "GitHub Actions, us-east"],
    ["Total duration", "11.0 seconds"],
  ],
  suggestion: "Check that the Paystack inline script (js.paystack.co) loads on the checkout page, and look at /api/checkout in your server logs for 14:02 UTC.",
  evidence: [
    "JavaScript error: TypeError: Cannot read properties of undefined (reading 'initialize')",
    "POST shopkemi.com/api/checkout returned 500",
  ],
  videoUrl: null,
  durationSeconds: 11,
};

export const DEMO_REPLAY_ID = "482";

export const demoUser = { name: "Tolu Adeyemi", email: "tolu@shopkemi.com", initials: "TA" };
export const DEFAULT_WORKSPACE = "Kemi Skincare";

/** Real output of `npm run scan -- --url https://books.toscrape.com` (docs/examples). */
export const sampleScan = {
  url: "https://books.toscrape.com/",
  seconds: 18,
  score: 90,
  pages: 15,
  links: 135,
  rows: [
    ["Broken links", "None of the 135 links checked returned an error."],
    ["Mobile layout", "No page scrolls sideways at 390px wide."],
    ["JavaScript", "1 error on all 15 pages: the site loads jQuery over plain http:// (ajax.googleapis.com), which browsers block on an https page. Anything that depends on that script is broken."],
  ] as Array<[string, string]>,
};
