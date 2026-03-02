# Beta Ready — 10-minute validation checklist

## 0) Prep (60s)
1. Open the PR in GitHub and keep **Checks** tab open.
2. Confirm these checks exist and are running on the latest commit:
   - `Web gates (build + typecheck + tests)`
   - `API gates (build + typecheck + tests)`
   - `E2E smoke (core-loop + token-lifecycle optional)`
   - `E2E gym-flow stability (5x)`
   - `E2E gym nutrition stability (3x)`

## 1) Reset demo state (60s)
Run from repo root:

```bash
curl -sS -X POST "http://127.0.0.1:4000/dev/reset-demo?tokenState=empty"
```

Expected: JSON with `"ok": true`.

Fallback if endpoint is unavailable:

```bash
npm --prefix apps/api run demo:reset
npm run seed:demo
```

## 2) Web + API gates green (2 min)
In GitHub Checks:
1. Open `Web gates (build + typecheck + tests)` and verify all steps pass.
2. Open `API gates (build + typecheck + tests)` and verify all steps pass.
3. Mark pass only if both jobs are green on the same commit SHA.

Local fallback (if CI is delayed):

```bash
npm run release:check
```

## 3) E2E core loop green (2 min)
In GitHub Checks:
1. Open `E2E smoke (core-loop + token-lifecycle optional)`.
2. Verify `core-loop.spec.ts` passed.
3. Mark pass only if job is green.

Local fallback:

```bash
cd apps/web && npm run e2e:smoke:core
```

## 4) E2E gym-flow stability green (2 min)
In GitHub Checks:
1. Open `E2E gym-flow stability (5x)`.
2. Confirm all 5 runs completed with no failures.

Local fallback:

```bash
cd apps/web && for i in 1 2 3 4 5; do echo "gym-flow run $i/5"; npm run e2e -- e2e/gym-flow.spec.ts --reporter=line || break; done
```

## 5) E2E gym-nutrition-flow stability green (new) (2 min)
In GitHub Checks:
1. Open `E2E gym nutrition stability (3x)`.
2. Confirm all 3 runs completed with no failures.

Local fallback:

```bash
cd apps/web && for i in 1 2 3; do echo "gym-nutrition-flow run $i/3"; npm run e2e -- e2e/gym-nutrition-flow.spec.ts --reporter=line || break; done
```

## 6) Verify user is Pro vs Free (60s)
Use the same authenticated session cookie in both calls:

```bash
curl -sS "http://127.0.0.1:4000/auth/me" -H "Cookie: fs_token=<SESSION_COOKIE>"
curl -sS "http://127.0.0.1:4000/billing/status" -H "Cookie: fs_token=<SESSION_COOKIE>"
```

Pass criteria:
- **Pro user:** `plan` is `"PRO"` (or paid modular plan) and `isPro: true` in `/billing/status`.
- **Free user:** `plan: "FREE"` and `isPro: false` in `/billing/status`.

## 7) Verify member assigned training plan + nutrition plan (60s)
Run as the member session:

```bash
curl -sS "http://127.0.0.1:4000/members/me/assigned-training-plan" -H "Cookie: fs_token=<SESSION_COOKIE>"
curl -sS "http://127.0.0.1:4000/members/me/assigned-nutrition-plan" -H "Cookie: fs_token=<SESSION_COOKIE>"
```

Pass criteria:
- `assignedPlan` is non-null in both responses.
- Each `assignedPlan.id` is present.

## 8) Logs/artifacts when something fails
1. In GitHub Actions job summary, open uploaded artifacts:
   - Web/API gates: `web-quality-gate-logs`, `api-quality-gate-logs`
   - E2E core loop: `e2e-smoke-logs-and-report`
   - E2E gym-flow: `e2e-gym-flow-stability-artifacts`
   - E2E gym-nutrition-flow: `e2e-gym-nutrition-stability-artifacts`
2. Local E2E debugging paths:
   - `apps/web/playwright-report`
   - `apps/web/test-results`
   - `/tmp/web-dev.log`
   - `/tmp/api-dev.log`
3. Open a Playwright trace locally:

```bash
cd apps/web && npx playwright show-trace test-results/<test-folder>/trace.zip
```

---

## Done / Not done rule
Only mark **Beta Ready = YES** when steps 1–7 all pass on the same commit.
