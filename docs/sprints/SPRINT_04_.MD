# PR EXECUTION – FitSculpt (Next Sprint / PR único)
## Sprint 02 — Exercise Library “Premium Detail + Media”

## CONTEXT
You are working on the FitSculpt monorepo.

- Repo structure:
  - apps/web → frontend (Next.js, App Router) ✅
  - apps/api → backend ❌ DO NOT TOUCH

You MUST respect global constraints:
- Frontend must call ONLY `/api/*` (never call backend directly)
- Do NOT touch auth / `fs_token` / OAuth / cookies / middleware
- Do NOT change API contracts/shapes or create endpoints
- Do NOT invent data fields. If data is missing: hide section or show a neutral placeholder
- NO hardcoded user-facing strings (use existing i18n system)
- Do NOT add new dependencies
- Use existing design system components where possible:
  Button, Card, Badge, Skeleton, Modal, Toast
- Mobile-first, accessible, dark-mode compatible
- Keep changes localized. Avoid refactors.

Branching:
- Create branch from `dev`
- Open PR targeting `dev`

References (read-only):
- docs/ARCHITECTURE_OVERVIEW.md
- docs/AI_RULES.md
- docs/DO_NOT_TOUCH.md
- docs/DEFINITION_OF_DONE.md
- docs/sprints/SPRINT_02.md (or the sprint doc for this work)

---

## OBJECTIVE (WHAT TO IMPLEMENT)
Deliver a premium mobile Exercise Detail experience for the Exercise Library with:

1) Full-screen media viewer (GIF/video) **only when real media exists**
2) Completed “advanced detail layout” with clear sections (technique/cues/muscles/media) **only when data exists**
3) Final polish of loading/empty/error + skeleton consistency for Library list and Exercise detail

NO backend changes. NO auth changes. NO API contract changes.

---

## SCOPE (WHAT IS IN / OUT)

### IN SCOPE
- Frontend-only changes inside apps/web
- Exercise Library list + Exercise Detail UI improvements
- Full-screen Media Viewer component and integration in detail
- Conditional rendering (show only real-data sections)
- Polish states and skeletons (reduce layout jumps)
- i18n for any new strings + basic a11y + dark mode fixes

### OUT OF SCOPE (ABSOLUTE)
- apps/api/**
- Any Next.js route handlers under `/api/*` (BFF): apps/web/**/app/api/** or apps/web/**/pages/api/**
- auth, `fs_token`, OAuth, cookies, middleware
- Changing endpoints, payload shapes, response mapping contracts
- New dependencies
- Creating “fake” content to fill empty sections

---

## FILES / PATHS

### Allowed paths
Codex MUST first locate the real paths (may be under src/ or not). Only touch:
- apps/web/**/app/**                    (ONLY existing Library + Detail screens; do NOT create new route groups)
- apps/web/**/components/**             (UI components used by Library/Detail, incl. new MediaViewer)
- apps/web/**/lib/**                    (UI helpers/hooks client-only; MUST NOT touch auth/session utilities)
- apps/web/**/styles/**                 (ONLY if needed for dark-mode polish)
- apps/web/**/i18n/** or apps/web/**/locales/** (ONLY if these exist; locate actual folder)

### Forbidden paths
- apps/api/**
- apps/web/**/app/api/** or apps/web/**/pages/api/** (BFF route handlers)
- Any auth/session/cookies modules (Codex MUST identify them and keep untouched)
- middleware.* files
- Any backend client/cookie management modules

---

## TECHNICAL RULES (NON-NEGOTIABLE)
- Do NOT invent data fields
- If a section’s data is missing → section MUST NOT render
- If media missing → hide media block or show neutral placeholder (no fake content)
- Media viewer must not break usability if media fails (show neutral fallback, allow closing)
- No hardcoded visible strings (use existing i18n keys/strategy)
- No new dependencies
- Keep everything mobile-first, a11y basics (focus visible, aria labels), dark-mode correct

---

## TASKS (STEP BY STEP)
1. Locate:
   - Existing Exercise Library list screen
   - Existing Exercise Detail screen (page or modal) and how media is currently represented (if any)
   - Existing state/skeleton components (loading/empty/error) already used

2. Implement Media Viewer (full screen):
   - Create a reusable `MediaViewer` component (prefer using existing Modal if available)
   - Support GIF/video rendering using existing patterns (NO new deps)
   - Provide controls: close, optional “back” affordance, a11y labels
   - Ensure it opens only when real media exists and closes without losing context

3. Integrate Media Viewer into Exercise Detail:
   - Add a clear action (tap media / button) to open viewer
   - If media is missing: hide media section or show neutral placeholder
   - If media fails to load: show neutral fallback (do not block reading other sections)

4. Complete “advanced layout” for detail:
   - Ensure clear hierarchy: title + sections
   - Technique/cues/muscles/media render ONLY if data exists
   - No empty headings, no fake placeholders simulating backend data
   - Ensure mobile layout: no horizontal overflow, touch targets adequate

5. Final polish of states + skeletons (list + detail):
   - Ensure loading/empty/error states are coherent and consistent between list and detail
   - Skeletons should keep layout stable (reduce “layout jumps”)
   - Ensure error state offers a safe action (retry/back) WITHOUT touching routing/auth

6. i18n / a11y / dark-mode sweep:
   - Move any new text to i18n keys
   - Add aria-labels for icon-only controls (close, retry, etc.)
   - Verify dark-mode colors in detail + viewer + states/skeletons

---

## OUTPUT REQUIREMENTS
- Create a new branch from `dev`
- Open a PR against `dev`
- PR description MUST include:
  - Summary of changes (bullets)
  - List of files created/modified
  - Manual test checklist:
    - Library: list shows loading/empty/error correctly
    - Open Library → open 1 exercise detail (no console errors)
    - If exercise has media: open full-screen viewer, close returns to detail
    - If no media: media block hidden or neutral placeholder (no fake content)
    - If media fails: neutral fallback, detail remains usable
    - Dark-mode verified on list/detail/viewer
    - i18n: no new hardcoded strings

DO NOT update project documentation unless explicitly instructed.

---

## Project Status impact
Analyze docs/PROJECT_STATUS.md and respond using this format:

- Implemented in this PR:
  - [bullet points]

- Related items in PROJECT_STATUS.md:
  - [section name] → [implemented / partially implemented / unchanged]

- Recommendation:
  - [ ] No update needed
  - [ ] Suggest updating PROJECT_STATUS.md (explain why)

---

## START
Implement now.