# Brand: name check, positioning, voice, colour and logo

Researched 25 November 2026. Covers whether "FlowGuard" is safe to keep, who the product is for, how it talks, and how it looks. The look builds on the warm light theme and single orange accent already in `apps/web/app/globals.css` (reasons in `design.md`).

## 1. Is the name "FlowGuard" free to use?

**Short answer: no. The name is already in use for two other monitoring products, and there is a live US trademark covering monitoring software. Confidence: high that there is a real collision; medium on how much legal risk it carries. (Trademark lawyers judge risk; this is a web search, not legal advice.)**

What turned up:

| Who | What | Why it matters |
|---|---|---|
| "FlowGuard – Automation Monitoring" on Product Hunt | A heartbeat monitor for Make, n8n and Zapier automations: your automation pings it, and you get an alert when the pings stop | **Same category** (monitoring, alerts on silent failures), similar buyers (small teams, no-code builders). The most serious clash. |
| "FlowGuard" on PeerPush | Watches n8n workflows through the n8n API and alerts when a workflow stops running | A second monitoring product with the same name. |
| "FlowGuard" open-source AI-agent tool (GitHub, Product Hunt) | A finite-state simulator for AI coding agents, with a `flowguard` package name on PyPI | Developer tool. Takes the name on GitHub and package registries. |
| US trademark FLOWGUARD, serial 90232272, reg. 6605245 (Hoover Pumping Systems) | Registered January 2022, **Classes 9 and 42** (water monitoring systems) | Class 42 covers software-as-a-service, and the goods are "monitoring systems". It's a different industry (water pumps), but the class overlap is what an examiner or a lawyer would look at first. |
| FLOW-GUARD (serial 76391055), FLOWGUARD USA (Flowguard Limited, UK), a 2025 FLOWGUARD application for gutter guards | Water filters, plumbing, gutter covers | Unrelated goods. Low risk in themselves, but they show the word is crowded. |
| Older FLOWGUARD mark (serial 76561289) | Cancelled in 2012 | No risk. |

**Domains.** This environment could not reach domain registries (RDAP and DNS lookups were blocked by the network), so `flowguard.com`, `.io` and `.app` were **not** checked directly. A search turned up no live product on any of them, which proves nothing: short two-word .com names are almost always registered. Check them yourself at a registrar before deciding (see `docs/OWNER-TODO.md`).

**Recommendation.** Keep "FlowGuard" as the working name for the free beta (the code does not change), but don't spend money on a FlowGuard logo, domain or trademark filing. Pick a new public name before a paid launch or press.

### Alternative names

Each name below came back with **no software product of that name** in a web search on 25 November 2026. Domain availability was **not** verified (see above). Treat "available-looking" as "worth checking first", nothing more.

| Name | Why it fits | Domains to check first | Notes |
|---|---|---|---|
| **Oluso** | Yoruba for "guardian" or "keeper": someone who watches over a place. Keeps the "guard" idea, sounds warm, and is easy to say in Lagos, Nairobi or London. | oluso.app, oluso.io, getoluso.com | No software, app or startup found. The strongest pick for an Africa-first brand. Ask a few Yoruba speakers how it lands before committing. |
| **Tillproof** | "Till" is what Nigerian, Kenyan and British shoppers call the checkout. "Proof" is what you get: the recording. | tillproof.com, tillproof.app | No product found. Related names exist (TillWatch for M-Pesa tills in Kenya, Tillwise for cash drawers), so avoid "Tillwatch". Works best if checkout stays the main story. |
| **Pathproof** | Says what it does: proves the path through your site still works. Fits SaaS signup flows as well as shops. | pathproof.com, pathproof.io, pathproof.app | No product found. Plain and descriptive, so it may be harder to register as a trademark (descriptive marks get pushback). |
| **Walkpast** | A shopkeeper who walks past the till each hour to check it's open. Friendly, concrete, and not "AI". | walkpast.app, walkpast.io | Not searched as deeply; check for clashes before shortlisting. |

Names checked and dropped: **Konfam** (Nigerian Pidgin for "confirm", lovely, but an App Store product-authenticity app already uses it), **Stepwatch** (several fitness/step-counter apps), **Journeywatch** (too close to "journey monitoring", a generic term Datadog, Uptrends and thinkTRIBE all use), **Tillwatch** (Kenyan M-Pesa till product), **Cart Patrol** (a Shopify app). Checkout monitors also exist in the space: **Cart Lookout** (WooCommerce plugin) and **CheckoutGuard** (Shopify app), so any "checkout + guard" name is out.

How to finish the check (free):
1. Type each shortlisted name into a registrar's search (Namecheap, Porkbun or Cloudflare Registrar show prices without an account).
2. Search the USPTO trademark search (tmsearch.uspto.gov), the UK IPO, WIPO's Global Brand Database, and the Nigerian Trademarks Registry for the exact word in classes 9 and 42.
3. Check the name on GitHub, npm, X/Twitter and Instagram.

## 2. Positioning

**One line:** FlowGuard opens your checkout or signup in a real browser every hour and sends you the recording when it breaks.

**Who it's for, in order:**
1. **Small online sellers in Nigeria, Ghana, Kenya and South Africa** on Paystack or Flutterwave checkouts: Shopify, WooCommerce, Bumpa, Selar or a custom build. Their problem: the homepage loads, so the uptime checker stays green, but the "Pay" button does nothing because a script failed, a bank's card route is down, or a plugin update broke the cart. They find out from an angry WhatsApp message.
2. **Indie and small SaaS teams** whose signup or login breaks after a deploy. They know about Checkly but don't want to write and maintain Playwright code, or pay for it.
3. **Web agencies** who look after many client shops and want a link they can forward when something breaks.

**What makes it different (say these, in this order):**
- **It checks the journey, not just the page.** Uptime checkers ping your homepage; FlowGuard clicks through to the payment modal (without paying).
- **You write steps in plain sentences.** "Click Add to cart", "Check that 'Order confirmed' is visible". No code, no recorder.
- **You get evidence you can forward.** A video, the failing step, the console and network errors, and one sentence saying what probably went wrong. The link works without an account.
- **It doesn't cry wolf.** A failed run is re-run once before anyone is alerted, and flaky runs are marked as flaky.
- **It starts free.** No card. Paid plans priced for a Lagos shop, not a San Francisco startup.

**What we don't claim:** load testing, API testing, multi-region probes, "AI-powered QA", "never miss a bug", "100% uptime".

**Messages by audience:**

| Audience | Lead with | Example line |
|---|---|---|
| Paystack/Flutterwave shop | Lost sales you didn't know about | "Your shop can be online and still not take money. We check the Pay button every hour." |
| SaaS team | Signup broken after a deploy | "Know your signup broke before your next user does. Plain-English checks, a video when they fail." |
| Agency | Forwardable proof | "One link that shows your client exactly what broke, and when." |

## 3. Voice and tone

FlowGuard sounds like **a calm, competent colleague who checked the till for you**. Not a security firm, not a hype-y AI startup.

**Principles**
- **Plain and specific.** Say what happened, where, and when. "Step 4 ('Pay now') threw a JavaScript error on shopkemi.com at 14:02" beats "Critical anomaly detected".
- **Calm when things break.** Failures are stated, not shouted. No exclamation marks, no red capitals, no "URGENT".
- **Useful next step every time.** Every error and empty state ends with what to do.
- **Honest about limits.** Say "free beta", "sample data", "we couldn't check this". Never fake a number.
- **Local without being cute.** Use local examples (Paystack, Bumpa, naira, WAT) and spelling people recognise. Don't put Pidgin in product copy as a gimmick.

**Do / don't**

| Do | Don't |
|---|---|
| "Checkout failed at step 4. Watch the replay." | "Uh-oh! Something went wrong 😬" |
| "Runs every hour from GitHub Actions." | "Always-on AI protection." |
| "Passed on the second try, so we didn't alert you." | "Self-healing autonomous agent." |
| "This is sample data. Sign up to see your own." | Showing fake numbers without a label |
| Sentence case, short sentences | Title Case Buttons, uppercase pills, slogans inside the app |

**Words we use:** flow, step, run, replay, failed, flaky, passed, check, alert.
**Words we avoid:** leverage, seamless, robust, cutting-edge, AI-powered, revolutionary, peace of mind, synergy.

## 4. Colour

Kept from the current UI (see `globals.css`), named and given jobs. The rule from `design.md` still applies: **one accent, used rarely; colour means state.**

| Name | Light | Dark | Job |
|---|---|---|---|
| Paper | `#f6f5f1` | `#141310` | Page background |
| Surface | `#ffffff` | `#1b1a16` | Panels, tables, cards |
| Ink | `#17160f` | `#f1efe7` | Text, primary buttons inside the app, the logo tile |
| Muted | `#6b685e` | `#a19d90` | Secondary text |
| Line | `#e3e0d6` | `#2e2c26` | Hairlines |
| **Signal orange** | `#e4572e` | `#f0683f` | The brand accent: logo dot, the one marketing call to action, focus ring, active nav marker. Nowhere else. |
| Pass green | `#1f7a4d` | `#4cc38a` | Status only |
| Fail red | `#c8262f` | `#f2555a` | Status only |
| Flaky amber | `#9a6700` | `#e0a83a` | Status only |

Why orange: it is the colour of hazard tape and traffic cones, "look at this", without being the red we keep for failures. It also stands apart from the indigo/violet that most AI-built tools default to, and from Paystack's teal and Flutterwave's yellow-orange gradient, so it won't look like a payment provider's own tool.

Contrast: Ink on Paper is about 17:1. White text on Signal orange is about 3.6:1, which passes for large text and buttons (14px+ bold) only, so orange buttons use 14px medium or larger text; small orange text uses `--accent-ink` (`#b93d17`, about 5.6:1 on Paper).

**Type:** IBM Plex Sans and IBM Plex Mono (free, Open Font License, self-hosted). Mono for URLs, timings and logs.

## 5. Logo direction

**Current mark:** a hexagon with a heartbeat line. It works, but a shield-or-hexagon plus pulse line is what most monitoring logos already look like.

**Direction: "the checked path".** A short route of three points joined by a line, like steps on a journey: two plain points, then the last point in signal orange, where the check happens. It says "a path through your site, checked at the end", stays readable at 16px, and doesn't use a shield, padlock, eye or robot.

- **App icon / favicon:** the path drawn in Paper on an Ink rounded square, last point orange. Shipped as `apps/web/app/icon.svg` (with an `apple-icon` and web manifest) so it can be judged in a browser tab.
- **Wordmark:** "FlowGuard" (or the new name) in IBM Plex Sans semibold, slight negative tracking, sentence case, next to the mark. No gradient, no glow.
- **Don'ts:** no gradients, no 3D, no AI sparkle, no green tick inside a shield.
- If the name changes, the mark still works: it describes the job, not the word.

## Sources

- Product Hunt: [FlowGuard – Automation Monitoring](https://www.producthunt.com/products/flowguard-automation-monitoring), [FlowGuard (AI-agent tool)](https://www.producthunt.com/products/flowguard?launch=flowguard); [FlowGuard on PeerPush](https://peerpush.net/p/flowguard)
- Trademarks (third-party aggregators; confirm on USPTO TSDR): [FLOWGUARD 90232272 (Justia)](https://trademarks.justia.com/902/32/flowguard-90232272.html), [FLOWGUARD 90232272 (Markinton)](https://markinton.com/trademark/flowguard-90232272), [FLOWGUARD 99086639](https://markinton.com/trademark/flowguard-99086639), [FLOW-GUARD 76391055](https://trademarks.justia.com/763/91/flow-76391055.html), [FLOWGUARD 76561289 (cancelled)](https://trademarks.justia.com/765/61/flowguard-76561289.html), [Flowguard Limited portfolio](https://trademarkdir.com/owner/flowguard-limited)
- Names checked: [TillWatch (M-Pesa)](https://tillwatch.netlify.app/), [Konfam app](https://apps.apple.com/us/app/-/id6504548146), [Cart Patrol (Shopify)](https://apps.shopify.com/product-reservation-app), [Cart Lookout (WooCommerce)](https://wordpress.org/plugins/cartlookout/), [CheckoutGuard (Shopify)](https://apps.shopify.com/checkoutguard-3), [Datadog journey monitoring](https://docs.datadoghq.com/journey_monitoring/details_report/)
