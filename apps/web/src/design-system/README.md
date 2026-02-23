# Design System Guardrails

This folder is the **safe zone** for design-system primitives and layout helpers.

## Contribution rules (new code)

1. **Use semantic tokens, not raw colors in components**
   - ✅ Good: `var(--color-primary)`, `bg-primary`, `text-text`
   - ❌ Avoid: direct `#00F5C3` / `#fff` in component code
2. **Use spacing scale, not random padding/margin values**
   - ✅ Good: Tailwind scale classes (`p-2`, `p-4`, `gap-6`) or shared DS vars
   - ❌ Avoid: arbitrary values like `p-[13px]`, `style={{ padding: 11 }}`
3. **Prefer DS layout primitives for page structure**
   - Use `PageContainer` for top-level app page spacing constraints.
   - Use `Stack` for vertical rhythm between sections.

> If a new token/spacing value is needed, add it to the token layer first and then consume it semantically.

## Usage examples

```tsx
// Page-level layout
<PageContainer>
  <Stack gap="6">
    <PageHeader title="Dashboard" />
    <Card>...</Card>
  </Stack>
</PageContainer>
```

```tsx
// Good: semantic token in CSS variable
<div style={{ borderColor: "var(--color-border)" }} />

// Avoid: hardcoded color and random spacing
<div style={{ borderColor: "#e2e8f0", padding: 13 }} />
```

## Lightweight guardrail script

Run from `apps/web`:

```bash
npm run lint:ds
```

Current scope is intentionally narrow to avoid false positives:
- Scans only `src/design-system/`
- Checks for:
  - hex color literals
  - arbitrary Tailwind spacing (`p-[...]`, `m-[...]`)
  - inline random padding/margin values in style objects

This script is **opt-in** and not required by default lint CI unless explicitly wired.

## Global state blocks

Use these reusable blocks for loading, empty, and error experiences in pages:


```tsx
// Global state blocks
<LoadingBlock title="Loading profile" description="Fetching latest data..." />

<EmptyBlock
  title="No workouts yet"
  description="Create your first workout to get started."
  action={<button className="btn-primary">Create workout</button>}
/>

<ErrorBlock
  title="Something went wrong"
  description="Please try again in a moment."
  retryAction={<button className="btn-secondary">Retry</button>}
/>
```

## Professional Mode semantic tokens (Admin/Trainer)

A semantic variant is available for professional experiences (for example admin and trainer layouts) without changing the default app shell.

### What was added

- `professionalSemanticColors` and `semanticColorVariants` in `tokens.ts`.
- `professionalElevation` and `elevationVariants` in `elevation.ts`.
- Helpers:
  - `getSemanticColors(variant)`
  - `getElevation(variant)`

### Activation (layout-level)

Keep default user app screens untouched. Activate professional mode only at admin/trainer layout boundaries:

```ts
import { getSemanticColors, getElevation } from '@/design-system';

const proColors = getSemanticColors('professional');
const proElevation = getElevation('professional');
```

Then map these to CSS variables or style context in the professional layout provider. If no variant is provided, `default` is used and existing tokens remain unchanged.

### When to use Professional Mode

- ✅ Admin backoffice and trainer dashboards
- ✅ Internal operations UIs where denser/stronger hierarchy is needed
- ❌ End-user shell by default (unless explicitly migrated in another PR)

## Density calibration (PR-02)

This PR introduces a subtle density calibration to improve breathing room without changing layouts aggressively.

- Spacing scale increased softly on step `3+` (roughly 5–20% depending on token).
- Typography line-heights were relaxed slightly for better readability, especially on mobile.
- Elevation shadows now follow a more consistent progression (offset/blur/alpha) across variants.

### Density guidance

Use `densityScale` as the source-of-truth when introducing context-specific density options (for example, compact tables vs. default app pages):

```ts
import { densityScale, spacing } from '@/design-system';

const relaxedGap = spacing[6] * densityScale.relaxed;
```

Default app screens should continue to use the base tokens directly unless a page explicitly needs a compact/relaxed mode.

