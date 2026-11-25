# FlowGuard

Uptime monitoring for user journeys.

Describe a journey in plain English ("type `Buy milk` into the new todo input and press Enter",
"click the Active filter"). FlowGuard runs it on a schedule in a headless Chromium browser,
works out which element each step means, and when something breaks you get a video replay,
the console and network errors, a Slack alert and a public link you can send to whoever has
to fix it.

There is also a free **instant site scan**: paste a URL and in 60 seconds it crawls up to 15
pages looking for broken links, mobile layouts that scroll sideways, and uncaught JavaScript
errors.

Everything here runs on free tiers. Nothing in the default path costs money.

| Need | What we use | Cost |
|---|---|---|
| Web app | Next.js on Vercel Hobby | free |
| Database, auth, video storage | Supabase free project | free |
| Running browsers on a schedule | GitHub Actions cron | free (public repo; 2,000 min/month private) |
| Working out which element a step means | built-in heuristic, or Gemini / Groq free tier | free |
| Alerts | Slack incoming webhook | free |

## How it fits together

```
apps/web          Next.js 16 (App Router, Tailwind v4). Dashboard, flow builder, replay
                  pages, public scanner landing. Shows demo data until Supabase is set up.
apps/worker       Node + Playwright.
  src/executor.ts   runs a flow: open URL → snapshot DOM → resolve step → act → record
  src/snapshot.ts   stamps data-fg-id on visible elements, returns a compact list
  src/resolvers/    heuristic (no key) | gemini | groq | anthropic, all validated with zod
  src/scanner.ts    the free 60-second site scan
  src/persist.ts    uploads video/diagnostics, writes flow_runs, sends Slack alerts
  src/cli/          prototype, scan, run-due (the scheduler entry point)
  src/queue.ts      BullMQ worker: same executor, for when cron is not enough
packages/shared   zod schemas + types shared by web and worker
supabase/migrations/0001_init.sql   tables, row-level security, signup trigger,
                  get_public_run(token), private `replays` bucket
.github/workflows scheduled-runs.yml (hourly cron), ci.yml (typecheck + build)
docs/             PLAN.md (spec), design-reference/ (Figma export), examples/ (real output)
```

A run, step by step:

1. GitHub Actions wakes up every hour and runs `run-due`.
2. `run-due` asks Supabase for active flows whose cron schedule has come round since their last run.
3. For each flow, Playwright opens the start URL (desktop 1440×900 or iPhone-sized 390×844) and records video.
4. For each step it takes a snapshot of the visible page: buttons, links, inputs, headings, list items, each tagged `data-fg-id="N"`.
5. The resolver turns the sentence plus that list into actions like `{ action: "click", target_id: "9", reasoning: "…" }`. Every resolver's output is checked by the same zod schema.
6. Playwright performs the actions. Console errors, uncaught exceptions, responses ≥ 400 and failed requests are logged the whole time.
7. The video, `diagnostics.json` and (on failure) `failure.png` go into the private `replays` bucket; a `flow_runs` row is written with a random share token.
8. On failure, Slack gets a message with a button to `/replay/<token>`. That page reads the run through `get_public_run(token)`, so a stranger with the link sees that one run and nothing else.

### When something goes wrong

- **A step can't be done** (button covered, disabled, renamed): FlowGuard takes a fresh look at the page and re-resolves that step once, excluding the element that didn't work. Steps that pass this way are marked `healed`.
- **A run fails**: scheduled runs are re-run once before anyone is alerted. Fail-then-pass is recorded as **flaky** and not alerted; fail-then-fail is a real failure. The first attempt is kept under `attempt-1/`. (`--retries 1` does the same for the prototype.)
- **Explaining it**: every failure is classified (site down, JavaScript error, server error, element missing, text never appeared, wrong page, element not usable) into one plain sentence with a suggested fix and the console/network evidence. That sentence leads the Slack alert and the replay page.
- **Timeline**: a small JPEG is saved after every step (`steps/step-01.jpg`, …) alongside the video.

### Choosing a resolver

Set `FLOWGUARD_RESOLVER`:

| Value | Needs | Notes |
|---|---|---|
| `heuristic` | nothing | Default. Keyword, quoted-text and role matching with synonyms (sign up/register, log in/sign in, cart/bag/basket, checkout/place order). Handles click / type into / press / go to / check that "X" is visible / URL contains. |
| `gemini` | `GEMINI_API_KEY` (free at aistudio.google.com) | `gemini-2.5-flash` in JSON mode. Picked automatically when the key is set and `FLOWGUARD_RESOLVER` is empty. |
| `groq` | `GROQ_API_KEY` (free at console.groq.com) | `llama-3.3-70b-versatile`, OpenAI-compatible JSON mode. |
| `anthropic` | `ANTHROPIC_API_KEY` (paid) | `claude-opus-5-5`, structured output, low effort. Optional. |

If an LLM call fails (rate limit, outage) the step falls back to the heuristic, so a free-tier hiccup doesn't page you. With `anthropic`, the chain is Claude → Gemini (if `GEMINI_API_KEY` is set) → heuristic, so runs keep working when paid credits run out or expire.

## Run it on your Windows PC

You need **Node.js 20 or newer** (22 LTS recommended, from nodejs.org) and **Git**. These commands work the same in PowerShell, Command Prompt and Git Bash.

```bash
git clone https://github.com/Sneakyorca/Flow-Guard.git
```

```bash
cd Flow-Guard
```

```bash
npm install
```

Download the Chromium build Playwright uses (one time, about 150 MB):

```bash
npm run setup:browser
```

### The prototype

Runs the default demo: add "Buy milk" on the TodoMVC demo, check it is listed, click "Active".

```bash
npm run prototype
```

Output lands in `runs\<run-id>\`: `video.webm` (open it in Chrome or VLC), `diagnostics.json`, and `failure.png` if a step failed. The process exits with code 0 when the flow passes and 1 when it fails.

Your own flow (steps separated by `|`, or put one per line in a file and use `--steps-file`):

```bash
npm run prototype -- --url https://demo.playwright.dev/todomvc --viewport mobile --steps "Type 'Buy milk' into the new todo input and press Enter | Assert 'Buy milk' is in the list | Click the 'Active' filter"
```

On Windows, use single quotes inside the double-quoted `--steps` value as above; the resolver accepts both. Add `--resolver gemini` to try the LLM resolver once you have a key in `.env`. Set `HEADFUL=1` to watch the browser.

### The free scanner

```bash
npm run scan -- --url https://books.toscrape.com
```

Writes `runs\scan-…\report.json` and a homepage `video.webm`. Add `--external` to also check links to other sites.

### The web app

```bash
npm run dev
```

Open http://localhost:3000. With no `.env` it shows demo data, so you can click through every screen.

```bash
npm run build
```

```bash
npm run typecheck
```

## Free-tier setup, end to end

Do these in order. Each one is free; none needs a credit card.

### 1. Supabase (database, login, video storage)

1. Sign up at supabase.com and create a project (free plan). Pick the region closest to your users.
2. Open **SQL Editor → New query**, paste the whole of `supabase/migrations/0001_init.sql`, and click **Run**. Then do the same with `0002_step_timeline_and_flaky.sql`. Together these create the tables, row-level security, the trigger that gives every new user a workspace, the `get_public_run` function and the private `replays` bucket.
3. Open **Project Settings → API** and note the **Project URL**, the **anon public** key and the **service_role** key. The service role key bypasses security: only ever put it in GitHub secrets, Vercel server env and your local `.env`, never in browser code.
4. Copy `.env.example` to `.env` in the repo root and fill in `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

5. Open **Authentication → URL Configuration**. Set **Site URL** to where the app runs (`http://localhost:3000` while testing, your Vercel URL later) and add `http://localhost:3000/auth/callback` and `https://<your-vercel-url>/auth/callback` under **Redirect URLs**. The sign-up confirmation email links there.

Now `npm run dev` → **Start free** on the landing page → confirm the email → you land in your own empty workspace. Add a flow with **New flow**. Signed-out visitors to `/monitors`, `/flows`, `/alerts` and `/settings` are sent to `/login`; `/`, `/scan` and `/replay/<token>` stay public.

Check scheduled runs locally (needs the `.env` above): `npm run run-due -- --dry-run` lists due flows, `npm run run-due` runs them.

### 2. Gemini key (optional, free)

1. Go to aistudio.google.com, sign in with a Google account, click **Get API key → Create API key**.
2. Put it in `.env` as `GEMINI_API_KEY=…`. Leave `FLOWGUARD_RESOLVER` empty and Gemini is used automatically.

The free tier has per-minute limits; each step is one small request. If you hit the limit the heuristic takes over for that step.

### 3. GitHub Actions (the scheduler)

In your GitHub repo: **Settings → Secrets and variables → Actions → New repository secret**. Add:

| Secret | Value |
|---|---|
| `SUPABASE_URL` | your Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role key |
| `PUBLIC_APP_URL` | your Vercel URL, e.g. `https://flowguard-yourname.vercel.app` |
| `GEMINI_API_KEY` | optional |
| `GROQ_API_KEY` | optional |
| `SLACK_WEBHOOK_URL` | optional; used when a workspace has no webhook of its own |

Optionally add a repository **variable** `FLOWGUARD_RESOLVER` to force a resolver.

`.github/workflows/scheduled-runs.yml` then runs every hour (at minute 7). Without the Supabase secrets it logs "skipping" and exits green. To run it now: **Actions → Scheduled flow runs → Run workflow** (you can paste a single flow id). A Slack webhook comes from api.slack.com/apps → your app → **Incoming Webhooks**.

GitHub pauses scheduled workflows on repos with no activity for 60 days; push a commit or press **Run workflow** to wake it up.

### 4. Vercel Hobby (the web app)

1. Sign in at vercel.com with GitHub and **Import** this repository.
2. Set **Root Directory** to `apps/web`. Vercel detects Next.js and the npm workspace automatically.
3. Under **Environment Variables** add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` (the last one is used only on the server, to sign replay video links).
4. Optional, for the **Run** button on Monitors: create a fine-grained GitHub token (github.com → Settings → Developer settings → Fine-grained tokens) for this repository only, with **Actions: Read and write**, and add it as `GITHUB_DISPATCH_TOKEN`. Without it the button explains that flows run on the hourly schedule.
5. Deploy, then put the resulting URL into the `PUBLIC_APP_URL` GitHub secret so Slack links point at it, and into Supabase's Site URL / Redirect URLs (step 1.5).

### Scaling past GitHub Actions (later)

`apps/worker/src/queue.ts` is a BullMQ worker using the same executor. Point `REDIS_URL` at Redis (Upstash's free tier is enough for low volume), run `npm run queue` on any always-on machine, and enqueue runs with `enqueueFlowRun({ flowId })`.

## Status

This is the first milestone. See the bottom of `docs/PLAN.md` for scope. What works today, verified on real sites:

- the prototype passes the TodoMVC demo flow with the zero-key resolver, and reports FAILED with a screenshot and diagnostics for broken steps (examples in `docs/examples/`);
- the scanner crawls 15 pages of books.toscrape.com in about 16 seconds;
- the migration applies cleanly and row-level security keeps workspaces apart;
- the web app builds and renders every route with no environment variables.

Research behind the product and design decisions: `docs/research/product.md` and `docs/research/design.md` (with before/after screenshots of every page).

Sign-up, login and sign-out (Supabase email + password), the login guard, and live data on Monitors (status, 30-day bars, pass rates, recent runs, **Run** via GitHub Actions) are built and compile, but have not yet been tried against a real Supabase project.

Not built yet: real scans from the website form, email alerts, password reset.
