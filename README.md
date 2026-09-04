# Absolute Intelligence OS (AIOS)

Discover Reality. Connect Knowledge. Unlock Opportunity. Execute Better.

A global opportunity intelligence operating system: give it a resource, problem, technology,
market, location, research finding, business idea or question, and it returns **structured,
evidence-graded intelligence objects** — Projects, Opportunities, Claims, Evidence, Assumptions,
Unknowns — not a chat transcript. See `docs/spec.md` (not included here; keep your master build
spec alongside this repo) for the full product philosophy.

## What's built

Per the phased build priority in the spec (section 52), Phase 1 is complete and most of
Phase 2 is too:

- Auth + persona-based onboarding (10 personas, each tunes default scoring weights)
- Home dashboard (active projects, opportunity radar)
- Projects (create, list, workspace with Overview / Discover / Opportunities tabs)
- **Ask Absolute** — conversational interface across the 10 intelligence modes (Understand,
  Investigate, Map, Discover, Compare, Challenge, Forecast, Build, Invest, Learn), each mapped to
  its own agent chain
- **Resource Explorer** and **Problem Explorer** — the two discovery workflows, each producing
  persisted Opportunity objects, not just prose
- **Opportunity Genome** — the full structured opportunity object with tabs for Overview,
  Scoring (editable weights + radar chart), and Assumptions/Unknowns/Claims/Evidence
- **Opportunity scoring engine** — the weighted 0-100 formula from the spec, with the Opportunity
  Score and Confidence Score always shown separately (never merged)
- **Prompt Library** — all 50 flagship prompts from the spec, each wired to a real agent-chain
  workflow (not a raw pass-through to the model)
- **Report generator** — assembles an Absolute Intelligence Report from a project + opportunity
  and exports it to PDF
- **Red Team engine** — "Attack This Idea" runs a 10-perspective adversarial critique (skeptical
  investor, engineer, scientist, customer, competitor, regulator, financial/environmental/
  operational/supply-chain analyst), persisted per opportunity, with vulnerabilities grouped by
  perspective, conditions required for success, and experiments required before investment
- **Execution Engine** — converts an opportunity into the spec's default phased roadmap
  (0–30 days / 31–90 days / Month 4–6 / Month 7–12 / Year 2), with tasks (owner, status, priority,
  budget, deadline, dependency, KPI)
- **Scenario Lab** — Baseline/Optimistic/Adverse/Black Swan/Transformative scenarios with
  user-defined variables and a transparent sensitivity model (explicitly not a fabricated
  financial forecast) that recomputes projected margin and opportunity score
- **System Mapping Studio** — a drag-and-connect node/edge canvas (15 node types, 15 relationship
  types per the spec) per project, manual for now (no AI-assisted auto-generation yet — see below)
- **Experiment Engine** — a dedicated Experiment object (hypothesis, dangerous assumption, method,
  success metric, actual result, learning) with its own status pipeline (Draft → Planned → Running
  → Completed/Failed/Validated/Invalidated), with a one-click "Track" action turning any Red Team
  "experiment required" line into a tracked experiment
- **Research-to-Enterprise upload** — upload a PDF (native Anthropic PDF document understanding,
  no separate parsing library), TXT, MD or CSV research document; extracts a structured
  commercialization assessment (research question, methodology, findings, limitations, TRL +
  rationale, potential products/applications/customers, required validation, commercialization
  roadmap) with a "Create Opportunity" action

- **Signature interactions** — "Unlock Further" on any opportunity ("What have we not yet
  considered?") appends genuinely new, distinct opportunities instead of repeating what's already
  found; "Question the Question" in Ask Absolute reframes your question instead of answering it —
  hidden assumptions, what's missing, alternative framings, the deeper question
- **AIQ** — a 20-question self-assessment across the spec's 10 intelligence domains, with the
  0-100 classification bands (Reactive → Theoretical Absolute Intelligence), strengths/weaknesses,
  targeted exercises, and historical progress across retakes
- **Decision Log** — institutional memory per project (decision, context, options considered,
  expected vs. actual outcome, learning)
- **Watchlist** — track markets/companies/technologies/etc.; "Check" is explicitly labeled as not
  a live data feed — it calls the same reasoning engine as everything else and reports an honest
  confidence score instead of a fabricated current status
- **AI-assisted System Map generation** — "Generate with AI" proposes a system map's nodes and
  relationships from a project's objective
- **Organizations & Collaboration** — organizations, role-based membership (owner/admin/
  strategist/researcher/analyst/member/viewer), email-based invites (accepted via an RPC that
  checks the invite email against the caller's own auth JWT — never a client-trusted claim).
  Projects can optionally belong to an organization; every project-scoped table's SELECT policy
  was extended so org members can see a shared project and everything inside it. Writes stay
  owner-only in this pass (multi-writer conflict handling is separate, later work), and uploaded
  research-document *files* stay owner-only (only the row/metadata is shared) since the storage
  bucket policy keys off the uploader's own folder path.
- **Global Opportunity Atlas** — every opportunity you can see (own + org-shared) in one
  cross-project view: filter by country, industry, status and minimum score; sort by score,
  confidence or recency; a clickable by-country summary strip. All grouping/aggregation is
  computed client-side over data you already have — no separate geo/analytics service.
- **Intelligence Graph** — a cross-project graph of every project, resource, problem and
  opportunity you can see. Solid edges are real foreign keys (project owns resource/problem;
  resource or problem sourced an opportunity); dashed edges are a computed "related market" —
  two opportunities in *different* projects that share the same country and industry. Explicitly
  not AI-generated and not semantic/vector similarity (see "Not yet built" below) — every edge
  traces to a real field match, and the UI says so.

- **Admin panel** (`/admin`) — restricted to accounts with `profiles.is_platform_admin = true`
  (there's no self-serve way to become one; set it directly in the database). Shows
  platform-wide aggregate counts and a low-sensitivity organizations/recent-projects list —
  deliberately never another user's actual project content, opportunities, or contact details.
- **i18n** — a lightweight custom language context (no new dependency), with English, French,
  Spanish, Portuguese and Swahili dictionaries. **Coverage is partial and honestly scoped**: only
  the navigation bar and the landing page hero are translated; everything else in the app is
  English-only. The translations are this model's own best-effort rendering, not reviewed by a
  native speaker or professional localizer — treat them as a starting point to verify, especially
  the Swahili strings.
- **Vector/semantic search** — schema (`opportunities.embedding`, a `match_opportunities` RPC)
  and two edge functions (`embed-text`, used both to embed an opportunity and to embed a search
  query) are built and wired into the UI (an "Enable semantic search" action per project, a
  semantic search box on the Atlas page). **Not live**: Anthropic's API doesn't serve embeddings,
  so `embed-text` calls OpenAI's `text-embedding-3-small` by default and requires an
  `EMBEDDING_API_KEY` Supabase secret that isn't set yet. Until it is, every embed/search call
  fails loudly with a clear error — nothing here fabricates a result.
- **Billing/subscriptions** — schema (`subscriptions`, one free row auto-created per signup) and
  three edge functions (`stripe-checkout`, `stripe-portal`, `stripe-webhook`) are built, plus a
  `/billing` page with plan cards and an upgrade flow. **Not live**: needs a real Stripe account
  — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_ENTERPRISE`
  secrets, Products/Prices created in the Stripe dashboard, and the webhook registered there
  pointing at `stripe-webhook`'s URL (which needs `verify_jwt = false` — already set in
  `supabase/config.toml` — since Stripe can't send a Supabase JWT). Until that's done, every
  account just stays on the free plan and upgrade attempts fail with a clear error.

**Not yet built**: Global Opportunity Atlas and Intelligence Graph are both built (see above) —
nothing from the spec's Phase 3/4 priority list remains un-started, but semantic search and
billing are scaffolded rather than live (see their entries above for exactly what's missing).

## Stack

Vite + TanStack Start (React 19, SSR) + Supabase (Postgres, Auth, RLS) + Tailwind v4. Deliberately
**not** using the spec's suggested Next.js/Clerk/FastAPI stack — this reuses a stack already
proven to work, with no product-relevant difference for this build.

The reasoning engine (`supabase/functions/ask-absolute`) is a single DeepSeek chat-completions API
call per workflow run, given the full core system prompt (spec section 56) plus the specific agent
chain a workflow should apply, and required to return the structured JSON agent-output contract
(spec section 25) — not a chat string. The `agents` list is threaded through the request/response
so a future version can fan this out into one call per agent without changing the contract.
`research-extract` and `systemmap-generate` use the same DeepSeek call shape. One real limitation
from this choice: DeepSeek's API has no native PDF/document understanding (Anthropic's does), so
Research-to-Enterprise only accepts .txt/.md/.csv uploads now — a PDF upload fails with a clear
error rather than silently mishandling the file.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (or via whatever platform
   you use to provision one).
2. **Run the migrations** in `supabase/migrations/` against it, in order (via the Supabase CLI:
   `supabase link` then `supabase db push`, or paste them into the SQL editor in order).
3. **Copy `.env.example` to `.env.development`** and fill in your project's URL and anon
   (`publishable`) key — both the `VITE_`-prefixed and unprefixed versions are read (see
   `vite.config.ts`).
4. **Set the reasoning engine's secret** on the Supabase project (not in `.env` — it must never
   reach the client bundle):
   ```
   supabase secrets set DEEPSEEK_API_KEY=sk-...
   ```
   (`AIOS_MODEL` optionally overrides the model — defaults to `deepseek-chat`.)
5. **Deploy the edge functions**:
   ```
   supabase functions deploy ask-absolute research-extract systemmap-generate
   ```
6. `npm install && npm run dev`

The app is fully usable at this point. Two features are optional and need their own setup —
skip them and everything else still works:

- **Semantic search**: `supabase secrets set EMBEDDING_API_KEY=sk-...` (an OpenAI key by
  default; `EMBEDDING_MODEL` to override the model), then
  `supabase functions deploy embed-text`.
- **Billing**: create Products/Prices for Pro and Enterprise in your Stripe dashboard, then
  ```
  supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_PRICE_PRO=price_... STRIPE_PRICE_ENTERPRISE=price_... SITE_URL=https://your-domain
  supabase functions deploy stripe-checkout stripe-portal stripe-webhook
  ```
  then register `https://<project-ref>.supabase.co/functions/v1/stripe-webhook` as a webhook
  endpoint in the Stripe dashboard and `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`
  with the signing secret Stripe gives you for it.

## Verifying against the MVP acceptance criteria

The spec's own acceptance test: register → pick Entrepreneur → create a project called
"Coconut Shell Ghana" → Resource Explorer → "coconut shell" / Ghana → run the analysis → get a
resource cascade and 5+ opportunities → open one → see its Opportunity Genome, scores,
assumptions and unknowns → generate a report. That whole path is wired end-to-end in this repo;
it just needs a live Supabase project and an Anthropic API key to actually run.
