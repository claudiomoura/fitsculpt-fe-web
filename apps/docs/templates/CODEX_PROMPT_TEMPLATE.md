# PR EXECUTION – FitSculpt

## CONTEXT
You are working on the FitSculpt monorepo.

- Repo structure:
  - apps/web → frontend (Next.js, App Router) ✅
  - apps/api → backend ❌ DO NOT TOUCH

- Current sprint is defined in:
  docs/sprints/SPRINT_XX.md

- Global project constraints are defined in:
  docs/PROJECT_STATUS.md

You MUST respect all constraints described there.

---

## OBJECTIVE (WHAT TO IMPLEMENT)

[Describe clearly and narrowly what this PR does.
One responsibility only.
Example: “Create reusable base UI components for Exercise Library (no routes, no data logic)”]

---

## SCOPE (WHAT IS IN / OUT)

### IN SCOPE
- Frontend only
- apps/web/**
- UI components only
- No routing changes
- No backend calls added or modified

### OUT OF SCOPE (ABSOLUTE)
- apps/api/**
- auth, fs_token, OAuth, cookies, middleware
- API contracts or shapes
- Creating new endpoints
- Inventing data that does not come from backend

---

## FILES / PATHS

### Allowed paths
[List exact folders/files Codex is allowed to touch]

Example:
- apps/web/src/components/exercise-library/**

### Forbidden paths
- apps/web/src/lib/auth.ts
- apps/web/src/lib/backend*.ts
- apps/web/src/lib/calendar.ts
- apps/api/**

---

## TECHNICAL RULES (NON-NEGOTIABLE)

- Do NOT invent data fields
- If data is missing, UI must hide the section or show a neutral placeholder
- NO hardcoded user-facing strings
  - All text must be passed via props or i18n keys
- Do NOT add new dependencies
- Use existing design system components when possible:
  Button, Card, Badge, Skeleton, Modal, Toast
- Mobile-first, accessible, dark-mode compatible

---

## TASKS (STEP BY STEP)

[List explicit tasks in order.
Be concrete.]

Example:
1. Create MediaPlaceholder component
2. Create ExerciseCard component
3. Create SkeletonExerciseList component
4. Create EmptyState and ErrorState components
5. Export all components from index.ts

---

## OUTPUT REQUIREMENTS

- Create a new branch
- Open a PR against main
- PR description MUST include:
  - Summary of changes (bullet points)
  - List of files created/modified
  - Manual test checklist (if applicable)

DO NOT update project documentation unless explicitly instructed.

---

## Project Status impact
Analyze PROJECT_STATUS.md and respond using this format:

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