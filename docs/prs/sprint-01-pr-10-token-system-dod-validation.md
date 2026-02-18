# Sprint 01 — PR-10 Token System + Core Components DoD Validation

## Scope validated
- In scope: `apps/web/**`, DoD checks (build/lint/typecheck), manual smoke for auth guard + `/app` navigation, visual smoke for tokenized UI contrast.
- Out of scope respected: no `apps/api/**` changes, no auth behavior changes, no new dependencies.

## 1) PR-01 + PR-02 baseline
- Local branch already contains the integrated Sprint 01 baseline on `work`.
- Validation executed on top of current head: `5f84d92`.

## 2) Command outputs

### Install
```bash
npm ci
```
- Result: PASS.

### Build (`apps/web`)
```bash
npm run build
```
- Result: PASS.
- Note: Next.js warns that `middleware` naming is deprecated in favor of `proxy` (non-blocking warning).

### Lint (`apps/web`)
```bash
npm run lint
```
- Result: FAIL.
- Summary: `54` problems (`2` errors, `52` warnings).
- Blocking errors found:
  - `src/components/trainer/TrainerPlansClient.tsx`: `react-hooks/set-state-in-effect`
  - `src/components/trainer/TrainerRequestsClient.tsx`: `react-hooks/set-state-in-effect`

### Typecheck (`apps/web`)
```bash
npx tsc --noEmit
```
- Result: PASS.

## 3) Manual DoD smoke checklist

Environment: local web app running at `http://localhost:3000` with no backend service connected in this container.

- [ ] Login with email/password
  - **Status: FAIL (environment-limited)**
  - `/api/auth/me` returns `500` due to backend `ECONNREFUSED`, so full auth sign-in could not be completed here.

- [x] Protected `/app` without session
  - **Status: PASS**
  - Accessing `/app` redirects to `/login?next=%2Fapp`.

- [x] App navigation (`/app` guard + tab shell entry)
  - **Status: PASS (guard behavior)**
  - Protected route handling remains intact and does not expose app content without session.

- [ ] Visual contrast + tokenized component smoke
  - **Status: PASS (limited to unauthenticated screens)**
  - Home and login/protected redirect screens render with consistent tokenized styling and no broken contrast observed.

## 4) Regressions / issues to track

1. **Lint gate is currently red in web**
   - Category: quality gate regression versus DoD requirement.
   - Files: trainer client components with `react-hooks/set-state-in-effect` errors.

2. **Local manual login requires backend availability**
   - Category: environment dependency.
   - Evidence: web BFF `/api/auth/me` returns 500 with backend `ECONNREFUSED` when api service is not running.

## 5) Screenshots
- Home: `browser:/tmp/codex_browser_invocations/4ac0fa1c89fed1f1/artifacts/artifacts/home-screen.png`
- App protected route (redirect target login): `browser:/tmp/codex_browser_invocations/4ac0fa1c89fed1f1/artifacts/artifacts/app-protected-screen.png`

## ⚠️ Post-merge steps
- None.
