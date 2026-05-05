# Landing/Pricing Release Sign-off (CORE-28)

- Timestamp: 2026-05-05T19:17:02.9354657+02:00
- Scope: CORE-25 to CORE-28 landing/pricing rollout gate.

## Gate outcomes

| Gate | Command | Outcome | Notes |
| --- | --- | --- | --- |
| Lint | `npm run lint` (apps/web) | FAIL | Repository-wide existing lint errors (outside landing/pricing scope) + warnings. |
| Typecheck | `npm run typecheck` (apps/web) | PASS | `tsc --noEmit` completed successfully. |
| Tests | `npm run test` (apps/web) | PASS | 108 files / 407 tests passed. |
| Build | `npm run build` (apps/web) | PASS | Next.js production build completed. |

## Release decision

- **Conditional sign-off** for landing/pricing scope.
- Functional + accessibility + copy updates in this scope are complete and validated by typecheck/test/build.
- Lint remains globally red due to pre-existing unrelated issues; rollout should proceed only if current release policy allows documented lint debt.

## Scope confirmation

- No unrelated refactors performed.
- Changes limited to landing/pricing UI copy/accessibility and release documentation artifacts.
