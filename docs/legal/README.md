# Legal pages

> **These are templates, not legal advice.** They were drafted to describe what FlowGuard actually does, in plain English, but nobody qualified has reviewed them. Have a lawyer who knows the Nigeria Data Protection Act 2023 and the GDPR review them before a public launch or before taking payment.

The live pages are:

- Terms of Service: `apps/web/app/(public)/terms/page.tsx` → `/terms`
- Privacy Policy: `apps/web/app/(public)/privacy/page.tsx` → `/privacy`

They're linked from the landing page footer, the sign-up form and the app sidebar.

## Placeholders to fill in

Each one is highlighted in orange on the page (`<Ph>…</Ph>` in the code). Search the two files for `<Ph>`.

| Placeholder | Where | Notes |
|---|---|---|
| `[Company legal name]` | both | The registered business name (CAC registration in Nigeria), or your own name if you trade as a sole proprietor. |
| `[Registered address]` | both | A postal address where legal notices can be sent. |
| `[Contact email]` | both | An inbox you actually read, e.g. privacy@ or hello@ your domain. Data requests must be answered within 30 days. |
| `[Effective date]` | both (top) | The date the version goes live. Update it on every material change. |
| `[Liability cap, e.g. USD 50]` | Terms §10 | Pick an amount; a lawyer may suggest a different structure. |
| `[Governing law, e.g. the Federal Republic of Nigeria]`, `[Courts, e.g. Lagos State]` | Terms §14 | Where you are based. |
| `[Backup retention, e.g. 30 days]` | Privacy §7 | Check your Supabase plan's backup retention (free projects have limited backups). |

## Things the lawyer should look at

1. **Controller vs processor.** The policy says you are the controller for account data and a processor for data captured from customers' websites. If you sign up business customers, you will probably need a short **Data Processing Agreement** (DPA) to offer them.
2. **NDPA registration.** The Nigeria Data Protection Commission (NDPC) requires "data controllers and processors of major importance" to register. Check whether FlowGuard meets the thresholds as it grows.
3. **Gemini free tier.** The policy discloses that Google may use free-tier Gemini API content to improve its products. If that's not acceptable to customers, move to a paid tier (or rely on Anthropic/heuristic only) and update the policy.
4. **International transfers** (Nigeria/EU → US providers): confirm the wording about Standard Contractual Clauses and NDPA Part VIII.
5. **Testing third-party sites.** The acceptable-use and authorisation clauses are the main protection if a user points FlowGuard at a site they don't own. Make sure they're strong enough.

## Keep the policy true

The retention table in the Privacy Policy is enforced by code. If you change one, change the other:

| Policy says | Enforced by |
|---|---|
| Passing-run recordings 7 days, failed 30 days, run records 90 days, scans 30 days | `apps/worker/src/cleanup.ts`, run at the end of every `run-due` (env: `RETAIN_PASSING_DAYS`, `RETAIN_FAILED_DAYS`, `RETAIN_RUN_ROWS_DAYS`, `RETAIN_SCAN_DAYS`) |
| GitHub Actions debug copies 3 days | `retention-days: 3` in `.github/workflows/scheduled-runs.yml` |
| Delete account removes everything | `apps/web/app/api/account/route.ts` |
| Processors list | Add a row whenever you add a provider (e.g. Groq if you set `GROQ_API_KEY`) |
