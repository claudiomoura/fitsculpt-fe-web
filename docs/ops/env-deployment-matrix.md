# FitSculpt Env Contract & Deployment Matrix

## Goal

Keep local, CI, Vercel, and Render aligned without inventing secrets or silently changing runtime contracts.

## Deployment matrix

| Surface | Platform | Required envs | Notes |
| --- | --- | --- | --- |
| Web | Local | `BACKEND_URL`, `NEXT_PUBLIC_BACKEND_URL` | Same-origin BFF expects backend reachable from Next runtime; keep both values aligned when both are set. |
| Web | Vercel | `BACKEND_URL`, `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_APP_ENV` | Vercel owns web/BFF routing keys only; no API secrets here. `NEXT_PUBLIC_SUPPORT_URL` is optional. |
| API | Local | `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `CORS_ORIGIN`, `APP_BASE_URL` | Use local Postgres or Neon branch; do not run destructive resets on shared DBs. |
| API | Render | `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `CORS_ORIGIN`, `APP_BASE_URL`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID` | Render owns API runtime + secret material. Use `npm run db:deploy`; never run `prisma migrate dev` on Render. |
| CI | GitHub Actions | ephemeral Postgres + same API/Web env contract as local | Defined today in `.github/workflows/ci.yml`. |

## Contract rules

- Web BFF routes MUST use the same backend origin configured by `BACKEND_URL`.
- API cookies/JWT secrets MUST be provisioned outside git and kept at 32+ chars.
- Analytics envs are optional for local dev and required for production observability.
- Missing deploy manifests are intentional; deployment stays document-driven until infra ownership is explicit.

## Verification

1. Web: `npm --prefix apps/web run typecheck`
2. API: `npm --prefix apps/api run typecheck`
3. Bundle gate: `npm run rc:gate:bundle`
4. Optional smoke with local stack: `npm --prefix apps/web run e2e:smoke:beta`
