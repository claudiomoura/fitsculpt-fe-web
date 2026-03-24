# Backend Decomposition + Design System Completion — Full Specification

## Part 1: Backend Domain Module Extraction

### 1.1 AppContext Interface

The system SHALL define a typed `AppContext` interface in `apps/api/src/types/appContext.ts` that replaces the untyped `deps: Record<string, any>` parameter in all domain route registrars.

```typescript
// apps/api/src/types/appContext.ts

import type { PrismaClient } from "@prisma/client";
import type { FastifyRequest, FastifyReply } from "fastify";

export interface AppContext {
  prisma: PrismaClient;
  handleRequestError: (reply: FastifyReply, error: unknown) => Promise<never>;

  // Auth middleware (extracted — see 1.4)
  normalizeToken: (request: FastifyRequest) => Promise<string | null>;
  requireUser: (request: FastifyRequest) => Promise<{ id: string; email: string; role: string; [key: string]: unknown }>;
  requireAdmin: (request: FastifyRequest) => Promise<{ id: string; email: string; role: string }>;
  isGlobalAdminUser: (user: { role: string }) => boolean;

  // Gym helpers
  requireGymManagerAccess: (user: { id: string }, gymId: string) => Promise<void>;
  requireGymManagerForGym: (user: { id: string }, gymId: string) => Promise<void>;
  requireActiveGymManagerMembership: (userId: string) => Promise<{ gymId: string; role: string }>;

  // Shared schemas (zod)
  schemas: {
    assignTrainingPlanParamsSchema: import("zod").ZodType;
    assignTrainingPlanBodySchema: import("zod").ZodType;
    trainerMemberParamsSchema: import("zod").ZodType;
    trainerMemberIdParamsSchema: import("zod").ZodType;
    trainingPlanListSchema: import("zod").ZodType;
    trainerPlanCreateSchema: import("zod").ZodType;
    trainerPlanParamsSchema: import("zod").ZodType;
    trainerPlanUpdateSchema: import("zod").ZodType;
    trainerPlanDayParamsSchema: import("zod").ZodType;
    trainerPlanExerciseParamsSchema: import("zod").ZodType;
    trainerPlanExerciseUpdateSchema: import("zod").ZodType;
    addTrainingExerciseBodySchema: import("zod").ZodType;
    trainerAssignPlanResultSchema: import("zod").ZodType;
    trainerAssignNutritionPlanResultSchema: import("zod").ZodType;
    trainerAssignPlanBodySchema: import("zod").ZodType;
    trainerAssignNutritionPlanBodySchema: import("zod").ZodType;
    nutritionPlanListSchema: import("zod").ZodType;
    nutritionPlanParamsSchema: import("zod").ZodType;
    trainerNutritionPlanCreateSchema: import("zod").ZodType;
    trainerNutritionPlanParamsSchema: import("zod").ZodType;
    workoutCreateSchema: import("zod").ZodType;
    workoutUpdateSchema: import("zod").ZodType;
    workoutSessionUpdateSchema: import("zod").ZodType;
  };

  // Select helpers
  selects: {
    assignedTrainingPlanSummarySelect: Record<string, unknown>;
    assignedNutritionPlanSummarySelect: Record<string, unknown>;
    trainingDayIncludeWithLegacySafeExercises: Record<string, unknown>;
  };

  // Utility functions
  utils: {
    parseDateInput: (input: string) => Date | null;
    buildDateRange: (startDate: Date, daysCount: number) => string[];
    createHttpError: (status: number, message: string) => Error;
    parseClientMetrics: (data: unknown) => Record<string, unknown>;
  };

  // Enums / constants
  enums: {
    GymMembershipStatus: Record<string, string>;
    GymRole: Record<string, string>;
  };
}
```

#### Scenario: AppContext is injectable into domain modules

- GIVEN a domain module registrar `registerXxxRoutes(app: FastifyInstance, ctx: AppContext)`
- WHEN the registrar calls `ctx.requireUser(request)`
- THEN it receives a typed user object
- AND type-checking catches missing or renamed properties at compile time

#### Scenario: Domain module receives only AppContext, not raw deps

- GIVEN `index.ts` constructs `AppContext` from the dependency object
- WHEN a domain module file is imported
- THEN its signature is `(app: FastifyInstance, ctx: AppContext) => void`
- AND no `Record<string, any>` appears in any domain module file

### 1.2 Domain Module File Mapping

Each domain module SHALL be a directory under `apps/api/src/domains/` with a single entry point `registerXxxRoutes.ts`.

| Domain | Directory | Routes Extracted |
|--------|-----------|-----------------|
| auth | `domains/auth/` | POST `/signup`, POST `/register`, POST `/login`, POST `/logout`, POST `/verify-email`, GET `/auth/me`, POST `/auth/google`, POST `/auth/forgot-password`, POST `/auth/reset-password` |
| profile | `domains/profile/` | GET `/profile`, PUT `/profile` |
| tracking | `domains/tracking/` | GET `/tracking`, POST `/tracking`, PUT `/tracking/:id`, DELETE `/tracking/:id` |
| feed | `domains/feed/` | GET `/feed`, POST `/feed` |
| gym | `domains/gym/` | (already partially extracted — merge remaining gym-related routes from index.ts) |
| admin | `domains/admin/` | GET `/admin/users`, POST `/admin/users`, DELETE `/admin/users/:id`, PATCH `/admin/users/:id/plan`, PATCH `/admin/users/:id/tokens`, GET `/admin/gyms`, POST `/admin/gyms`, DELETE `/admin/gyms/:gymId`, PATCH `/admin/gyms/:gymId/members/:userId/role`, GET `/admin/gym-join-requests`, POST `/admin/gym-join-requests/:membershipId/accept`, POST `/admin/gym-join-requests/:membershipId/reject`, GET `/admin/gyms/:gymId/members` |
| trainer | `domains/trainer/` | (already partially extracted — merge remaining trainer routes: plans CRUD, clients, nutrition plans, assign) |
| dev | `domains/dev/` | POST `/seed-exercises`, POST `/seed-recipes`, POST `/reset-demo` |

#### Scenario: Each domain has a single registration entry point

- GIVEN a new domain module directory `domains/<domain>/`
- WHEN examining the directory
- THEN it contains `registerXxxRoutes.ts` as the primary export
- AND any helper files are co-located in the same directory

#### Scenario: Route count invariant after extraction

- GIVEN all 87 routes are extracted from `index.ts`
- WHEN counting routes across all domain modules
- THEN the total count equals 87
- AND no route exists in two modules simultaneously

### 1.3 Plugin Registration Pattern

`index.ts` SHALL mount domain modules using Fastify's plugin registration pattern.

```typescript
// apps/api/src/index.ts (post-extraction structure)

import fastify from "fastify";
import { registerAuthRoutes } from "./domains/auth/registerAuthRoutes";
import { registerProfileRoutes } from "./domains/profile/registerProfileRoutes";
import { registerTrackingRoutes } from "./domains/tracking/registerTrackingRoutes";
import { registerFeedRoutes } from "./domains/feed/registerFeedRoutes";
import { registerGymRoutes } from "./domains/gym/registerGymRoutes";
import { registerAdminRoutes } from "./domains/admin/registerAdminRoutes";
import { registerTrainerRoutes } from "./domains/trainer/registerTrainerRoutes";
import { registerDevRoutes } from "./domains/dev/registerDevRoutes";

const app = fastify({ /* config */ });

// ... plugins (cors, cookie, jwt) ...

const ctx: AppContext = buildAppContext(/* dependencies */);

registerAuthRoutes(app, ctx);
registerProfileRoutes(app, ctx);
registerTrackingRoutes(app, ctx);
registerFeedRoutes(app, ctx);
registerGymRoutes(app, ctx);
registerAdminRoutes(app, ctx);
registerTrainerRoutes(app, ctx);
registerDevRoutes(app, ctx);

app.listen({ port: PORT });
```

#### Scenario: index.ts mounts all domain modules

- GIVEN `index.ts` after extraction
- WHEN counting lines
- THEN it is fewer than 500 lines
- AND it contains exactly 8 `registerXxxRoutes(app, ctx)` calls
- AND no route handler bodies remain inline

### 1.4 Auth Middleware Extraction

The system SHALL extract auth middleware into `apps/api/src/middleware/auth.ts`.

```typescript
// apps/api/src/middleware/auth.ts

import type { FastifyRequest } from "fastify";

/**
 * Extracts and normalizes the Bearer token from Authorization header.
 * Preserves existing workarounds: quoted tokens, percent-encoding, fallback to query param.
 */
export async function normalizeToken(request: FastifyRequest): Promise<string | null> {
  // implementation preserving all existing workarounds
}

/**
 * Validates the request has a valid authenticated user.
 * Returns the user object from the database.
 * Throws 401 if not authenticated.
 */
export async function requireUser(request: FastifyRequest): Promise<{ id: string; email: string; role: string; [key: string]: unknown }> {
  // implementation
}

/**
 * Validates the request has a valid authenticated admin user.
 * Returns the admin user object.
 * Throws 401 if not authenticated, 403 if not admin.
 */
export async function requireAdmin(request: FastifyRequest): Promise<{ id: string; email: string; role: string }> {
  // implementation
}
```

#### Scenario: normalizeToken preserves existing behavior

- GIVEN a request with `Authorization: Bearer "quoted-token"`
- WHEN `normalizeToken` is called
- THEN it returns `"quoted-token"` (quotes stripped)
- AND behavior matches the current inline implementation verbatim

#### Scenario: requireUser returns typed user

- GIVEN a request with a valid JWT in the Authorization header
- WHEN `requireUser` is called
- THEN it returns `{ id: string, email: string, role: string, ... }`
- AND the user is looked up from the database via `prisma`

#### Scenario: requireAdmin rejects non-admin users

- GIVEN a request with a valid JWT for a USER role
- WHEN `requireAdmin` is called
- THEN a 403 error is thrown with message "FORBIDDEN"

### 1.5 Stripe Types Extraction

The system SHALL extract Stripe-related type definitions from `index.ts:137-200` into `apps/api/src/domains/billing/stripe.ts`.

```typescript
// apps/api/src/domains/billing/stripe.ts

export interface StripeSubscription {
  id: string;
  status: "active" | "canceled" | "past_due" | "trialing";
  current_period_end: string;
  items: { data: Array<{ price: { id: string; product: string } }> };
}

export interface StripeCustomer {
  id: string;
  email: string;
  subscriptions?: { data: StripeSubscription[] };
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

// etc. — all types currently defined inline in index.ts:137-200
```

#### Scenario: No inline Stripe types remain in index.ts

- GIVEN `index.ts` after extraction
- WHEN searching for `interface Stripe` or `type Stripe`
- THEN zero matches are found
- AND all Stripe type imports come from `domains/billing/stripe.ts`

### 1.6 Acceptance Criteria

#### Scenario: index.ts line count

- GIVEN the final state of `apps/api/src/index.ts`
- WHEN counting lines (including blank lines and comments)
- THEN the total is fewer than 500 lines

#### Scenario: All contract tests pass

- GIVEN the extracted codebase
- WHEN running `npm run test:contract` (or equivalent)
- THEN all 37+ contract tests pass
- AND zero tests are skipped or marked as flaky

#### Scenario: No TypeScript errors

- GIVEN the extracted codebase
- WHEN running `npm run typecheck`
- THEN zero type errors are reported

#### Scenario: No duplicate route registrations

- GIVEN all domain modules are mounted in `index.ts`
- WHEN starting the server
- THEN no "route already registered" errors appear in the console

### 1.7 Migration Strategy

The extraction SHALL be performed incrementally, one domain at a time, not as a big-bang refactor.

| Phase | Scope | Gate |
|-------|-------|------|
| Phase 1 | Extract auth middleware (`middleware/auth.ts`) | Typecheck passes, no behavior change |
| Phase 2 | Define `AppContext` interface, wire into existing extracted modules (gym, training, etc.) | Typecheck passes, existing tests green |
| Phase 3a | Extract `auth` domain routes | Contract tests pass |
| Phase 3b | Extract `profile` domain routes | Contract tests pass |
| Phase 3c | Extract `tracking` domain routes | Contract tests pass |
| Phase 3d | Extract `feed` domain routes | Contract tests pass |
| Phase 3e | Merge remaining gym routes into `domains/gym/` | Contract tests pass |
| Phase 3f | Extract `admin` domain routes | Contract tests pass |
| Phase 3g | Merge remaining trainer routes into `domains/trainer/` | Contract tests pass |
| Phase 3h | Extract `dev` domain routes | Contract tests pass |
| Phase 4 | Extract Stripe types into `domains/billing/stripe.ts` | Typecheck passes |
| Phase 5 | Final cleanup — `index.ts` < 500 lines | Full test suite passes |

#### Scenario: Each phase is an atomic commit

- GIVEN each extraction phase
- WHEN the phase is complete
- THEN a single git commit contains all changes for that phase
- AND `git revert` on that commit restores the pre-phase state without conflicts

#### Scenario: Contract tests gate each domain extraction

- GIVEN a domain extraction is complete
- WHEN the full contract test suite runs
- THEN all tests pass before proceeding to the next domain
- AND no domain extraction is skipped if tests fail

---

## Part 2: Design System Components

### 2.1 Tabs Component

#### Props

```typescript
type TabsProps = {
  /** Tab items */
  children: ReactNode;
  /** Default active tab (uncontrolled) */
  defaultValue?: string;
  /** Controlled active tab */
  value?: string;
  /** Controlled change handler */
  onValueChange?: (value: string) => void;
  /** Layout orientation */
  orientation?: "horizontal" | "vertical";
  /** Additional class names */
  className?: string;
};

type TabsListProps = {
  children: ReactNode;
  className?: string;
  /** aria-label for the tablist */
  "aria-label"?: string;
};

type TabsTriggerProps = {
  /** Unique value for this tab */
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

type TabsContentProps = {
  /** Matches a trigger value */
  value: string;
  children: ReactNode;
  className?: string;
  /** If true, unmount content when inactive */
  forceMount?: boolean;
};
```

#### Requirements

The system SHALL provide a `Tabs` component with the following sub-components: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.

#### Scenario: Controlled mode

- GIVEN `<Tabs value="tab-1" onValueChange={fn}>`
- WHEN the user clicks `TabsTrigger value="tab-2"`
- THEN `fn` is called with `"tab-2"`
- AND the component does NOT update its own internal state

#### Scenario: Uncontrolled mode

- GIVEN `<Tabs defaultValue="tab-1">`
- WHEN the user clicks `TabsTrigger value="tab-2"`
- THEN `TabsContent value="tab-2"` becomes visible
- AND `TabsContent value="tab-1"` is hidden

#### Scenario: Keyboard navigation — horizontal

- GIVEN a horizontal `TabsList` with focus on a tab trigger
- WHEN the user presses ArrowRight
- THEN focus moves to the next tab trigger
- AND the focused trigger is NOT automatically activated (roving tabindex)
- WHEN the user presses ArrowLeft
- THEN focus moves to the previous tab trigger

#### Scenario: Keyboard activation

- GIVEN focus is on a tab trigger
- WHEN the user presses Enter or Space
- THEN that tab becomes active

#### Scenario: Disabled tab is not focusable

- GIVEN a `TabsTrigger` with `disabled={true}`
- WHEN navigating via keyboard
- THEN the disabled tab is skipped
- AND it renders with `aria-disabled="true"` and `tabindex="-1"`

#### Scenario: Accessibility — ARIA roles

- GIVEN a rendered `Tabs` component
- WHEN inspecting the DOM
- THEN `TabsList` has `role="tablist"`
- AND each `TabsTrigger` has `role="tab"` and `aria-selected="true/false"`
- AND each `TabsContent` has `role="tabpanel"` and `aria-labelledby` pointing to its trigger

### 2.2 Select Component

#### Props

```typescript
type SelectProps = {
  /** Options list */
  children: ReactNode;
  /** Default selected value (uncontrolled) */
  defaultValue?: string;
  /** Controlled selected value */
  value?: string;
  /** Controlled change handler */
  onValueChange?: (value: string) => void;
  /** Placeholder text when no value selected */
  placeholder?: string;
  /** If true, allows filtering/searching options */
  searchable?: boolean;
  /** If true, allows clearing the selection */
  clearable?: boolean;
  /** Disable the entire select */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
};

type SelectTriggerProps = {
  children: ReactNode;
  className?: string;
};

type SelectContentProps = {
  children: ReactNode;
  className?: string;
  /** Preferred positioning */
  position?: "popper" | "item-aligned";
};

type SelectItemProps = {
  /** Unique value */
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

type SelectGroupProps = {
  children: ReactNode;
  label?: string;
};
```

#### Requirements

The system SHALL provide a `Select` component functioning as a combobox with `listbox` ARIA role.

#### Scenario: Searchable select filters options

- GIVEN `<Select searchable>` with options ["Apple", "Banana", "Cherry"]
- WHEN the user types "ban" in the search input
- THEN only "Banana" is visible in the dropdown
- AND the filtering is case-insensitive

#### Scenario: Keyboard navigation

- GIVEN the Select dropdown is open
- WHEN the user presses ArrowDown
- THEN the next option receives visual focus
- WHEN the user presses ArrowUp
- THEN the previous option receives visual focus
- WHEN the user presses Enter
- THEN the focused option is selected and the dropdown closes
- WHEN the user presses Escape
- THEN the dropdown closes without changing the selection

#### Scenario: Accessibility — listbox role

- GIVEN a rendered `Select` with open dropdown
- WHEN inspecting the DOM
- THEN the dropdown container has `role="listbox"`
- AND each option has `role="option"` and `aria-selected="true/false"`
- AND the trigger has `role="combobox"`, `aria-expanded`, and `aria-haspopup="listbox"`

#### Scenario: Controlled vs uncontrolled

- GIVEN `<Select value="x" onValueChange={fn}>`
- WHEN the user selects "y"
- THEN `fn("y")` is called
- AND the displayed value does NOT change (controlled)
- GIVEN `<Select defaultValue="x">`
- WHEN the user selects "y"
- THEN the displayed value changes to "y" (uncontrolled)

### 2.3 BottomSheet Component

#### Props

```typescript
type BottomSheetProps = {
  /** Whether the sheet is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Sheet content */
  children: ReactNode;
  /** Optional title */
  title?: string;
  /** Optional snap points (as viewport fractions, e.g., [0.5, 0.9]) */
  snapPoints?: number[];
  /** Default snap point index */
  defaultSnapIndex?: number;
  /** If true, swiping down past threshold dismisses */
  swipeToDismiss?: boolean;
  /** If true, clicking overlay dismisses */
  dismissOnOverlay?: boolean;
  /** Additional class names */
  className?: string;
  /** Overlay class names */
  overlayClassName?: string;
};
```

#### Requirements

The system SHALL provide a mobile-first `BottomSheet` component that slides up from the bottom of the viewport.

#### Scenario: Swipe-to-dismiss

- GIVEN an open `BottomSheet` with `swipeToDismiss={true}`
- WHEN the user swipes downward more than 50% of the sheet height
- THEN the sheet animates to closed
- AND `onClose` is called

#### Scenario: Snap points

- GIVEN `<BottomSheet snapPoints={[0.5, 0.9]} defaultSnapIndex={0}>`
- WHEN the sheet opens
- THEN it snaps to 50% viewport height
- WHEN the user drags upward
- THEN it snaps to 90% viewport height
- WHEN the user drags downward past the lowest snap point
- THEN it closes

#### Scenario: Animation

- GIVEN a closed `BottomSheet`
- WHEN `open` transitions from `false` to `true`
- THEN the sheet slides up with a CSS transition (duration ~300ms, ease-out)
- AND the overlay fades in
- WHEN `open` transitions from `true` to `false`
- THEN the sheet slides down and overlay fades out

#### Scenario: Mobile-first layout

- GIVEN a viewport width ≤ 768px
- WHEN the BottomSheet renders
- THEN it occupies full width with horizontal padding
- AND touch gestures (swipe) take priority over scroll within the sheet body

#### Scenario: Accessibility

- GIVEN an open `BottomSheet`
- WHEN inspecting the DOM
- THEN the sheet container has `role="dialog"` and `aria-modal="true"`
- AND focus is trapped inside the sheet
- AND pressing Escape closes the sheet

### 2.4 DateRangePicker Component

#### Props

```typescript
type DateRangePickerProps = {
  /** Selected start date (controlled) */
  startDate?: Date | null;
  /** Selected end date (controlled) */
  endDate?: Date | null;
  /** Change handler */
  onRangeChange?: (range: { start: Date | null; end: Date | null }) => void;
  /** Default range (uncontrolled) */
  defaultStartDate?: Date | null;
  /** Default end date (uncontrolled) */
  defaultEndDate?: Date | null;
  /** Preset date ranges */
  presets?: Array<{ label: string; start: Date; end: Date }>;
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Number of months to display simultaneously */
  numberOfMonths?: 1 | 2;
  /** Locale for formatting */
  locale?: string;
  /** Additional class names */
  className?: string;
  /** Disable the picker */
  disabled?: boolean;
};
```

#### Requirements

The system SHALL provide a `DateRangePicker` component with calendar view and preset support.

#### Scenario: Two-month calendar view

- GIVEN `<DateRangePicker numberOfMonths={2}>`
- WHEN the picker opens
- THEN two adjacent months are displayed side by side
- AND navigation arrows move forward/backward by one month

#### Scenario: Range selection by clicking

- GIVEN the calendar is open with no selection
- WHEN the user clicks March 10
- THEN March 10 becomes the start date (highlighted)
- AND the component waits for the end date
- WHEN the user clicks March 15
- THEN the range [March 10, March 15] is highlighted
- AND `onRangeChange` is called with `{ start: March 10, end: March 15 }`

#### Scenario: Preset selection

- GIVEN `<DateRangePicker presets={[{ label: "Last 7 days", start: ..., end: ... }]}>`
- WHEN the user clicks the "Last 7 days" preset button
- THEN both start and end dates are set to the preset values
- AND the calendar view navigates to show the selected range

#### Scenario: Keyboard navigation

- GIVEN the calendar is focused
- WHEN the user presses ArrowRight
- THEN the focused date moves one day forward
- WHEN the user presses ArrowDown
- THEN the focused date moves one week forward
- WHEN the user presses Enter
- THEN the focused date is selected (as start or end depending on state)

#### Scenario: Accessibility

- GIVEN a rendered `DateRangePicker`
- WHEN inspecting the DOM
- THEN each calendar grid has `role="grid"`
- AND each day cell has `role="gridcell"` and `aria-selected="true/false"`
- AND the month heading has `role="heading"` with `aria-live="polite"`
- AND the picker trigger has `aria-haspopup="dialog"` and `aria-expanded`

---

## Part 3: CSS Variable Consolidation

### 3.1 Namespace Unification

The system SHALL consolidate all CSS variable namespaces into a single `--theme-*` namespace.

| Current Namespace | New Namespace | Notes |
|-------------------|---------------|-------|
| `--fs-*` | `--theme-*` | Primary FitSculpt namespace — rename |
| `--dni-*` | `--theme-*` | Legacy namespace — rename |
| `--brand-*` | `--theme-*` | Brand namespace — rename |

#### Backward Compatibility

The system SHALL provide `--theme-*` aliases for all existing `--fs-*`, `--dni-*`, and `--brand-*` variables so that any component still referencing the old namespaces continues to work during the migration.

```css
/* Backward-compat aliases (generated from audit) */
:root {
  --fs-primary: var(--theme-primary);
  --dni-text: var(--theme-text);
  --brand-accent: var(--theme-accent);
  /* ... all other mappings ... */
}
```

#### Scenario: Existing CSS still compiles

- GIVEN a component using `color: var(--fs-primary)`
- WHEN the stylesheet is compiled
- THEN the value resolves correctly via the alias `--fs-primary → --theme-primary`
- AND no visual regressions occur

#### Scenario: New code uses --theme-* namespace

- GIVEN a newly created design system component
- WHEN its CSS is written
- THEN it uses only `--theme-*` variables
- AND no `--fs-*`, `--dni-*`, or `--brand-*` references appear

#### Scenario: Dark/light theme switching

- GIVEN a user toggles between light and dark themes
- WHEN the `data-theme="dark"` attribute is set on `:root`
- THEN all `--theme-*` variables update to dark values
- AND backward-compat aliases also resolve correctly
- AND no flash of unstyled content occurs

### 3.2 Variable Audit and Mapping

Before consolidation, the system SHALL:

1. Grep all usages of `--fs-*`, `--dni-*`, `--brand-*` across the codebase
2. Map each to a canonical `--theme-*` name
3. Generate the backward-compat alias file
4. Replace source usages incrementally (can be done per-component)

#### Scenario: Zero orphaned variables after migration

- GIVEN the full migration is complete
- WHEN grepping for `var(--fs-`, `var(--dni-`, `var(--brand-`
- THEN zero results are found in `.css`, `.scss`, `.tsx`, `.ts` source files
- AND the alias file exists only for third-party or edge-case usage

---

## Part 4: Storybook Setup

### 4.1 Configuration

The system SHALL set up Storybook using `@storybook/react-vite` matching the project's Vite build toolchain.

```
.storybook/
├── main.ts          # Storybook config (framework, addons, stories glob)
├── preview.ts       # Global decorators, parameters, theme setup
└── theme.ts         # Custom Storybook theme (FitSculpt branding)
```

#### Scenario: Storybook builds without errors

- GIVEN Storybook is installed and configured
- WHEN running `npx storybook dev`
- THEN the dev server starts on port 6006
- AND all existing component stories render without console errors

#### Scenario: New components have stories

- GIVEN Tabs, Select, BottomSheet, DateRangePicker are implemented
- WHEN Storybook loads
- THEN each component has at least one story file
- AND stories cover: default, controlled, disabled, and edge-case states

### 4.2 Existing Component Stories

The system SHOULD add stories for key existing components: Button, Modal, Input, Card, DropdownMenu, SegmentedControl.

#### Scenario: Existing components are documented

- GIVEN Storybook sidebar
- WHEN browsing component categories
- THEN Button, Modal, Input, Card, DropdownMenu, SegmentedControl all appear
- AND each story demonstrates its primary variants

---

## Part 5: Out of Scope

The following are explicitly OUT OF SCOPE for this change:

1. **Shared types package** (`packages/shared/`) — deferred to a follow-up change
2. **Contract test infrastructure changes** — the `contractTestServer.ts` pattern remains unchanged
3. **Removal or modification of already-extracted domain modules** beyond adding typed `AppContext`
4. **Removal of v1 endpoints or API contract changes** — all existing endpoints keep their current URLs and response shapes
5. **Visual regression testing** — requires Storybook to be set up first (this change sets up Storybook, but visual regression tests are a follow-up)
6. **Database schema changes** — no Prisma migrations are part of this change
7. **Performance optimization** — the goal is structural improvement, not runtime performance
8. **Mobile-native components** — only web (React) components are in scope
