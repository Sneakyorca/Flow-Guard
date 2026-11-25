# Owner to-do list

Things only you can do: they need your accounts, your secrets or your decisions. Most important first. Tick them off as you go.

Where to find things:
- **GitHub secrets:** github.com/Sneakyorca/Flow-Guard → Settings → Secrets and variables → Actions
- **Supabase SQL editor:** supabase.com → your project → SQL Editor → New query
- **Vercel env vars:** vercel.com → your project → Settings → Environment Variables (redeploy after changing them)

---

## 1. Fix what is broken right now

- [ ] **Re-paste the `GEMINI_API_KEY` GitHub secret.** Cloud runs reject it, most likely because the value was pasted as `GEMINI_API_KEY=AIza…` instead of just `AIza…`. Open the secret, click **Update**, paste **only the key** (it starts with `AIza`, no name, no `=`, no quotes, no spaces), save. Runs now log one clear line, "gemini is misconfigured … check the API key secret", if it is still wrong, instead of failing on every step.
- [x] **Fix the steps in your "cleartill" flow.** Done 25 Nov: it now opens the sample store, adds the Vitamin C serum, opens checkout and checks "How do you want it?" appears (stops before any form or payment). Passed in 26 s. Edit it any time from Monitors → click its name → **Edit steps**.
- [x] **Run migration 0004** (alert settings, private replays). Applied to the Flowguard project on 25 Nov.
- [x] **Run migration 0005** (free-scan rate-limit indexes). Applied on 25 Nov.

## 2. Put it on the internet (all free)

- [ ] **Deploy to Vercel Hobby.** vercel.com → Add New → Project → import `Sneakyorca/Flow-Guard`. Set **Root Directory** to `apps/web` (Framework: Next.js). Add these environment variables, then deploy:

  | Name | Value | Needed for |
  |---|---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL | everything live |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page, `anon` / publishable key | everything live |
  | `SUPABASE_SERVICE_ROLE_KEY` | same page, `service_role` key (keep secret) | replay videos, delete flow, **delete account**, free scan |
  | `GITHUB_DISPATCH_TOKEN` | see below | **Run** button, **Save and run now**, free scan |
  | `GITHUB_REPO` | `Sneakyorca/Flow-Guard` | optional (that's the default) |
  | `NEXT_PUBLIC_APP_URL` | your final URL, e.g. `https://flowguard.vercel.app` | correct share-card links (optional on Vercel, which provides its own URL, but set it if you add a custom domain) |
  | `SCAN_IP_SALT` | any long random text | optional; makes the stored IP hashes for the free scan harder to reverse |

  **`GITHUB_DISPATCH_TOKEN`:** github.com → your avatar → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate. Repository access: **Only select repositories → Flow-Guard**. Permissions: **Actions: Read and write** (Metadata read-only is added automatically). Copy it into Vercel.

- [ ] **Tell Supabase about the Vercel URL.** Supabase → Authentication → URL Configuration: set **Site URL** to your Vercel URL, and add `https://<your-vercel-url>/auth/callback` to **Redirect URLs**.
- [ ] **Update the `PUBLIC_APP_URL` GitHub secret** to the same Vercel URL (no trailing slash), so Slack alerts and emails link to the right replay page.
- [ ] **Try it end to end on the live site:** sign up, add a flow, press **Save and run now**, wait for the toast; run a free scan from the landing page; open a replay link in a private window (it should show the public page with "Monitor your own site free"); paste a replay link into WhatsApp or Slack and check the preview card appears.

## 3. Email (free)

- [ ] **Set up free SMTP for Supabase sign-up emails, then turn "Confirm email" back on.** Either:
  - **Brevo** (300 emails/day free): brevo.com → sign up → Settings → **Senders, domains & dedicated IPs** → add and verify your sender email. Then **SMTP & API** → **SMTP** tab: note server `smtp-relay.brevo.com`, port `587`, your login, and generate an SMTP key.
  - **Gmail with an app password**: turn on 2-Step Verification on the Google account → myaccount.google.com/apppasswords → create one. Server `smtp.gmail.com`, port `587`, username = the Gmail address, password = the 16-character app password. (Fine for low volume; Gmail limits about 500/day.)

  Then Supabase → Authentication → Emails → **SMTP Settings** → enable custom SMTP and fill those in. Finally Authentication → Sign In / Providers → Email → switch **Confirm email** on. Send yourself a sign-up to check it arrives.
- [ ] **Optional: email alerts for failed flows (Brevo API, free).** In Brevo: **SMTP & API → API Keys** → generate a key. Add GitHub secrets `BREVO_API_KEY` (the key) and `ALERT_FROM_EMAIL` (your verified sender address). Failed flows then email the account owner (unless they switch "Email me" off on the Alerts page). Without these secrets nothing is sent and nothing breaks.

## 4. Legal and brand (before you tell the world)

- [ ] **Fill in the legal placeholders** in `apps/web/app/(public)/terms/page.tsx` and `apps/web/app/(public)/privacy/page.tsx`. They're highlighted orange on the pages: `[Company legal name]`, `[Registered address]`, `[Contact email]`, `[Effective date]`, the liability cap, governing law and courts, backup retention. The list and notes are in `docs/legal/README.md`.
- [ ] **Get the Terms and Privacy Policy reviewed by a lawyer** (Nigeria Data Protection Act 2023 and GDPR) before a public launch or taking money. They are templates, not legal advice. `docs/legal/README.md` lists what to ask them about, including whether you need to register with the NDPC and whether you need a Data Processing Agreement for business customers.
- [ ] **Decide about the Gemini free tier.** The Privacy Policy says Google may use free-tier Gemini API content to improve its products. If you don't want that, switch to a paid tier or rely on Claude/heuristic, then update section 5 of the policy.
- [ ] **Read the brand name results in `docs/research/brand.md` and decide.** "FlowGuard" is already used by two other monitoring products and a US trademark covering monitoring software (Class 9/42). The doc suggests keeping it for the beta and choosing a new public name (shortlist: Oluso, Tillproof, Pathproof, Walkpast) before a paid launch. Domain check (RDAP registry lookups, 25 Nov; "free?" means no registration record, confirm at a registrar before you count on it):

  | Name | .com | .app | .io |
  |---|---|---|---|
  | flowguard | taken | taken | free? |
  | oluso | taken | free? | free? |
  | tillproof | taken | free? | free? |
  | pathproof | taken | taken | free? |
  | walkpast | taken | free? | free? |

  `.ng` couldn't be checked automatically (try whois.nic.net.ng). Every `.com` is taken, so plan on `.app` or `.io`. Still search the USPTO / WIPO / Nigerian trademark registries as the doc describes.

## 5. Keep it at $0

- [x] **The repo is public** (since 25 Nov), so GitHub Actions minutes are unlimited and free. Git history was checked first: no keys, tokens or passwords were ever committed. The note below only matters if you make it private again.
- [ ] ~~Check GitHub Actions minutes after a day of hourly runs.~~ Before this round a run with one flow took about 69 s and an idle tick 38 s. The workflow now skips the browser when nothing is due and caches Chromium. Look at Actions → any "Scheduled flow runs" run → **Usage**, or github.com → Settings → Billing → Usage. GitHub showed **0 billable minutes** for this repo's runs on 25 Nov 2026, which usually means the repo is **public** (public repos get unlimited free minutes). If it is **private**, you get 2,000 free minutes a month; hourly runs use roughly 720–1,500 depending on how many flows you have. **Your decision:** making the repo public removes the limit, but anyone can then read the code (your secrets stay private, because they live in GitHub/Vercel/Supabase settings, never in the code).
- [ ] **Watch Supabase storage** (Supabase → Project Settings → Usage). The free tier has 1 GB. Old recordings are now deleted automatically (passing runs after 7 days, failures after 30), and each run's log says how much it freed (`cleanup: freed … MB`). To keep things for less time, add repository **variables** (Settings → Secrets and variables → Actions → Variables tab) `RETAIN_PASSING_DAYS` / `RETAIN_FAILED_DAYS`, and update the Privacy Policy to match.

## 6. Nice to have

- [ ] Consider removing `ANTHROPIC_API_KEY` from GitHub secrets if you don't want to spend paid credits. Runs fall back to Gemini, then the free heuristic.
- [ ] If you add Groq (`GROQ_API_KEY`), add it to the processors table in the Privacy Policy.
- [ ] The new logo ("the checked path") is in `apps/web/app/icon.svg`. If you rename the product, the mark still works; only the wordmark text changes.
