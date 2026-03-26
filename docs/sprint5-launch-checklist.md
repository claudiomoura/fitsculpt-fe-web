# FitSculpt Soft Launch 50 Users - Checklist

## Pre-Launch Setup

### Environment Variables Required
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - Set Sentry DSN for error tracking
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` - Set PostHog API key
- [ ] `NEXT_PUBLIC_APP_ENV` - Set to `production` for launch

### Feature Flags (Optional)
- [ ] `NEXT_PUBLIC_FF_WAITLIST_MODE=true` - Keep waitlist active
- [ ] `NEXT_PUBLIC_FF_BETA_FEATURES=true` - Enable beta features

## Sentry Setup
- [ ] Create Sentry project for FitSculpt
- [ ] Get DSN from Sentry project settings
- [ ] Add DSN to Vercel environment variables
- [ ] Verify error capturing works in production

## Performance Monitoring
- [ ] Web Vitals tracking active (AppInit component)
- [ ] API response time logging available
- [ ] Check console for `[Web Vitals]` logs in dev

## Waitlist System
- [ ] Waitlist API endpoint ready: `/api/waitlist`
- [ ] WaitlistSignup component available
- [ ] Feature flag `waitlist_mode` defaults to true

## Documentation
- [ ] Sentry: `apps/web/sentry.client.config.ts`
- [ ] Web Vitals: `apps/web/src/hooks/useWebVitals.ts`
- [ ] Feature Flags: `apps/web/src/lib/feature-flags.ts`
- [ ] API Logger: `apps/web/src/lib/api-logger.ts`
- [ ] Waitlist API: `apps/web/src/app/api/waitlist/route.ts`

## Pre-Launch Verification
- [ ] Run `pnpm build` successfully
- [ ] No critical console errors
- [ ] ErrorBoundary catches React errors
- [ ] Analytics (PostHog) working

## Post-Launch Monitoring
- [ ] Check Sentry for errors
- [ ] Monitor Web Vitals in PostHog
- [ ] Check waitlist signups
- [ ] Review API response times