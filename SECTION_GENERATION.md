# Opportunity section generation

All seven sections use the existing DeepSeek swarm configuration: three independent specialists, a critic, then a validated integrator. AIOS_MODEL continues to override deepseek-chat. Mathematical scoring and scenario calculations are shared by the client and server.

Deploy the opportunity_section_generation migration first, then generate-opportunity-section with its deno.json import map and JWT verification enabled, then release the interface. No change to provider secrets or payment configuration is required.

Only active opportunity owners can generate or apply. Read access follows project access. Direct lifecycle writes are revoked. Generation reservation, snapshot and version creation are atomic; completion and usage accounting are atomic. Three-minute interrupted workers are failed/refunded before retry. Late worker completion cannot overwrite the retry. The batch ID deduplicates completed work, including a response lost in transit. Each completed section costs one run; downloads never reserve usage.

Generate All is browser-driven and stops at the first error or when the page unmounts. Returning restores its batch and skips successful sections. Drafts never overwrite existing content. Applying scalar sections detects intervening edits. Applying collection sections appends unmatched proposals and leaves all existing records intact. Immutable rich analysis is retained even when a newer version is applied. Same-title tasks/experiments are intentionally preserved instead of overwritten; users can adjust proposals using existing manual tools.

Verification commands:
- npm test
- npx tsc --noEmit
- npm run build
- npm --prefix tests/admin ci && npm --prefix tests/admin test
- deno check --config supabase/functions/generate-opportunity-section/deno.json --no-lock --node-modules-dir=none supabase/functions/generate-opportunity-section/index.ts

PDF/PPTX exports are built from saved content only. They include draft/version/date labels, missing-content notices, editable PowerPoint tables, scoring and scenario comparisons, and phased execution timelines. Native tables paginate by bounded cells and preserve continuation text.
