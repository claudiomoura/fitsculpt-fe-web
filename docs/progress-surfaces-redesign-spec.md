# Progress Surfaces Redesign Spec

## Purpose

Define the implementation-ready structural redesign for:

- `/app/seguimiento`
- `/app/seguimiento/body-scan-report`
- `/app/weekly-review`

This is a planning artifact only. It freezes ownership, information architecture, section hierarchy, and rollout order before UI coding starts.

## Executive Intent

- `/app/seguimiento` becomes the daily progress hub.
- `/app/seguimiento/body-scan-report` becomes the diagnostic report.
- `/app/weekly-review` becomes the weekly decision surface.

The core problem today is not missing capability. It is mixed ownership. The same concepts appear in multiple places with unclear depth, unclear CTAs, and weak handoff between daily logging, diagnostic interpretation, and weekly decision-making.

## Product Rules

1. A surface must own one primary job.
2. Primary CTAs must match the owned job.
3. Secondary analysis can exist, but only as support for the primary job.
4. Weekly plan changes can only be accepted or rejected in `/app/weekly-review`.
5. Daily capture belongs in focused flows, not in the main progress hub.
6. Diagnostic detail belongs in the report, not in the daily hub.
7. Mobile scanning order must always prioritize: context, decision, then drill-down.

## Cross-Screen Ownership Rules

| Surface | Owns | Must not own | Outbound handoff |
| --- | --- | --- | --- |
| `/app/seguimiento` | daily progress status, capture completion, short trend snapshot, navigation to deeper actions | full diagnostic methodology, weekly recommendation acceptance, long forms inline | check-in flow, body scan report, weekly review |
| `/app/seguimiento/body-scan-report` | body composition interpretation, confidence, scan quality, result explanation, body-scan-specific next step | weekly plan acceptance, general daily logging, broad progress dashboard duties | check-in flow, billing if locked, weekly review if report implies a weekly change |
| `/app/weekly-review` | weekly summary, weekly coach check-in prerequisite, recommendation rationale, diff, accept/reject decision | daily logging hub responsibilities, diagnostic deep dive, capture workflows except prerequisite completion links | training/nutrition destination after decision, seguimiento for daily loop |

## Shared UX Principles

- Mobile-first single-column reading order is the default.
- Every screen gets one clear primary CTA zone above the fold.
- Supporting detail uses disclosure, not parallel full cards.
- Empty and low-data states must explain what data is missing and where to get it.
- Surfaces should hand off to each other with explicit why-language, not generic links.

## Target Surface 1: `/app/seguimiento`

### Job To Be Done

Help the user understand daily progress status in under 30 seconds and route them to the right next action.

### Primary User Questions

- Am I on track this week?
- What should I do next today?
- Do I need a check-in?
- Is there a weekly review waiting for me?

### Screen Structure

#### Section order

1. Daily progress hero
2. Action queue
3. This week snapshot
4. Compact insight switcher
5. Body scan preview
6. Weekly review handoff
7. Advanced analysis drawer

#### Wireframe in text

1. `Daily Progress Hero`
   - Eyebrow: `Progreso diario`
   - Headline: status sentence tied to current week
   - Support line: one-line interpretation of progress state
   - Data owned:
     - latest check-in date
     - current weekly completion state
     - combined adherence summary
     - if weekly review is ready / not ready
   - Primary CTA: `Hacer check-in` or `Continuar semana` depending on completion state
   - Secondary CTA: `Ver revision semanal` only when review is actually ready

2. `Action Queue`
   - Card group with max 3 items
   - Card names:
     - `Check-in de esta semana`
     - `Reporte corporal`
     - `Revision semanal`
   - Data owned:
     - completion status per action
     - due / ready / locked state
     - one-line why text
   - CTA hierarchy:
     - primary action card first
     - ready-but-secondary second
     - locked or future card last

3. `This Week Snapshot`
   - Compact KPI row
   - Card names:
     - `Peso actual`
     - `Cambio semanal`
     - `Nutricion registrada`
     - `Sesiones completadas`
   - Data owned:
     - latest weight
     - selected-range delta
     - logged nutrition days
     - training sessions and minutes
   - No chart first on mobile; values first, chart entry second

4. `Compact Insight Switcher`
   - Tabs remain, but as compact summaries only: `Check-in`, `Nutricion`, `Entreno`
   - Each tab owns:
     - one small chart
     - 2-3 support facts
     - one insight sentence
   - This section is for scanning, not deep analysis

5. `Body Scan Preview`
   - Card names:
     - `Resumen corporal`
     - `Siguiente mejor paso`
   - Data owned:
     - latest body-scan estimate summary
     - confidence badge
     - top next action from diagnostic layer
   - Primary CTA: `Ver reporte corporal`
   - Secondary CTA: `Actualizar fotos`
   - Must not show full methodology, full recommendation list, or full AI run controls inline

6. `Weekly Review Handoff`
   - Card name: `Decision semanal`
   - Data owned:
     - weekly review readiness
     - concise reason why user should open it
     - pending recommendation count or accepted state
   - Primary CTA: `Abrir revision semanal`
   - Hidden entirely if weekly review is not yet meaningful

7. `Advanced Analysis`
   - One collapsed drawer, not several equal-priority blocks
   - Contains links or collapsed modules for:
     - professional insights
     - passive health detail
     - model detail previews
   - This is a support layer only

### What is removed / collapsed / moved

- Remove full check-in form from the daily hub.
- Remove full diagnostic report content from the daily hub.
- Collapse passive health, professional insights, and model detail into one advanced area.
- Move recommendation acceptance responsibility entirely out of this screen.
- Move body scan AI execution detail to the report surface.

### CTA hierarchy

1. `Hacer check-in` when weekly check-in is missing.
2. `Abrir revision semanal` when the week is decision-ready.
3. `Ver reporte corporal` when diagnostic detail is relevant.
4. All other actions become secondary or collapsed.

### Mobile-first behavior

- Hero and action queue must fit above the first major fold.
- KPI cards render as 2-up compact grid.
- Charts come after summary numbers.
- Advanced analysis stays collapsed by default.
- Sticky bottom CTA is allowed only for the single highest-priority action.

## Target Surface 2: `/app/seguimiento/body-scan-report`

### Job To Be Done

Explain the user's latest body scan result, how trustworthy it is, and what next body-scan-specific action to take.

### Primary User Questions

- What did the scan say?
- How confident is it?
- What inputs drove it?
- What should I do next to improve confidence or usefulness?

### Screen Structure

#### Section order

1. Diagnostic summary hero
2. Confidence and input quality
3. Composition breakdown
4. What changed / what to watch
5. Recommended next step
6. AI scan controls or locked state
7. Methodology and limitations

#### Wireframe in text

1. `Diagnostic Summary Hero`
   - Eyebrow: `Reporte corporal`
   - Headline: latest estimate summary
   - Support line: plain-language interpretation
   - Data owned:
     - point estimate
     - estimated range
     - latest scan date / latest qualifying input date
   - Primary CTA: `Actualizar scan`
   - Secondary CTA: `Volver a progreso`

2. `Confidence and Input Quality`
   - Card names:
     - `Confianza del resultado`
     - `Calidad de inputs`
   - Data owned:
     - confidence level and score
     - source list
     - missing inputs / next-best inputs
   - This is diagnostic context, not upsell copy

3. `Composition Breakdown`
   - Card names:
     - `Grasa estimada`
     - `Masa magra`
     - `Masa grasa`
   - Data owned:
     - body fat percent
     - range
     - lean mass
     - fat mass

4. `What Changed / What To Watch`
   - Card name: `Lectura rapida`
   - Data owned:
     - top 2 observations
     - any comparability warning
     - plain-language note on trend quality

5. `Recommended Next Step`
   - Card name: `Siguiente mejor paso`
   - Data owned:
     - top recommendation summary
     - whether next action is capture, training, nutrition, or weekly review
   - Primary CTA changes by action target:
     - `Actualizar fotos`
     - `Ir a entrenamiento`
     - `Ir a nutricion`
     - `Abrir revision semanal`

6. `AI Scan Controls`
   - States:
     - ready
     - loading
     - insufficient data
     - locked by Pro
     - token blocked
     - failed with retry
   - Data owned:
     - token status
     - execution result
     - next actions from result
   - This is the only place where detailed AI scan execution controls should live

7. `Methodology and Limits`
   - Disclosure block
   - Data owned:
     - accuracy note
     - sources used
     - disclaimers
     - limitations
   - Default collapsed on mobile

### What is removed / collapsed / moved

- Remove broad plan detail as a peer to the diagnostic result.
- Remove generic tracking overview responsibilities.
- Collapse methodology, rationale, and model detail under a single explainability section.
- Move weekly recommendation acceptance to `/app/weekly-review`.

### CTA hierarchy

1. `Actualizar scan` or `Actualizar fotos`
2. one context-driven next action
3. billing CTA only when locked or token-blocked
4. `Volver a progreso` as tertiary navigation

### Mobile-first behavior

- Hero result and confidence must appear before any disclosure.
- Locked and insufficient-data states must still show one clear next action.
- Methodology remains collapsed.
- Avoid side-by-side dense cards until tablet width.

## Target Surface 3: `/app/weekly-review`

### Job To Be Done

Help the user make one weekly decision with enough context, not browse a dashboard.

### Primary User Questions

- How did my week go?
- What change is being recommended?
- Why is it recommended?
- Should I accept it or keep the current plan?

### Screen Structure

#### Section order

1. Weekly decision hero
2. Decision readiness / prerequisite block
3. Weekly summary snapshot
4. Primary recommendation card
5. Plan diff and impact
6. Supporting evidence
7. Secondary experiments / projection

#### Wireframe in text

1. `Weekly Decision Hero`
   - Eyebrow: `Revision semanal`
   - Headline: one sentence about this week's decision state
   - Support line: week range plus whether action is needed
   - Data owned:
     - week key and dates
     - whether decision is pending, blocked, or already accepted
   - Primary CTA:
     - `Completar check-in semanal` if prerequisite missing
     - `Revisar recomendacion` if ready
     - `Ver plan actualizado` if already accepted

2. `Decision Readiness`
   - Card names:
     - `Check-in semanal`
     - `Estado del loop`
   - Data owned:
     - weekly coach state
     - draft/submitted state
     - missing required fields
     - deadline
   - Weekly coach check-in form should appear inline only when it is the current blocker.
   - Once submitted, collapse the form into a completed summary state.

3. `Weekly Summary Snapshot`
   - Card names:
     - `Adherencia de entreno`
     - `Dias con nutricion`
     - `Cambio de peso`
     - `Cambio de cintura`
     - `Actividad pasiva`
     - `Energia media`
   - Data owned:
     - existing weekly summary payload only
   - This is summary context, not the main event

4. `Primary Recommendation`
   - One recommendation card only above the fold
   - Card name: `Recomendacion de la semana`
   - Data owned:
     - recommendation type
     - title
     - plain-language recommendation
     - one-paragraph why
     - safety notes summary
   - Primary CTA: `Aceptar cambio`
   - Secondary CTA: `Mantener plan actual`

5. `Plan Diff and Impact`
   - Card names:
     - `Que cambia`
     - `Impacto esperado`
   - Data owned:
     - recommendation metrics
     - structured diff summary
     - expected tradeoff / confidence statement
   - This replaces forcing users to infer the change from multiple cards

6. `Supporting Evidence`
   - Disclosure stack
   - Sections:
     - `Por que el sistema recomienda esto`
     - `Notas de seguridad`
     - `Razonamiento completo`
   - Same data as today, but explicitly subordinate to the decision

7. `Projection and Experiment Layer`
   - `Future projection` and `RCT comparison` move below the main decision block
   - These are supporting evidence, not the top hero
   - Show only after recommendation context

### What is removed / collapsed / moved

- Remove multiple equal-priority top cards before the actual decision.
- Move future projection below the primary recommendation.
- Move generic weekly coach scaffolding language out of the hero.
- Collapse already-submitted check-in into a summary state.
- Keep accept/reject controls only on the main recommendation card.

### CTA hierarchy

1. `Completar check-in semanal` when blocked.
2. `Aceptar cambio` when decision-ready.
3. `Mantener plan actual` as the only competing decision CTA.
4. Projection and experiment CTAs become tertiary.

### Mobile-first behavior

- Show one recommendation first, not a list of cards competing for focus.
- If more than one recommendation exists, show the highest-priority one and collapse the others under `Otras sugerencias`.
- Check-in form fields should be chunked by section on mobile, not as one long dense grid.
- Accept/reject CTAs remain sticky only while the primary recommendation is in view.

## Data Ownership Map

| Data / concept | Canonical surface |
| --- | --- |
| daily next action | `/app/seguimiento` |
| weekly completion state | `/app/seguimiento` and `/app/weekly-review` summary, but decision acts only in weekly review |
| check-in capture flow | `/app/seguimiento/check-in` |
| body composition explanation | `/app/seguimiento/body-scan-report` |
| scan confidence and methodology | `/app/seguimiento/body-scan-report` |
| recommendation acceptance / rejection | `/app/weekly-review` only |
| future projection | `/app/weekly-review` as supporting evidence |
| advanced tracking drill-down | `/app/seguimiento` collapsed support layer |

## Navigation and Handoff Rules

- `/app/hoy` should continue to link into `/app/seguimiento/check-in` and `/app/seguimiento/body-scan-report` when those are the next actions.
- `/app/seguimiento` should only link to `/app/weekly-review` when the week is sufficiently complete.
- `/app/seguimiento/body-scan-report` should link to `/app/weekly-review` only when the body-scan result is relevant to a weekly decision.
- `/app/weekly-review` should never force the user back through `/app/seguimiento` to accept or reject a recommendation.

## States To Design Explicitly

### `/app/seguimiento`

- no check-ins yet
- weekly check-in overdue
- review not ready yet
- review ready
- body scan locked
- low-data trend state

### `/app/seguimiento/body-scan-report`

- no qualifying inputs
- low confidence
- ready result
- Pro locked
- token blocked
- AI execution failed

### `/app/weekly-review`

- weekly check-in missing
- check-in draft in progress
- recommendation ready
- recommendation already accepted
- low-confidence recommendation
- no recommendation available

## Implementation Notes

- Prefer reusing existing data payloads first.
- Restructure screen order and conditional logic before adding new capabilities.
- Do not introduce new recommendation acceptance paths outside `/app/weekly-review`.
- Keep body-scan intelligence reusable, but remove its ownership ambiguity at the page level.
- The redesign is successful only if the top of each screen communicates one obvious job.

## Phased Rollout Plan

### Phase 0: Contract and copy freeze

- Freeze ownership model in docs.
- Freeze top-level card names and CTA labels.
- Confirm gating rules for when weekly review is considered ready.

### Phase 1: Structural screen rewrite with existing data

- Reorder sections on all three screens.
- Remove inline overload from `/app/seguimiento`.
- Move weekly-review evidence below the decision.
- Move detailed body-scan execution and methodology fully into the report.

### Phase 2: State hardening

- Add stronger readiness conditions for weekly-review handoff.
- Add explicit blocked, low-data, and already-completed states.
- Make mobile sticky CTA logic match the highest-priority action only.

### Phase 3: Diff and decision clarity

- Add clearer weekly plan diff presentation.
- Improve recommendation impact summary.
- Limit multi-recommendation complexity by prioritizing one primary recommendation.

### Phase 4: Analytics and QA

- Track open, CTA click, blocked state, accept/reject, and handoff completion events.
- Add QA matrix for each state per screen.
- Validate that cross-screen ownership remains coherent after follow-on polish.

## Suggested Ticket Breakdown

1. Redesign `/app/seguimiento` into a daily progress hub.
2. Redesign `/app/seguimiento/body-scan-report` into a diagnostic report.
3. Redesign `/app/weekly-review` into a weekly decision surface.
4. Add readiness logic and analytics for cross-screen handoffs.

## Done Looks Like

- A user can tell within seconds what each screen is for.
- `/app/seguimiento` routes action without trying to do everything.
- `/app/seguimiento/body-scan-report` feels diagnostic, not dashboard-like.
- `/app/weekly-review` feels like a decision flow, not a mixed insight page.
- The accept/reject decision exists in one place only.
