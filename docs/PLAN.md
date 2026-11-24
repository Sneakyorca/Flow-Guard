# FlowGuard — Build Plan

FlowGuard is an Autonomous QA & Critical-Flow Monitoring SaaS ("Uptime Robot for User Journeys").

## Hard constraint: $0 to start

No paid services. Every default must run on a free tier or locally:

| Need | Free choice |
|---|---|
| Web app hosting | Vercel Hobby (free) |
| DB + Auth + Storage | Supabase free tier |
| AI step resolver | **Google Gemini API free tier** (`gemini-2.5-flash` / flash-lite via AI Studio key) as default; **Groq free tier** as second option; a **zero-key heuristic resolver** (keyword/role matching) so everything runs with no key at all. Anthropic/Claude is an optional paid provider behind the same interface. |
| Scheduled browser runs | **GitHub Actions cron** (free; runs Playwright headless) as the zero-cost scheduler. BullMQ + Redis worker kept as the scale-up path (Upstash Redis free tier works for low volume). |
| Alerts | Slack incoming webhook (free); email via Resend free tier (optional) |

## What the application does

1. Users sign up, add a target website URL, and define critical user journeys in plain English (e.g. "Click Sign Up, enter test email, submit, and confirm dashboard loads") plus viewport (Desktop or Mobile) and run frequency (Hourly, Daily, or Webhook-triggered).
2. A background worker spins up isolated headless Playwright (Chromium) browser instances on a schedule.
3. Instead of fragile CSS selectors, at each step the worker extracts a simplified accessibility/DOM snapshot and uses a fast LLM call to resolve the element matching the plain-English intent, then executes the action (click, fill, press, navigate, assert text/URL).
4. During execution Playwright records video (.webm), captures console errors, and logs failed HTTP requests (status >= 400).
5. All steps succeed → run PASSING with step durations. Any step fails → FAILED; video + diagnostics uploaded to Supabase Storage, alert sent (Slack/email), and a public read-only link `/replay/[runId]` (via share token) is generated.
6. Public "Instant Free Scan" on the landing page: paste a URL → 60-second zero-config crawl checking broken links, mobile viewport overflow, and uncaught console errors → shareable report.

## Architecture

```
flowguard/  (npm workspaces monorepo)
  apps/web        Next.js (App Router, TypeScript, Tailwind v4) — UI + API routes
  apps/worker     Node + Playwright — executor, AI resolver, free scanner,
                  BullMQ processor, and a CLI used by GitHub Actions cron
  packages/shared Shared types + zod schemas (steps, actions, run results)
  supabase/migrations  SQL migrations
  .github/workflows    scheduled-runs.yml (cron → worker CLI), ci.yml (typecheck/build)
  docs/design-reference  Figma export (App.tsx + styles.css) — source of truth for UI
```

AI Step Resolver: provider-agnostic interface `resolveStep(instruction, simplifiedDomNodes) → { action, selector_or_coordinates, value?, reasoning }`, validated with zod. Providers: `heuristic` (default, no key), `gemini`, `groq`, `anthropic`. Pick via `FLOWGUARD_RESOLVER` env var; auto-select gemini if `GEMINI_API_KEY` is set.

DOM snapshot: walk visible interactive + text elements in the page, stamp each with `data-fg-id`, return `{id, role, tag, name, text, type, placeholder, href}`. The resolver returns an id → selector `[data-fg-id="N"]`.

## Core database tables

- `workspaces` (id, owner_id, plan, slack_webhook_url)
- `flows` (id, workspace_id, name, start_url, viewport, schedule_cron, status, steps_json)
- `flow_runs` (id, flow_id, status, started_at, duration_ms, failed_step_index, error_message, video_url, console_logs_json, network_errors_json, public_share_token)
- plus `public_scans` for the free scanner

RLS: users only see rows for workspaces they own. Public replay read goes through a `security definer` function keyed on `public_share_token`. Storage bucket `replays` (private; signed URLs). Trigger creates a workspace on signup.

## First milestone (this build)

1. Monorepo structure + shared package.
2. Supabase schema migrations.
3. **Working standalone Playwright + AI step-executor prototype** that runs a 3-step plain-English flow on a live URL and outputs a video recording + JSON diagnostics. Default demo: `https://demo.playwright.dev/todomvc` — (1) type "Buy milk" into the new todo input and press Enter, (2) assert "Buy milk" is in the list, (3) click the "Active" filter. Must work with the zero-key heuristic resolver.
4. Free scanner CLI.
5. GitHub Actions cron workflow that runs due flows (zero-cost scheduler) + BullMQ processor skeleton.
6. Next.js web app porting the Figma design in `docs/design-reference/` into real routes: `/monitors`, `/flows/new`, `/replay/[runId]`, `/scan`, `/alerts`, `/settings` (shared sidebar shell), with demo data until Supabase is connected.
7. README with free-tier setup steps.
