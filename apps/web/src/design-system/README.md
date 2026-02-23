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
