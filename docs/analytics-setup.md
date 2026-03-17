# Analytics Setup

## Provider
FitSculpt web now supports PostHog as the real product analytics provider.

## Required env vars
Set these in `apps/web/.env.local` or your deployment environment:

- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST` (optional, defaults to `https://app.posthog.com`)

## Current tracked events
- `today_view`
- `today_cta_click`
- `training_start_clicked`
- `nutrition_log_opened`
- `nutrition_meal_logged`
- `checkin_opened`
- `checkin_saved`
- `billing_checkout_started`
- `billing_checkout_returned`

## Notes
- Analytics is best-effort and must never block UX.
- If PostHog is not configured, events still collect in `window.__fsAnalyticsQueue` for local debugging.
- User identity is refreshed from `/api/auth/me` on boot and on `auth:refresh` events.
