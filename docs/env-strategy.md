# FitSculpt Env Strategy

## Goal

Remove ambiguity between repo-root tooling env files and app-specific runtime env files.

## Source Of Truth By Scope

| Scope | File(s) | Purpose |
| --- | --- | --- |
| Repo root tooling | `.env.local` at repo root | Only for scripts under `scripts/` such as Notion and Linear automation. |
| Web app local runtime | `apps/web/.env.local` | Next.js and local web tooling config. |
| API app local runtime | `apps/api/.env.local` | API runtime, Prisma helpers, and local backend scripts. |
| Templates in git | `.env.example`, `apps/web/.env.example`, `apps/api/.env.example`, `apps/api/.env.local.example` | Documentation-only templates with fake/example values. |
| Production / hosted | Vercel, Render, GitHub Actions secrets/variables | Real deployed values. Never mirror them back into git. |

## Rules

1. Repo-root `.env.local` is for repository automation only, not app runtime secrets.
2. `apps/web/.env.local` is the only local file developers should use for web runtime values.
3. `apps/api/.env.local` is the preferred local file for API runtime values.
4. `apps/api/.env` should be treated as optional legacy/base config only. Do not rely on it as the main local developer file.
5. Do not store real secrets in any `*.example` file.
6. Do not create backup env files such as `.env.backup` or `.env.neon.backup` inside the repo tree.

## What Each App Expects

### Repo root scripts

These scripts read repo-root env files:

- `scripts/setup-linear-core.mjs`
- `scripts/setup-notion-hq.mjs`
- `scripts/sync-notion-hq.mjs`

Expected location:

- `./.env.local`

Typical variables:

- `LINEAR_API_KEY`
- `NOTION_API_KEY`
- `NOTION_PARENT_PAGE_ID`

### Web (`apps/web`)

Primary local file:

- `apps/web/.env.local`

Typical variables:

- `BACKEND_URL`
- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_APP_ENV`
- `NEXT_PUBLIC_SUPPORT_URL`
- `NEXT_PUBLIC_SENTRY_DSN`
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `CAPACITOR_SERVER_URL`
- optional local E2E overrides such as `E2E_BACKEND_URL`

Notes:

- `NEXT_PUBLIC_API_BASE_URL` is old documentation drift and should not be used as the standard path.
- Keep `BACKEND_URL` and `NEXT_PUBLIC_BACKEND_URL` aligned when both are set.

### API (`apps/api`)

Primary local file:

- `apps/api/.env.local`

Supported by current loaders:

- `apps/api/.env`
- `apps/api/.env.local` with higher priority

Typical variables:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `COOKIE_SECRET`
- `CORS_ORIGIN`
- `APP_BASE_URL`
- provider secrets such as `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `RESEND_API_KEY`
- local safety toggles such as `ALLOW_SEED`, `ALLOW_DB_RESET`, `FORCE_SEED`

Notes:

- For local development, prefer `apps/api/.env.local` instead of `apps/api/.env`.
- For hosted environments, use Render / CI secret stores instead of checked-out files.

## Loading Strategy

### Repo root scripts

- Load only repo-root `.env` then repo-root `.env.local`
- Shell-exported vars still win
- Do not scan the caller's current working directory for extra env files

### Web

- Let Next.js handle `apps/web/.env.local` using its normal app-directory behavior
- Keep browser-safe values prefixed with `NEXT_PUBLIC_`
- Keep secret server-only web values unprefixed

### API

- Keep the current API behavior of loading `apps/api/.env` and then `apps/api/.env.local`
- Standardize team usage on `apps/api/.env.local` for local work so `.env` stops being the default habit

## Dangerous Findings

The following patterns need founder cleanup outside this documentation pass:

1. Secret-bearing env files exist under `apps/api/`, including `.env`, `.env.backup`, `.env.backup-neon`, and `.env.neon.backup`.
2. `apps/api/scripts/migrate-data.js` contains an inline Neon connection string fallback. That value should be removed and replaced with env-only loading.
3. `apps/api/.env.local.example` previously mixed local and production-style examples in one file, which encouraged drift.

## Founder Migration Plan

1. Keep repo-root `.env.local` only for Notion/Linear automation values.
2. Move any web runtime values out of repo-root env files into `apps/web/.env.local`.
3. Move any API runtime values that developers still keep in repo-root env files into `apps/api/.env.local`.
4. Stop creating or sharing `apps/api/.env.backup*` files. Store emergency secrets in a password manager or the deployment platform.
5. Rotate any credentials that were ever stored in backup env files, pasted in chat, or committed in old archives.
6. Remove the inline `NEON_DATABASE_URL` fallback from `apps/api/scripts/migrate-data.js` in a follow-up security cleanup.
7. Update onboarding so new developers copy from app-specific example files instead of guessing where envs belong.
