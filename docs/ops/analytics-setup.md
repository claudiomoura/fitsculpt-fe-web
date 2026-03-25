# Analytics Setup Guide

## Overview

FitSculpt uses PostHog for product analytics. This document covers setup, configuration, and usage.

## Setup

### 1. Create PostHog Account

1. Go to [posthog.com](https://posthog.com) and create an account
2. Create a new project for FitSculpt
3. Copy the **Project API Key** (starts with `phc_`)

### 2. Configure Environment Variables

Add to `.env.local`:

```bash
# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

For local development, you can leave these empty - analytics will be disabled gracefully.

### 3. For Production

Set environment variables in your deployment platform:
- Vercel: Project Settings → Environment Variables
- Docker: Add to docker-compose.yml or secrets

## Events Catalog

### Core Events

| Event Name | When | Props |
|------------|-------|-------|
| `today_view` | Today page mounted | - |
| `today_cta_click` | CTA clicked | `target: "training" \| "nutrition" \| "checkin"` |
| `onboarding_completed` | Onboarding finished | `origin` |
| `workout_started` | Workout begins | `target`, `origin` |
| `workout_completed` | Workout finished | - |
| `nutrition_meal_logged` | Meal logged | `mealType` |
| `meal_logged` | Meal logged (legacy) | `mealType` |
| `quick_log_opened` | Quick log opened | `target`, `origin` |
| `quick_log_saved` | Quick log saved | `target`, `origin`, `mode` |
| `voice_log_used` | Voice input used | `target`, `origin` |
| `barcode_lookup_used` | Barcode scanned | `target`, `origin` |
| `checkin_opened` | Check-in opened | - |
| `checkin_saved` | Check-in saved | - |

### Billing Events

| Event Name | When | Props |
|------------|-------|-------|
| `billing_checkout_started` | Checkout initiated | `target`, `origin`, `returnTo` |
| `billing_checkout_returned` | Returned from checkout | `target`, `origin`, `returnTo` |
| `upgrade_started` | Upgrade flow started | `target`, `origin`, `returnTo` |
| `payment_success` | Payment successful | `target`, `origin`, `returnTo` |

### Weekly Review Events

| Event Name | When | Props |
|------------|-------|-------|
| `weekly_review_opened` | Review opened | `weekKey` |
| `recommendation_seen` | Recommendation viewed | `recommendationId`, `recommendationType`, `weekKey` |
| `adjustment_accepted` | Recommendation accepted | `recommendationId`, `recommendationType`, `weekKey` |
| `adjustment_rejected` | Recommendation rejected | `recommendationId`, `recommendationType`, `weekKey` |

### RCT / Future Projection Events

| Event Name | When | Props |
|------------|-------|-------|
| `future_projection_viewed` | Projection viewed | `horizonMonths`, `rctGroup` |
| `future_projection_scenario_selected` | Scenario selected | `horizonMonths`, `rctGroup`, `scenarioId` |
| `rct_status_viewed` | RCT status viewed | `rctGroup` |
| `rct_summary_viewed` | RCT summary viewed | `rctGroup` |

## Tracking in Code

### Using trackEvent

```typescript
import { trackEvent } from "@/lib/analytics";

// Basic event
trackEvent("today_view");

// Event with props
trackEvent("today_cta_click", { target: "training" });

// Weekly review event (uses specialized wrapper)
import { trackWeeklyReviewEvent } from "@/lib/weeklyReviewTelemetry";

trackWeeklyReviewEvent({
  event: "adjustment_accepted",
  timestamp: new Date().toISOString(),
  weekKey: "2026-03-17",
  recommendationId: "training-deload",
  recommendationType: "training",
});
```

### Adding New Events

1. Add event name to `AnalyticsEventName` in `apps/web/src/lib/analytics.ts`
2. Add props to `AnalyticsEventProps` if needed
3. Use `trackEvent()` in component

## Debugging

### Local Development

Analytics is disabled when `NEXT_PUBLIC_POSTHOG_KEY` is empty. Events are still queued locally.

Check the browser console for:
```
[Analytics] Event queued: event_name
```

### View Queued Events

Open browser DevTools:

```javascript
window.__fsAnalyticsQueue
```

### PostHog Debug Mode

Install PostHog browser extension to see events in real-time:
- Chrome: [PostHog DevTools](https://chrome.google.com/webstore/detail|posthog)
- Firefox: [PostHog DevTools](https://addons.mozilla.org/firefox/addon/posthog/)

## Privacy

- PostHog is self-hosted or cloud-hosted (your choice)
- No PII is sent without consent
- User identification happens after login only
- Events include `subscription_plan` for cohort analysis

## Dashboard Recommendations

### Key Metrics to Track

1. **Activation Rate**
   - `onboarding_completed` / registrations

2. **Core Loop Engagement**
   - `today_view` per user per week
   - `workout_completed` per user per week

3. **Retention**
   - Users who return within 7 days
   - Users who complete 2+ workouts per week

4. **Conversion Funnel**
   - `billing_checkout_started` → `payment_success`

5. **Feature Adoption**
   - `voice_log_used` usage
   - `weekly_review_opened` engagement

### Recommended Dashboards

1. **Weekly Active Users** - `today_view` unique users
2. **Workout Completion Rate** - `workout_started` → `workout_completed`
3. **Feature Usage** - Event counts by type
4. **Conversion Funnel** - Billing events funnel

## Troubleshooting

### Events Not Appearing

1. Check `NEXT_PUBLIC_POSTHOG_KEY` is set
2. Check browser console for errors
3. Verify network requests to `app.posthog.com`
4. Check PostHog project settings

### User Not Identified

1. Ensure `AnalyticsProvider` is in layout
2. Check `/api/auth/me` returns user ID
3. Verify `identifyAnalyticsUser` is called

## Migration from Other Providers

If switching from Segment/GA:

1. Keep current implementation temporarily
2. Add PostHog alongside existing
3. Compare event counts
4. Migrate dashboards
5. Remove old provider

## Support

- PostHog Docs: https://posthog.com/docs
- PostHog Slack: https://join.slack.com/t/posthogusers/shared_invite/xxx
