# Legal pages

> **These are templates, not legal advice.** They were drafted to describe what Oluso actually does, in plain English, but nobody qualified has reviewed them. Have a lawyer who knows the Nigeria Data Protection Act 2023 and the GDPR review them before a public launch or before taking payment.

The live pages are:

- Terms of Service: `apps/web/app/(public)/terms/page.tsx` → `/terms`
- Privacy Policy: `apps/web/app/(public)/privacy/page.tsx` → `/privacy`

They're linked from the landing page footer, the sign-up form and the app sidebar.

## Placeholders to fill in

Each one is highlighted in orange on the page (`<Ph>…</Ph>` in the code). Search the two files for `<Ph>`.

| Placeholder | Where | Notes |
|---|---|---|
Your name, city and contact email live in **one file**, `apps/web/lib/operator.ts`. Fill it in and both pages update. Until then they show orange placeholders.

| Detail | Set to | Notes |
|---|---|---|
| Who runs it | `lib/operator.ts` → `name` | Beta: your own name as an individual, e.g. "Ada Lovelace (trading as Oluso)". After CAC registration, the company name. |
| Where | `lib/operator.ts` → `place` | City and country for the beta; a full postal address once registered. |
| Contact email | `lib/operator.ts` → `email` | An inbox you read (a free Gmail such as oluso.help@gmail.com is fine). Data requests must be answered within 30 days. |
| Effective date | 25 November 2026 (`components/legal.tsx`) | Update it on every material change. |
| Liability cap | USD 50 or the same in Naira (Terms §10) | A lawyer may suggest a different structure. |
| Law and courts | Nigeria; courts of Lagos State (Terms §14) | Where you're based. |
| Backup retention | 7 days (Privacy §7) | Supabase free projects keep only short-lived backups; recheck if you upgrade. |

## Things the lawyer should look at

1. **Controller vs processor.** The policy says you are the controller for account data and a processor for data captured from customers' websites. If you sign up business customers, you will probably need a short **Data Processing Agreement** (DPA) to offer them.
2. **NDPA registration.** The Nigeria Data Protection Commission (NDPC) requires "data controllers and processors of major importance" to register. Check whether Oluso meets the thresholds as it grows.
3. **Gemini free tier.** The policy discloses that Google may use free-tier Gemini API content to improve its products. If that's not acceptable to customers, move to a paid tier (or rely on Anthropic/heuristic only) and update the policy.
4. **International transfers** (Nigeria/EU → US providers): confirm the wording about Standard Contractual Clauses and NDPA Part VIII.
5. **Testing third-party sites.** The acceptable-use and authorisation clauses are the main protection if a user points Oluso at a site they don't own. Make sure they're strong enough.

## Keep the policy true

The retention table in the Privacy Policy is enforced by code. If you change one, change the other:

| Policy says | Enforced by |
|---|---|
| Passing-run recordings 7 days, failed 30 days, run records 90 days, scans 30 days | `apps/worker/src/cleanup.ts`, run at the end of every `run-due` (env: `RETAIN_PASSING_DAYS`, `RETAIN_FAILED_DAYS`, `RETAIN_RUN_ROWS_DAYS`, `RETAIN_SCAN_DAYS`) |
| GitHub Actions debug copies 3 days | `retention-days: 3` in `.github/workflows/scheduled-runs.yml` |
| Delete account removes everything | `apps/web/app/api/account/route.ts` |
| Processors list | Add a row whenever you add a provider (e.g. Groq if you set `GROQ_API_KEY`) |
