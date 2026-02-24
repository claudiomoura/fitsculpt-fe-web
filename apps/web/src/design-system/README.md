# Design System Guardrails

This folder contains canonical design-system primitives and tokens.

## Required rules

1. **No inline styling drift in feature code**
   - Do not add ad-hoc `style={{ ... }}` for colors, spacing, or typography in screens/components.
   - Add or reuse design-system tokens, then consume them semantically.
2. **One primary CTA per block**
   - Each logical block/card/section should expose only one visual primary action.
   - Secondary/tertiary actions must use muted styles.
3. **Use only DS semantic tokens**
   - Use `semanticColors` tokens (including `bgPrimary`, `bgCard`, `borderSubtle`, `accentPrimary`, `accentSecondary`, `textPrimary`, `textSecondary`).
   - Avoid hardcoded color literals in component code.
4. **Spacing scale is fixed**
   - Allowed spacing tokens: **8, 16, 24, 32, 48**.
   - If another value is needed, propose DS update first; do not add random values.
5. **Typography styles must come from DS exports**
   - Use `typography.H1`, `typography.H2`, `typography.H3`, `typography.Body`, `typography.Small`, `typography.Caption`.
6. **States are mandatory**
   - Every user-facing flow should define: loading, empty, error, success/ready states.
7. **Mobile-first implementation**
   - Start from mobile layout and enhance progressively for larger breakpoints.

## Tokens snapshot

### Semantic colors (required)
- `bgPrimary`
- `bgCard`
- `borderSubtle`
- `accentPrimary`
- `accentSecondary`
- `textPrimary`
- `textSecondary`

### Spacing
- `8`, `16`, `24`, `32`, `48`

### Typography
- `H1`, `H2`, `H3`, `Body`, `Small`, `Caption`

## Quick check

Run from `apps/web`:

```bash
npm run lint
npm run typecheck
npm run build
```
