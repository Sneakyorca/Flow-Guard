# Round 2 screenshots

Taken with Playwright against `npm run build && npm start`, desktop 1440×900 and phone 390 wide, full page.

- `before/`: the app at the start of round 2 (sample data).
- `after/`: after round 2. Sample data unless noted. `*-dark.png` = system dark mode.
  - `monitors-*`: the new history charts and per-flow 30-day strips.
  - `flow-detail-*`, `flow-edit-desktop`: the new `/flows/[id]` page and its editor.
  - `terms-*`, `privacy-*`, `signup-*` (legal agreement line), `settings-desktop` (delete account), `alerts-desktop`.
  - `replay-public-*`, `landing-live-*`: built with a dummy Supabase URL so the app behaves as a logged-out visitor sees it on the live site: the public replay frame and the real scan form.
  - `og-landing.png`, `og-replay-sample.png`: the share cards (1200×630) for the landing page and a replay link. `apple-icon.png`: the home-screen icon.
