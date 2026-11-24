/**
 * Demo data shown until Supabase is connected. Mirrors the Figma reference
 * (docs/design-reference/App.tsx) so the UI can be reviewed without a backend.
 */

export type Status = "passing" | "failed" | "warning";

export interface DemoFlow {
  id: string;
  name: string;
  domain: string;
  status: Status;
  time: string;
  detail: string;
  duration: number;
  schedule: string;
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
  { id: "f-signup", name: "New User Signup + Onboarding", domain: "app.acme.io", status: "passing", time: "8m ago", detail: "All 5 steps completed successfully", duration: 3.8, schedule: "Every 1 hour" },
  { id: "f-demo", name: "Pricing Page → Book Demo Form", domain: "acme.io", status: "warning", time: "22m ago", detail: "Slow API response · 4,900ms", duration: 4.9, schedule: "Every 1 hour" },
  ...passingNames.map((name, i) => ({
    id: `f-${i}`,
    name,
    domain: i % 2 ? "shopkemi.com" : "app.acme.io",
    status: "passing" as Status,
    time: `${i + 2}m ago`,
    detail: "All steps completed successfully",
    duration: 3.1 + i / 10,
    schedule: "Every 1 hour",
  })),
];

export const demoActivity: Array<{ status: Status; title: string; desc: string; time: string }> = [
  { status: "failed", title: "Checkout flow failed", desc: "shopkemi.com · Step 4: Pay Now", time: "14m ago" },
  { status: "passing", title: "Signup flow passed", desc: "app.acme.io · All 5 steps completed", time: "8m ago" },
  { status: "warning", title: "Slow response detected", desc: "acme.io · API latency exceeded 3s", time: "22m ago" },
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
  rootCause: string;
  videoUrl: string | null;
  durationSeconds: number;
}

export const demoReplay: ReplayData = {
  source: "demo",
  runLabel: "RUN #482",
  status: "FAILED",
  flowName: "Guest Checkout & Paystack Modal",
  domain: "shopkemi.com",
  detectedAt: "Detected Oct 24, 14:02 UTC · Sample incident",
  summaryTitle: "Your checkout is blocked at payment",
  summaryBody: "Steps 1–3 passed. “Pay Now” triggered a JavaScript error before the Paystack modal could open.",
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
    ["Browser", "Mobile Safari 17.0"],
    ["Viewport", "390 × 844 · iPhone 15"],
    ["Location", "London, UK"],
    ["Total duration", "11.0 seconds"],
  ],
  rootCause: "The payment SDK was unavailable when checkout initialized. Check script loading and provider configuration.",
  videoUrl: null,
  durationSeconds: 11,
};

export const DEMO_REPLAY_ID = "482";
