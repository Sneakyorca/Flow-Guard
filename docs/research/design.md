# Design research: making FlowGuard look made by people

The first port of the Figma export (screenshots in `screenshots/before/`) is competent but reads as generated. This note records why, what well-made developer tools do differently, and the rules the revised UI follows (`screenshots/after/`).

## What gives the "before" away

Checked against commonly cited tells of AI-generated interfaces (sources below) and our own screenshots:

| Tell | Where it showed up |
|---|---|
| Indigo/violet as the only brand idea (Tailwind's indigo-500 family) | primary buttons, active nav, brand mark, links, sliders, pills, the peace card |
| Glow and gradient on everything | brand icon glow, metric cards, usage card, incident banner, peace card radial |
| Four identical metric tiles with decorative sparklines | Monitors header; the sparklines are drawn paths, not data |
| A thick coloured stripe on one edge of a card | failed table row |
| Uppercase letter-spaced "pill" labels | `BETA`, `PLAIN ENGLISH. REAL CONFIDENCE.`, `CRITICAL`, `FREE INSTANT SITE SCANNER`, `4 STEPS` |
| Glyphs standing in for icons | ✓ ! ⚠ ↖ ✳ ▰ ▥ ⌄ ↻ in status circles, player, phone mock |
| Filler copy that could sit on any product | "Ship with confidence. Sleep a little better.", "Your flows. Always protected.", "A little less firefighting. A lot more building." |
| Inter at every size, everything medium weight, tiny 9–11px labels | whole app |
| Dark navy by default | whole app |

## What Linear, Vercel, Sentry, Checkly, Better Stack and Raycast do instead

- **Earned attention.** Linear's refresh principle is "don't compete for attention you haven't earned": chrome recedes, content and state carry the colour. Colour appears when something is wrong, not as decoration.
- **One accent, used for one job.** Vercel's Geist is almost entirely greyscale with semantic colours for state; the accent marks the primary action and focus. Sentry keeps its purple for brand moments and uses plain greys inside the product.
- **Density without noise.** Linear's stated challenge was keeping information density while reducing visual noise: fewer borders, tighter rows, aligned columns, tabular numbers, mono for machine data (URLs, ids, timings).
- **Real typographic hierarchy.** A few sizes with clear jumps (page title, section title, body, meta), not ten sizes between 8 and 14px. Weight and colour do more work than size.
- **Specific copy.** Checkly and Better Stack talk about checks, regions, response times. Error states say what happened and what to do. No slogans inside the product.
- **Real tables.** Monitors and runs are tables with headers, aligned numbers and row hover, not stacks of cards.
- **Status as small, consistent signals.** A dot or small icon plus a word; tinted backgrounds only for the thing that needs action right now.

## Decisions for FlowGuard

**Palette.** A warm, paper-like light theme by default, with a matching dark theme from the same tokens (`prefers-color-scheme`).

| Token | Light | Use |
|---|---|---|
| `--bg` | `#f6f5f1` | page |
| `--surface` | `#ffffff` | tables, panels |
| `--ink` | `#17160f` | text, primary buttons |
| `--muted` | `#6b685e` | secondary text |
| `--line` | `#e3e0d6` | hairlines |
| `--accent` | `#e4572e` (signal orange) | brand mark, primary call to action on marketing pages, focus ring, active nav marker. Nothing else. |
| `--ok` `--bad` `--warn` | `#1f7a4d` `#c8262f` `#9a6700` | status only |

Signal orange because it is the colour of hazard tape and traffic cones: "something needs looking at", without being the red we reserve for failures. Primary buttons inside the app are ink black; orange stays rare.

**Type.** IBM Plex Sans (variable) for UI and IBM Plex Mono for URLs, ids, timings and logs. Plex has a slightly mechanical, engineered character that suits a monitoring tool and is not the default everyone ships. Self-hosted via Fontsource: no request to Google, works offline and on slow connections.

Scale: 32/24 page titles, 15 section titles, 14 body, 13 table text, 12 meta. Nothing below 12px. Tabular figures for numbers.

**Spacing.** 4px base; 8/12/16/24/32/48 steps. Tables use 12px vertical padding. Panels have 1px hairlines and 6px radius, no shadows except the toast and the replay video.

**Icons.** One stroke icon set (the existing 24px SVG set at 1.75 stroke). Status icons are SVG check/cross/alert, never text glyphs. No emoji.

**Copy rules.**
- Say what the thing does. "Runs every hour from GitHub Actions" beats "Always protected".
- Failures lead with the plain-language explanation the worker now produces, then evidence.
- Demo mode is labelled once, clearly, with what to do to leave it.
- Empty states tell you the next action.
- Sentence case everywhere. No uppercase pills.

**Layout changes, same information architecture.**
- Monitors: one summary line of real numbers instead of four tiles; an action row for the failing flow; a real `<table>`; "Recent runs" log and "Next scheduled runs" replace the activity card and the slogan card.
- Create flow: two columns kept; adds a phrasing guide that matches what the heuristic resolver understands.
- Replay: "Why it failed" leads, then the recording and step log side by side with the inspector; step timeline uses icons.
- Scanner: plain headline about checkouts; the example report shows real output from a scan of books.toscrape.com rather than a mock; the sample replay stays as a labelled example.
- Alerts and settings: specific explanations of what each switch does.

## Sources

- [10 signs of AI-generated design](https://pub.towardsai.net/10-signs-of-ai-generated-design-and-how-to-make-yours-not-look-like-it-482ff7da81fc), [Anti AI slop ban list](https://github.com/Laith0003/ux-skill/wiki/Anti-AI-slop-ban-list), [Why every AI-built site looks the same: Tailwind's indigo-500](https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p), [7 signs a UI has been vibe coded](https://www.thefountaininstitute.com/blog/signs-vibe-coded-ui), [AI makes bad design look good enough](https://builtin.com/articles/ai-design-slop-era)
- [Linear: behind the latest design refresh](https://linear.app/blog/behind-the-latest-design-refresh), [Linear: how we redesigned the Linear UI](https://linear.app/blog/how-we-redesigned-the-linear-ui), [Linear changelog, new UI](https://linear.app/changelog/2024-03-20-new-linear-ui)
- [Vercel Geist design system](https://vercel.com/geist), [Geist font](https://vercel.com/geist/font)

---

# Round 2 (November 2026): charts, trust, and the pages around the product

Screenshots: `screenshots/v2/before/` (the state at the start of this round) and `screenshots/v2/after/`.

## What the good monitoring tools do with run history

| Tool | How it shows history | What we took |
|---|---|---|
| **Checkly** | Check overview: one bar per time bucket, each bar aggregating every run in it, coloured by pass/fail. Selecting a bar filters the run list. Response time shows average, p95 and p99 as toggleable lines over the same window. Dashboards offer 1h / 3h / 24h / 7d / 30d. | Bars of *runs per bucket* (not a percentage line), failures stacked on top so they can't hide; a separate run-time line on the same time range; one range control for both. |
| **Better Stack / Atlassian Statuspage** | A strip of 90 daily cells with the uptime % under it. Days are green, then yellow/orange/red by how much went wrong. Hover a day to see what happened. | The per-flow 30-day strip with a tooltip per day, the pass % above it, and failed days drawn taller so they read without colour. |
| **Sentry** | One event graph per issue that follows the page's time range and environment; release markers on the same axis. | Charts follow one range switch; the flow page puts the chart directly above the run list it summarises. |
| **Vercel** | Greyscale charts (Geist), colour only for errors; numbers in tabular figures; empty states that say what will appear and when. | Run-time line in ink, not a brand colour; "No runs in this period yet" inside the empty plot instead of a blank box. |
| **Linear** | Dense rows, quiet chrome, everything clickable goes somewhere specific. | Flow names now link to a real page; every failed run in the list links to its replay. |

## How they earn trust with a first-time user

1. **Label sample data once, clearly, with the way out.** Every page in demo mode says "Sample workspace … connect Supabase" in one dashed notice; charts say "sample data" in their footer.
2. **Show the clock.** The top bar now says when the last run actually happened and when the next scheduled check is due, and turns amber ("late") if hourly runs stop arriving. Before, it said "Runner healthy · next run at :07" whatever was true.
3. **Show work happening.** After **Run**, the flow says "Running… on GitHub Actions, usually 2–3 min", the page checks every 15 seconds, and a toast says pass or fail when the result lands. Silence after a click is where trust is lost.
4. **Make the public link look like it came from a real company.** Shared replay links now open on a plain public page (no sample workspace sidebar), with a proper share card (title, pass/fail, the step timeline) in Slack, WhatsApp and X.
5. **Say the rules out loud.** Terms and Privacy in plain English, linked from the sign-up form, with retention periods that the code actually enforces. A delete-account button that really deletes.

## What changed in the app

- **Monitors.** The four number tiles became one "All flows" panel: a 24h / 7d / 30d switch, *Runs passed* (big percentage, "286 of 288 runs · 2 failed") over stacked bars, and *Median run time* over a line chart. The table's fake per-status bars are now each flow's real 30-day strip.
- **Flow page `/flows/[id]`.** Name, site, device, schedule and step count in one line; Pause/Resume, Edit steps, Run now. A failure banner with the replay link. History charts, the 30-day strip, the run list (12, then "Show 50"), the steps, and a delete panel with a confirm step. Editing reuses the builder.
- **Identity.** The "checked path" mark from `brand.md` replaces the hexagon-and-pulse; favicon, Apple icon, manifest icons and share cards all use it.

## Chart rules (components/charts.tsx)

- Hand-rolled SVG, no chart library. Geometry is computed in real pixels (ResizeObserver) so gaps stay 2px on any screen and lines stay 2px thick.
- Colour means state only: green passed, red failed, amber **hatched** flaky. The status red and amber fail a colour-blindness separation check (deutan ΔE 2.0), so flaky also carries a texture, failures always sit on top of a bar, and failed days are drawn taller in the strip. Green is softened (62% on the surface) so the failures are what you see first.
- One series per chart, so no dual axes. Run count and run time are two charts on the same time range.
- Every value can be reached three ways: hover, keyboard (focus a chart, ← → Home End), and a visually hidden table for screen readers.
- Dark mode uses the same tokens; nothing is hard-coded.
- Demo charts are generated from a seeded random series fixed to the sample incident's date, so the prerendered page and the browser draw the same thing.

## Sources (round 2)

- [Checkly: reporting](https://docs.checklyhq.com/docs/reporting), [Checkly: new check overview page](https://www.checklyhq.com/blog/check-overview-page-new-look), [Checkly dashboards](https://www.checklyhq.com/docs/communicate/dashboards/overview)
- [Atlassian Statuspage: historical uptime](https://support.atlassian.com/statuspage/docs/display-historical-uptime-of-components), [Status.io status charts](https://kb.status.io/design/status-charts/)
- [Sentry: issue details](https://docs.sentry.io/product/issues/issue-details)
- [Vercel Geist](https://vercel.com/geist), [Linear: how we redesigned the Linear UI](https://linear.app/blog/how-we-redesigned-the-linear-ui)
