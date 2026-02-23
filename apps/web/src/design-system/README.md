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

## Motion tokens and transition utilities

Use shared motion tokens for interactive states so components stay in the 150–200ms range.

### Available tokens

- `duration.hover` = `150ms`
- `duration.normal` = `200ms`
- `easing.standard` for most UI transitions
- `transition.color`, `transition.surface`, `transition.transform`, `transition.emphasis`

### Usage in DS components

```ts
import { createTransition, transition } from '@/design-system';

const buttonTransition = createTransition('color');
// => "color 150ms cubic-bezier(0.2, 0, 0, 1), ..."

const cardTransition = createTransition('surface', transition.surface.properties);
```

```tsx
// Example: inline style for a shared DS primitive
<div
  style={{
    transition: createTransition('surface'),
  }}
/>
```

If you need a new transition behavior, add it to `motion.ts` first and reference it semantically from DS components.

## Nutrition V2 building blocks

These components are prepared for Nutrition Calendar V2 flows and can be imported from `@/design-system`.

### `HeaderCompact`

```tsx
<HeaderCompact
  eyebrow="Nutrition"
  title="This week"
  subtitle="Plan and track meals"
  trailing={<button className="btn-secondary">Edit</button>}
/>
```

Props: `title`, `subtitle?`, `eyebrow?`, `leading?`, `trailing?`.

### `ObjectiveGrid`

```tsx
<ObjectiveGrid
  items={[
    { id: 'cal', title: 'Calories', value: '2,100', supportingText: 'target/day' },
    { id: 'pro', title: 'Protein', value: '130g' },
    { id: 'carb', title: 'Carbs', value: '220g' },
    { id: 'fat', title: 'Fat', value: '70g' },
  ]}
/>
```

Props: `items` (designed for 2x2 cards, renders max 4).

### `SegmentedControl`

```tsx
<SegmentedControl
  options={[
    { id: 'month', label: 'Mes' },
    { id: 'week', label: 'Semana' },
    { id: 'list', label: 'Lista' },
  ]}
  activeId={view}
  onChange={setView}
/>
```

Props: `options`, `activeId`, `onChange?`.

### `WeekGridCompact`

```tsx
<WeekGridCompact
  days={weekDays}
  onSelectDay={(dayId) => console.log(dayId)}
/>
```

Props: `days` (`label`, `date`, `isToday?`, `isSelected?`, `hasMeals?`), `onSelectDay?`.

### `MealCardCompact`

```tsx
<MealCardCompact
  title="Greek Yogurt Bowl"
  subtitle="Breakfast"
  kcal={420}
  chevron="›"
/>
```

Props: `title`, `subtitle?`, `kcal`, `image?`, `chevron?` + native button props.

### `Accordion`

```tsx
<Accordion title="Shopping list" subtitle="12 items" defaultOpen>
  <ul className="m-0 list-disc pl-4 text-sm text-text">
    <li>Chicken breast</li>
    <li>Brown rice</li>
  </ul>
</Accordion>
```

Props: `title`, `subtitle?`, `defaultOpen?`, `rightSlot?`, `children`.
