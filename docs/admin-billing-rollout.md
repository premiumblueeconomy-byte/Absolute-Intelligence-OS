# Administration and subscription rollout

This change adds an administrator console at `/admin`, account suspension/restoration and administrator grants, searchable users and prompts, plan configuration, AI/project limits, platform announcements, a generation pause, workspace summaries, and an append-only administrator audit trail.

Buying a plan never grants administrator access. Suspended accounts keep access to their own billing page and portal so they can cancel. Suspension itself does not cancel or refund subscriptions. Limits count projects owned by the account and successful AI generations per UTC calendar month; reserved in-flight generations count for five minutes. Operators bypass quota limits, but not the platform generation pause. Existing projects are preserved if a limit is lowered.

## Deployment order (production approval required)

1. Review and apply `supabase/migrations/20260919223939_admin_console_and_subscriptions.sql` to the intended Supabase project. This adds restrictive account checks to existing RLS-protected application tables and research file storage. Active users retain their previous access rules. Paid plans start disabled and quota limits start unlimited.
2. Bootstrap only the explicitly approved owner account, in a transaction, by updating `profiles.is_platform_admin` and recording an `admin_audit_log` entry with action `bootstrap_administrator`. Verify the account ID against the signed-in account. Do not promote every account or trust editable signup metadata.
3. Deploy `ask-absolute` with its existing `deno.json`, `contracts.ts`, `swarm.ts`, and `prompt.ts`. Keep JWT verification enabled. Deploy `stripe-checkout` and `stripe-portal` with `_shared/billing.ts` and JWT verification enabled. Deploy `stripe-webhook` with `_shared/billing.ts` and `billing-policy.ts`, JWT verification disabled; the function verifies Stripe's signature over the raw request body.
4. Merge/deploy the frontend only after the database and functions are ready. Refresh the owner's session/page and verify `/admin`, `/billing`, the prompt library, and a generation.
5. Confirm a normal user cannot call `admin_console`, change account status/admin flags, write subscription state, or finalize AI usage. Confirm suspended users cannot read app data or generate but can still manage billing.

## Activate payments separately

The existing app uses Stripe, and this implementation completes that integration. Stripe availability and the business's preferred provider must be confirmed before accepting payments. Do not charge users or invent subscription prices during rollout.

Store secrets only in Supabase Function Secrets, never in the frontend or GitHub:

- `STRIPE_SECRET_KEY` — start with a Stripe test key.
- `STRIPE_WEBHOOK_SECRET` — signing secret for this endpoint.
- `SITE_URL` — `https://absolute-intelligence-os.vercel.app` (the default).
- `BILLING_ENABLED` — leave unset/false until testing is complete; set `true` to allow checkout.

Register `https://afzyivlffdrdiqrrimeu.supabase.co/functions/v1/stripe-webhook` for `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `checkout.session.async_payment_failed`. The handler fetches current subscription state, records events atomically, ignores duplicates/older events, checks the stored customer owner, and fails closed for unknown prices or unpaid statuses.

Configure the Stripe customer portal to allow payment updates and cancellation. If enabling plan switching, allow only Price IDs registered in this app. In the admin console, set the chosen plan prices, currency, monthly/yearly interval, matching recurring Stripe Price IDs, and quotas. Amounts are integers in Stripe's smallest currency unit (USD/NGN: 100 units = 1 major unit; zero-decimal currencies differ). Existing subscribers retain their existing Stripe price when plan settings change. Register historic prices before changing them outside this console.

Test successful/failed checkout, duplicate checkout clicks, retries after a database error, renewal, payment failure, cancellation, expired entitlement, and webhook retries using Stripe test mode. Only then switch to live keys and matching live Price IDs and explicitly enable billing. Until configured, the UI says paid subscriptions are unavailable. No payment card details are handled by the application.

## Verification

- `npm test`: component guards, billing entitlement mapping, prompt pagination, generation and export regression tests.
- `npm --prefix tests/admin ci && npm --prefix tests/admin test`: replays migrations in an isolated PGlite PostgreSQL instance, using fixture Auth/Storage schemas. Tests administrator permission checks, protected columns, self-demotion prevention, project/run quotas and failure refunds, account suspension, billing access, event ordering and deduplication. No production credentials or mutations.
- `npx tsc --noEmit` and `npm run build`.
- Deno type-check changed functions with the `ask-absolute/deno.json` import map and `--node-modules-dir=none`.

Local tests do not replace a post-deployment Supabase RLS check or Stripe test-mode checkout. Production database and end-to-end payment verification remain pending until rollout and provider setup are approved.
