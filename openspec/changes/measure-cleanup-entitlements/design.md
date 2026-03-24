# Technical Design: Measure, Cleanup & Entitlements

**Change**: `measure-cleanup-entitlements`  
**Sprints**: 3 (Analytics + Route Cleanup), 4 (Entitlements + Onboarding)  
**Status**: Draft  
**Tech Stack**: Next.js 16, Fastify 5.7, PostHog analytics  
**Assumes**: `sdd-init` completed, feature flags available in config

---

## 1. Analytics — Queue Flush & Funnel Events

### 1.1 Queue Flush Fix Architecture

**Problem**: `__fsAnalyticsQueue` events captured before PostHog init are lost.

**Solution**: Flush queue inside `initPostHog()` after `posthog.init()` resolves.

```
┌─────────────────────────────────────────────────────────────┐
│                     apps/web/src/lib/analytics.ts           │
├─────────────────────────────────────────────────────────────┤
│  initPostHog()                                              │
│    ├─ posthog.init() ──→ loaded callback                    │
│    └─ flushQueue()                                          │
│         ├─ iterate __fsAnalyticsQueue                        │
│         ├─ skip $pageview (auto-captured by PostHog)       │
│         ├─ posthog.capture(event) for each                  │
│         └─ mark flushed (prevent re-send)                   │
└─────────────────────────────────────────────────────────────┘
```

**Implementation**:

```typescript
// apps/web/src/lib/analytics.ts (modifications)

let queueFlushed = false;

function flushQueue() {
  if (queueFlushed || !window.__fsAnalyticsQueue?.length) return;
  
  window.__fsAnalyticsQueue.forEach(({ name, props }) => {
    if (name !== "$pageview") {
      posthog.capture(name, props ?? {});
    }
  });
  
  // Clear queue but keep reference to prevent re-send
  queueFlushed = true;
  window.__fsAnalyticsQueue = [];
}

export function initAnalytics() {
  // ... existing init code ...
  
  posthog.init(apiKey, {
    // ... config ...
    loaded: () => {
      analyticsEnabled = true;
      flushQueue(); // <-- NEW: flush pre-init events
    },
  });
}
```

**Deduplication**: Use `queueFlushed` flag to prevent duplicate sends. The queue is cleared after first flush.

### 1.2 Core Funnel Event Schema

Create `apps/web/src/lib/analytics/events.ts` with typed constants:

```typescript
// apps/web/src/lib/analytics/events.ts

export const FunnelEvents = {
  SIGNUP: "signup",
  ONBOARDING_COMPLETE: "onboarding_complete",
  PLAN_GENERATED: "plan_generated",
  WORKOUT_STARTED: "workout_started",
  MEAL_LOGGED: "meal_logged",
  UPGRADE_CLICK: "upgrade_click",
} as const;

export type SignupProps = { method: "email" | "google" | "apple" };
export type OnboardingCompleteProps = { steps_completed: number; profile_complete: boolean };
export type PlanGeneratedProps = { plan_type: "training" | "nutrition" | "both" };
export type WorkoutStartedProps = { workout_id: string; day_index: number };
export type MealLoggedProps = { meal_type: "breakfast" | "lunch" | "dinner" | "snack"; calories?: number };
export type UpgradeClickProps = { source: "paywall" | "nav" | "feature-gate"; target_plan: string };

export type FunnelEventProps = SignupProps | OnboardingCompleteProps | PlanGeneratedProps | WorkoutStartedProps | MealLoggedProps | UpgradeClickProps;
```

**Where to fire each event**:

| Event | Location | Trigger |
|-------|----------|---------|
| `signup` | `apps/web/src/app/(auth)/register/page.tsx` | Auth success response |
| `onboarding_complete` | `apps/web/src/app/(app)/app/onboarding/page.tsx` | Final step submit |
| `plan_generated` | `apps/web/src/app/(app)/app/entrenamiento/page.tsx` | Plan API response |
| `workout_started` | `apps/web/src/app/(app)/app/entrenamiento/[workoutId]/start/page.tsx` | First set started |
| `meal_logged` | `apps/web/src/app/(app)/app/nutricion/page.tsx` | Meal form submit |
| `upgrade_click` | Upgrade CTA components | Button click |

### 1.3 Missing Training Events (5 TODOs)

Based on `analytics.ts` existing events, implement these in training components:

1. **`workout_started`** → `apps/web/src/components/training/WorkoutSession.tsx` — when user starts first set
2. **`workout_completed`** → `apps/web/src/components/training/WorkoutSession.tsx` — workout finish
3. **`training_start_clicked`** → `apps/web/src/components/training/WorkoutCard.tsx` — "Start Workout" click
4. Related events in nutrition: `nutrition_log_opened`, `meal_logged` already exist but may need wiring

**TODO markers to replace** (search `analytics.ts` for TODO comments in training components):

```typescript
// In training components - replace TODO with:
trackEvent("workout_started", { workout_id, day_index });
```

### 1.4 PostHog Provider Setup

Verify environment variables are consumed (already present in `analytics.ts`):

```typescript
// Already correct - no changes needed:
const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com";

posthog.init(apiKey, { api_host: apiHost, ... });
```

**Add to `.env.local.example`**:

```
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

## 2. Routing — Redirect Cleanup & Route Collapsing

### 2.1 Shared `toQueryString` Utility

Create single source of truth:

```typescript
// apps/web/src/lib/toQueryString.ts

type QueryParams = Record<string, string | number | boolean | undefined>;

export function toQueryString(params: QueryParams): string {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}
```

**Files to update** (8 redirect pages):

- `apps/web/src/app/(app)/app/training/page.tsx`
- `apps/web/src/app/(app)/app/nutrition/page.tsx`
- `apps/web/src/app/(app)/app/workouts/page.tsx`
- `apps/web/src/app/(app)/app/dashboard/page.tsx`
- `apps/web/src/app/(app)/app/today/page.tsx`
- `apps/web/src/app/(app)/app/dietas/page.tsx`
- `apps/web/src/app/(app)/app/entrenamientos/page.tsx`
- `apps/web/src/app/(app)/app/progress/page.tsx`

**Pattern** (before):

```typescript
// Inside each redirect page.tsx
function toQueryString(params: Record<string, string>) { ... } // DUPLICATE

export default function Page() {
  redirect(`/app/es${toQueryString(...)}`);
}
```

**Pattern** (after):

```typescript
// apps/web/src/app/(app)/app/training/page.tsx
import { toQueryString } from "@/lib/toQueryString";

export default function Page() {
  redirect(`/app/entrenamiento${toQueryString({ ... })}`);
}
```

### 2.2 Route Redirect Architecture

**Approach**: Use Next.js middleware for 301 permanent redirects (better SEO, faster than page-level redirects).

```typescript
// apps/web/src/middleware.ts additions

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROUTE_REDIRECTS = [
  { from: "/app/training", to: "/app/entrenamiento" },
  { from: "/app/nutrition", to: "/app/nutricion" },
  { from: "/app/workouts", to: "/app/entrenamientos" },
  { from: "/app/dashboard", to: "/app/hoy" },
  { from: "/app/today", to: "/app/hoy" },
  { from: "/app/dietas", to: "/app/nutricion/planes" },
  { from: "/app/progress", to: "/app/seguimiento" },
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  for (const redirect of ROUTE_REDIRECTS) {
    if (pathname.startsWith(redirect.from) || pathname === redirect.from) {
      const destination = pathname.replace(redirect.from, redirect.to);
      return NextResponse.redirect(new URL(destination, request.url), 301);
    }
  }

  // ... existing profile gate, entitlement guard logic ...
}
```

### 2.3 EN→ES Redirect Mapping Table

| From (remove) | To (canonical) | Type |
|---------------|----------------|------|
| `/app/training/*` | `/app/entrenamiento/*` | 301 |
| `/app/nutrition/*` | `/app/nutricion/*` | 301 |
| `/app/workouts/*` | `/app/entrenamientos/*` | 301 |
| `/app/dashboard` | `/app/hoy` | 301 |
| `/app/today` | `/app/hoy` | 301 |
| `/app/dietas/*` | `/app/nutricion/*` | 301 |
| `/app/progress/*` | `/app/seguimiento/*` | 301 |

**Gym Requests nav**: Remove `disabled: true` in `navConfig.ts`:

```typescript
// apps/web/src/components/layout/navConfig.ts line 189-194

// BEFORE:
{
  id: "admin-gym-requests",
  href: "/app/admin/gym-requests",
  labelKey: "nav.gymJoinRequests",
  disabled: true,  // <-- REMOVE
  disabledNoteKey: "common.comingSoon",
},

// AFTER:
{
  id: "admin-gym-requests",
  href: "/app/admin/gym-requests",
  labelKey: "nav.gymJoinRequests",
  // No disabled flag - accessible to admins
},
```

---

## 3. Entitlements — Three-Layer Architecture

### 3.1 Backend: `buildEffectiveEntitlements`

Already implemented in `apps/api/src/entitlements.ts`. Returns module-level flags:

```typescript
// apps/api/src/entitlements.ts

export interface EffectiveEntitlements {
  modules: {
    strength: { enabled: boolean; reason: "plan" | "admin_override" | "none" };
    nutrition: { enabled: boolean; reason: "plan" | "admin_override" | "none" };
    ai: { enabled: boolean; reason: "plan" | "admin_override" | "none" };
  };
  // ...
}
```

**No changes needed** — frontend just needs to consume this properly.

### 3.2 Backend Guard: Middleware Entitlement Checks

`apps/api/src/middleware/entitlements.ts` already provides:

- `hasPremiumAiAccess()` — AI feature guard
- `hasAiDomainAccess({ domain: "nutrition" | "strength" })` — domain-specific guard

**Usage in Fastify routes**:

```typescript
// apps/api/src/routes/some-route.ts

fastify.get("/nutrition/plan", {
  preHandler: hasAiDomainAccess({
    domain: "nutrition",
    requireUser,
    isBootstrapAdmin,
  }),
}, async (request, reply) => {
  // Only users with nutrition entitlement can access
});
```

### 3.3 Frontend: Route-Level Entitlement Guard

**Three-layer check**:

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Backend (buildEffectiveEntitlements)                  │
│  - Returns module flags: { strength, nutrition, ai }.enabled    │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Backend Guard (middleware/entitlements.ts)            │
│  - hasAiDomainAccess() blocks API calls if no entitlement      │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Frontend Guard (RouteEntitlementGuard component)      │
│  - Intercepts route navigation before rendering                 │
│  - Redirects to /app/hoy?upgrade={module} if denied            │
└─────────────────────────────────────────────────────────────────┘
```

**Route → Module Mapping**:

| Route Pattern | Required Module | Backend Module Key |
|---------------|-----------------|---------------------|
| `/app/nutricion/*` | nutrition | `modules.nutrition.enabled` |
| `/app/entrenamiento/*` | strength | `modules.strength.enabled` |
| `/app/analytics/*` | advanced_analytics | (future: `modules.analytics.enabled`) |
| `/app/gym-requests` | gym_requests | (future: `modules.gymRequests.enabled`) |
| `/app/macros` | nutrition | `modules.nutrition.enabled` |
| `/app/biblioteca/recetas` | nutrition | `modules.nutrition.enabled` |

### 3.4 FE Route Guard Implementation

**New component**: `apps/web/src/components/RouteEntitlementGuard.tsx`

```typescript
// apps/web/src/components/RouteEntitlementGuard.tsx

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useEntitlements } from "@/context/auth/entitlements";

const ROUTE_ENTITLEMENT_MAP: Record<string, "nutrition" | "strength" | "ai" | "billing"> = {
  "/app/nutricion": "nutrition",
  "/app/nutricion/": "nutrition",
  "/app/entrenamiento": "strength",
  "/app/entrenamiento/": "strength",
  "/app/macros": "nutrition",
  "/app/biblioteca/recetas": "nutrition",
};

function getRequiredModule(pathname: string): string | null {
  for (const [route, module] of Object.entries(ROUTE_ENTITLEMENT_MAP)) {
    if (pathname.startsWith(route)) {
      return module;
    }
  }
  return null;
}

export function RouteEntitlementGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { entitlements, isLoading } = useEntitlements();

  useEffect(() => {
    if (isLoading || !entitlements) return;

    const requiredModule = getRequiredModule(pathname);
    if (!requiredModule) return; // No gate on this route

    const hasAccess = entitlements.features[`canUse${requiredModule.charAt(0).toUpperCase()}${requiredModule.slice(1)}` as keyof typeof entitlements.features];
    
    if (!hasAccess) {
      router.push(`/app/hoy?upgrade=${requiredModule}`);
    }
  }, [pathname, entitlements, isLoading, router]);

  if (isLoading) {
    return <div aria-busy="true" aria-label="Checking access..."><div className="animate-pulse h-96 bg-gray-100" /></div>;
  }

  return <>{children}</>;
}
```

**Wrap protected routes** in `apps/web/src/app/(app)/layout.tsx`:

```typescript
// apps/web/src/app/(app)/layout.tsx

import { RouteEntitlementGuard } from "@/components/RouteEntitlementGuard";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      {/* existing sidebar */}
      <main className="flex-1">
        <RouteEntitlementGuard>
          {children}
        </RouteEntitlementGuard>
      </main>
    </div>
  );
}
```

**Remove plan-derived checks**: Replace all instances of `plan === "PRO"` with entitlement module checks:

```typescript
// BEFORE (in various components):
if (user.plan === "PRO") { ... }

// AFTER:
if (entitlements.features.canUseAI) { ... }
```

---

## 4. Onboarding — Profile Gate Expansion & Mobile Optimization

### 4.1 Profile Gate Expansion

**Current state**: `redirectToOnboardingIfIncomplete` is called in individual page files (4 routes).

**Target**: Apply to ALL `(app)` routes via middleware (single point of control).

**Middleware approach** (recommended — runs before any page renders):

```typescript
// apps/web/src/middleware.ts additions

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ONBOARDING_REDIRECTS = [
  "/app/onboarding",
  "/app/api/auth",
  "/app/verify-email",
]; // Routes that bypass profile gate

async function checkProfileComplete(request: NextRequest): Promise<boolean> {
  const token = cookies().get("fs_token")?.value;
  if (!token) return false;

  try {
    const response = await fetch(`${process.env.API_URL}/profile`, {
      headers: { cookie: `fs_token=${token}` },
    });
    if (!response.ok) return false;
    const profile = await response.json();
    return isProfileComplete(profile); // existing utility
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass for onboarding/auth routes
  if (ONBOARDING_REDIRECTS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Only check for /app/* routes
  if (!pathname.startsWith("/app")) {
    return NextResponse.next();
  }

  const profileComplete = await checkProfileComplete(request);
  if (!profileComplete) {
    const returnTo = pathname + request.nextUrl.search;
    return NextResponse.redirect(new URL(`/app/onboarding?next=${encodeURIComponent(returnTo)}`, request.url));
  }

  // ... existing redirect logic ...
}
```

**Route coverage** (after implementation):

| Route Group | Coverage |
|-------------|----------|
| `(app)` (all `/app/*` routes) | 100% |
| Individual page `redirectToOnboardingIfIncomplete` calls | Removed |

### 4.2 Server Redirect Strategy

Two options for profile gate:

| Strategy | Pros | Cons |
|----------|------|------|
| **Middleware** (recommended) | Runs before any page load, single point | Higher latency per request (needs API call) |
| **Server Component** in `layout.tsx` | Can use server utilities directly | Only applies to pages that import it |

**Decision**: Use middleware for coverage, but add caching (5 minute TTL) to avoid repeated API calls on every navigation.

```typescript
// In middleware - cache profile check:
const cacheKey = `profile_complete:${token}`;
const cached = await redis.get(cacheKey); // or in-memory cache
if (cached !== undefined) {
  return cached === "true";
}
```

### 4.3 Mobile Optimization Changes

**Onboarding wizard steps** — reduce to ≤3 actions per step on 375px viewport:

**Current steps** (approximate, need audit):

1. Welcome + goal selection (3+ actions)
2. Personal info (height, weight, birthdate) (3+ actions)
3. Fitness level + experience (2-3 actions)
4. Equipment availability (2-3 actions)
5. Schedule preference (2-3 actions)
6. Confirm / Finish

**Optimized** (target):

| Step | Actions | Components |
|------|---------|------------|
| 1 | 2 | Welcome text, goal dropdown |
| 2 | 3 | Height input, weight input, birthdate |
| 3 | 2 | Gender select, fitness level |
| 4 | 1 | "Finish" button (optional: skip equipment) |

**Implementation**: Split high-density steps into separate pages. Use conditional rendering for optional fields.

**Mobile-specific CSS**:

```css
/* apps/web/src/app/(app)/app/onboarding/onboarding.module.css */

@media (max-width: 375px) {
  .step-container {
    padding: 16px;
    gap: 12px;
  }
  
  .action-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  /* Ensure 44px minimum tap targets */
  button, input, select {
    min-height: 44px;
  }
}
```

---

## 5. File Changes Summary

### Sprint 3: Analytics

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/lib/analytics.ts` | Modify | Add `flushQueue()` in init, `queueFlushed` flag |
| `apps/web/src/lib/analytics/events.ts` | **NEW** | Funnel event constants + types |
| Training components (5 files) | Modify | Wire missing TODO events |
| `.env.local.example` | Modify | Add PostHog env var docs |

### Sprint 3: Routing

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/lib/toQueryString.ts` | **NEW** | Shared utility |
| 8 redirect pages | Modify | Import shared util |
| `apps/web/src/middleware.ts` | Modify | Add 301 redirects for EN→ES |
| `apps/web/src/components/layout/navConfig.ts` | Modify | Remove `disabled: true` from gym-requests |

### Sprint 4: Entitlements

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/context/auth/entitlements.ts` | Modify | Expose module flags to consumers |
| `apps/web/src/lib/entitlements.ts` | Modify | Replace plan checks with module checks |
| `apps/web/src/components/RouteEntitlementGuard.tsx` | **NEW** | Route-level guard component |
| `apps/web/src/app/(app)/layout.tsx` | Modify | Wrap with guard |
| Frontend components | Modify | Replace `plan === "PRO"` with entitlements |

### Sprint 4: Onboarding

| File | Action | Description |
|------|--------|-------------|
| `apps/web/src/middleware.ts` | Modify | Profile gate middleware + caching |
| `apps/web/src/lib/server/profileGate.ts` | Modify | Keep for SSR fallback, expand routes |
| `apps/web/src/app/(app)/app/onboarding/*` | Modify | Mobile optimization (≤3 actions/step) |
| Individual page files | Modify | Remove redundant `redirectToOnboardingIfIncomplete` calls |

---

## 6. Testing Strategy

### Analytics Tests

| Scenario | Test | Method |
|----------|------|--------|
| Queue flush fires | Pre-init event sent to PostHog | Unit: mock `posthog.init` callback, assert `capture` called |
| No duplicate events | Queue flushed once | Unit: call `flushQueue()` twice, assert capture called once |
| Training events fire | TODO events appear in debugger | Manual: trigger each action, verify in PostHog |
| Funnel events fire | All 6 funnel events fire | Manual: walk through funnel, verify each event |

**Unit test pattern**:

```typescript
// apps/web/src/__tests__/analytics/flushQueue.test.ts

import { flushQueue, initAnalytics } from "@/lib/analytics";

global.posthog = {
  init: vi.fn(),
  capture: vi.fn(),
};

global.window = {
  __fsAnalyticsQueue: [
    { name: "signup", props: { method: "email" } },
    { name: "$pageview", props: {} }, // should be filtered
  ],
};

test("flushQueue sends non-pageview events", () => {
  flushQueue();
  expect(posthog.capture).toHaveBeenCalledWith("signup", { method: "email" });
  expect(posthog.capture).not.toHaveBeenCalledWith("$pageview", {});
});
```

### Routing Tests

| Scenario | Test | Method |
|----------|------|--------|
| EN route 301s to ES | `/app/training` → `/app/entrenamiento` | E2E: `curl -I` assert 301 + Location header |
| `toQueryString` output matches | Redirect pages work | Unit: compare old vs new output for test cases |
| Nav item enabled | Gym requests clickable | Manual: as admin, click nav item, verify page loads |

### Entitlements Tests

| Scenario | Test | Method |
|----------|------|--------|
| FREE user redirected | Navigate to `/app/nutricion` | E2E: as FREE user, assert redirect to `/app/hoy?upgrade=nutrition` |
| PRO user accesses | Navigate to `/app/nutricion` | E2E: as PRO, assert page renders |
| Loading state no flash | Gated route loading | Visual: observe no content flash before redirect |
| Plan checks removed | `grep` returns 0 | Script: `rg "plan ===" apps/web/src --type tsx` |

### Onboarding Tests

| Scenario | Test | Method |
|----------|------|--------|
| Incomplete profile blocked | Navigate to `/app/hoy` | E2E: as new user, assert redirect to `/app/onboarding` |
| Profile gate covers all routes | Navigate to any `/app/*` | E2E: test 5 random app routes |
| Mobile ≤3 actions | View onboarding at 375px | Visual: count interactive elements per step |
| Optional fields deferred | Verify not in wizard | Visual: check if equipment/medical in wizard vs profile |

### Feature Flag Tests

| Flag | Behavior when disabled |
|------|------------------------|
| `featureFlags.analyticsV2` | Passive queue (original behavior) |
| `featureFlags.entitlementsV2` | Plan-derived checks + nav-only gating |
| `featureFlags.onboardingV2` | Original wizard layout |

---

## 7. Dependencies & Risks

### Dependencies

- **Backend**: `buildEffectiveEntitlements` already returns module flags — frontend just needs to consume
- **Environment**: `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` configured
- **Auth context**: `useEntitlements` hook available in `apps/web/src/context/auth/entitlements.ts`

### Risks & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Analytics duplicate events after flush | Medium | `queueFlushed` flag prevents re-send |
| Route guard breaks PRO user flows | High | Test all plan tiers before deploy |
| Profile gate blocks partial profiles | Medium | Add `/app/perfil` escape hatch |
| Middleware cache misses cause latency | Low | 5-min cache TTL, profile rarely changes |

---

## 8. Rollback Plan

1. **Analytics**: Revert `analytics.ts` changes — queue returns to passive (lossy) mode
2. **Routing**: Re-enable redirect pages from git history; remove middleware redirects
3. **Entitlements**: Revert frontend to plan-derived checks; remove `RouteEntitlementGuard`
4. **Onboarding**: Restore `redirectToOnboardingIfIncomplete` to 4-route scope

All changes behind feature flags — disable flag to rollback specific area without code revert.