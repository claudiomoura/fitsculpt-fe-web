# Smoke Beta Reproducibility Pack

## Goal

Run the same beta smoke path locally and in CI with explicit prerequisites and repeatable commands.

## Required stack

- API on `http://localhost:4000`
- Web on `http://localhost:3000`
- Seeded demo credentials already documented in CI/workflows
- Chromium installed through Playwright

## Commands

```bash
npm --prefix apps/api run db:bootstrap
npm --prefix apps/web run e2e:smoke:beta
```

## Repro pack contents

- `apps/web/scripts/run-beta-smoke.mjs` - canonical smoke entrypoint
- `.github/workflows/ci.yml` - CI execution contract
- `.github/workflows/e2e-smoke.yml` - manual soak workflow
- `docs/beta-ready.md` - functional beta gates
- `docs/release-gates.md` - release gate expectations

## Expected coverage

- core loop user flow (`e2e/core-loop.spec.ts`)
- nutrition + check-in core flow (`e2e/nutrition-checkin-core.spec.ts`)
- optional token lifecycle smoke when `E2E_INCLUDE_TOKEN_LIFECYCLE=1`

## Known gap kept explicit

- Gym trainer nutrition smoke remains outside the default pack until seed/runtime parity is fully reliable.
