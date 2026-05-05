# Landing/Pricing QA Report (CORE-27)

- Timestamp: 2026-05-05T19:17:02.9354657+02:00
- Scope: landing home (`/`) and pricing (`/pricing`) UX, copy, and accessibility touchpoints.

## Checks executed

1. Code review of landing/pricing interactive controls and semantic structure.
2. Accessibility-focused updates verification (labels, focus states, section labeling).
3. Regression checks via web test/type/build gates.

## Device/responsive checkpoints

- Desktop (>= 1280px): **Pass (code-level verification)**
  - Hero/plan/final CTA controls remain keyboard-focusable and retain visible focus ring.
  - Pricing cards and CTA flow keep linear reading/tab order.
- Tablet (~768-1024px): **Pass (code-level verification)**
  - Existing responsive CSS remains unchanged for layout breakpoints; only focus/label updates applied.
- Mobile (<= 480px): **Pass (code-level verification)**
  - Final CTA email field keeps label via `aria-label`; submit control remains explicit text button.

> Note: No manual browser device lab run was executed in this task window. Fallback used: static code verification + full web test/build gates.

## Pass/fail list

- PASS: Added accessible labeling for final CTA email input (`aria-label`, `autocomplete`, `required`).
- PASS: Added explicit focus-visible styles for landing buttons/links/inputs.
- PASS: Added semantic section labeling (`aria-labelledby`) for hero, pricing, and final CTA sections.
- PASS: Decorative pricing check icons marked as non-interactive (`aria-hidden`, `focusable=false`).
- PASS: Landing/pricing copy tightened in ES/EN/PT for hero, pricing subtitle, and final CTA action text.
- PASS: `npm run test` and `npm run build` in `apps/web`.
- PASS: `npm run typecheck` in `apps/web`.
- FAIL (pre-existing/global): `npm run lint` in `apps/web` reports repository-wide errors outside this scope.

## Risk notes

- Lint gate is currently red due to pre-existing non-scope issues in unrelated files; not addressed here per minimal-change constraint.
