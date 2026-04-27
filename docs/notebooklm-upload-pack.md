# NotebookLM Upload Pack

Use this pack to populate the first 3 FitSculpt NotebookLM notebooks without guessing.

Rules for the first pass:
- Upload only the files listed below.
- Upload in the order shown.
- Prefer `.md` files first; skip code, `.json`, `.sql`, ZIPs, and audit dumps for now.
- Keep each notebook focused on one job.

## Notebook 1: FitSculpt - Strategy & Vision

Purpose: founder thinking, positioning, roadmap, and market context.

Upload order:
1. `docs/BIBLE/PRODUCT_VISION.md`
2. `docs/COMPANY/FITSCULPT_3_YEAR_STRATEGIC_BLUEPRINT.md`
3. `docs/BIBLE/12_MONTH_STRATEGIC_PLAN.md`
4. `docs/BIBLE/GO_TO_MARKET_STRATEGY.md`
5. `docs/BIBLE/COMPETITIVE_ANALYSIS.md`

Best weekly prompts:
- `What changed this week that affects FitSculpt strategy, positioning, or roadmap?`
- `Based on these docs, what should the founder protect from scope creep right now?`
- `What are the top 3 strategic risks or blind spots in the current plan?`
- `Summarize FitSculpt in one founder update: vision, current phase, and next milestone.`

## Notebook 2: FitSculpt - Beta Product & UX

Purpose: beta scope, user experience, flows, screens, and product-quality decisions.

Upload order:
1. `docs/beta-scope.md`
2. `docs/UI-UX/README.md`
3. `docs/UI-UX/01_WOW_Definition.md`
4. `docs/UI-UX/02_IA_Navigation.md`
5. `docs/UI-UX/03_User_Flows.md`
6. `docs/UI-UX/04_Screen_Specs.md`
7. `docs/UI-UX/07_Subscription_Gating.md`
8. `docs/UI-UX/08_Analytics_Measurement.md`
9. `docs/UI-UX/11_Acceptance_Checklists.md`

Best weekly prompts:
- `What parts of the beta UX are still unclear, incomplete, or likely to confuse users?`
- `Summarize the current core loop from onboarding to daily use in plain founder language.`
- `What product work should be prioritized next if the goal is usefulness, clarity, and completeness?`
- `Which screens or flows appear over-scoped for the current beta?`

## Notebook 3: FitSculpt - Engineering, Contracts & Ops

Purpose: architecture, API contracts, operating rules, and execution discipline.

Upload order:
1. `docs/ARCHITECTURE_OVERVIEW.md`
2. `docs/contracts/README.md`
3. `docs/contracts/CONTRACTS_RC_V1.md`
4. `docs/contracts/BETA11_CRITICAL_ENDPOINTS.md`
5. `docs/contracts/bff-error-shape.md`
6. `docs/workflow.md`
7. `docs/weekly-review.md`
8. `docs/decision-log.md`
9. `docs/DEFINITION_OF_DONE.md`

Best weekly prompts:
- `What are the current non-negotiable technical rules or fragile areas the founder should remember?`
- `Summarize the critical frontend-backend contracts in plain English.`
- `Based on workflow, weekly review, decision log, and DoD, what operating gaps should be fixed this week?`
- `If we ship next week, what technical or process risks look most likely?`

## Manual Upload Steps In NotebookLM

For each notebook:
1. Open NotebookLM.
2. Open the target notebook.
3. Click `Add source`.
4. Choose `Upload from device`.
5. Select the files for that notebook from this repo.
6. Upload them in the listed order.
7. Wait until NotebookLM finishes indexing before asking questions.

Recommended founder flow:
1. Finish Notebook 1 first.
2. Then upload Notebook 2.
3. Then upload Notebook 3.
4. After each notebook is ready, paste one of the weekly prompts above to confirm the notebook understands the material.

## Optional Local Folder Structure

Only if it makes manual upload easier, create three local folders and copy the files into them before uploading:
- `NotebookLM/01-strategy-and-vision`
- `NotebookLM/02-beta-product-and-ux`
- `NotebookLM/03-engineering-contracts-and-ops`

This is optional. The founder can also upload directly from the repo paths listed above.

## What Not To Upload In The First Pass

Skip these for now unless a notebook later needs deeper detail:
- `docs/audits/**`
- `docs/templates/**`
- `openspec/**`
- code files under `apps/**`
- `.json`, `.sql`, `.zip`, and generated artifacts

The goal of this first pass is fast founder usability, not full repo ingestion.
