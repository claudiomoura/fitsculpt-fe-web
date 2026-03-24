# Technical Design: Backend Decomposition + Design System Completion

## Overview

This document details the technical design for decomposing the 10,368-line `index.ts` monolith into domain modules and completing the design system with 4 new components.

**Prerequisites**: proposal.md, specs/main.md  
**Tech Stack**: Next.js 16, Fastify 5.7, Tailwind CSS v4

---

## Sprint 5: Backend Decomposition

### 1. AppContext Interface

Full TypeScript definition replacing the `deps: Record<string, any>` pattern:

```typescript
// apps/api/src/types/appContext.ts

import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export interface AppContext {
  // Core dependencies
  prisma: PrismaClient;
  app: FastifyInstance;
  env: Record<string, string | undefined>;
  log: FastifyInstance["log"];
  
  // Error handling
  handleRequestError: (reply: FastifyReply, error: unknown) => Promise<never>;
  createHttpError: (status: number, code: string, debug?: Record<string, unknown>) => Error & { statusCode: number; code: string };

  // Auth middleware (extracted to middleware/auth.ts)
  normalizeToken: (request: FastifyRequest) => Promise<string | null>;
  requireUser: (request: FastifyRequest, options?: { logContext?: string }) => Promise<UserWithRole>;
  requireAdmin: (request: FastifyRequest) => Promise<UserWithRole>;
  isGlobalAdminUser: (user: { role: string; email: string }) => boolean;
  requireCompleteProfile: (userId: string) => Promise<void>;

  // Gym helpers
  requireGymManagerAccess: (user: { id: string }, gymId: string) => Promise<void>;
  requireGymManagerForGym: (user: { id: string }, gymId: string) => Promise<void>;
  requireActiveGymManagerMembership: (userId: string) => Promise<{ gymId: string; role: string }>;

  // AI entitlements
  getUserEntitlements: (user: User) => EffectiveEntitlements;
  aiAccessGuard: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  aiStrengthDomainGuard: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  aiNutritionDomainGuard: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

  // Utilities
  parseDateInput: (input: string) => Date | null;
  buildDateRange: (startDate: Date, daysCount: number) => string[];
  parseClientMetrics: (data: unknown) => Record<string, unknown>;
  toDateKey: () => string;
  getSecondsUntilNextUtcDay: () => number;

  // AI-specific
  getEffectiveTokenBalance: (user: User) => number;
  getAiTokenPayload: (user: User, entitlements: EffectiveEntitlements) => AiTokenPayload;
  getEstimatedAiFeatureTokens: (feature: string) => number;
  assertSufficientAiTokenBalance: (user: User, required: number) => void;
  enforceAiQuota: (params: { id: string; plan: string }) => Promise<void>;
  loadExerciseCatalogForAi: () => Promise<ExerciseCatalogItem[]>;
  
  // Cache
  getCachedAiPayload: (key: string) => Promise<unknown>;
  saveCachedAiPayload: (key: string, type: string, payload: unknown) => Promise<void>;

  // AI schemas (from existing index.ts)
  aiTrainingSchema: z.ZodType<AiTrainingInput>;
  aiNutritionSchema: z.ZodType<AiNutritionInput>;
  aiGenerateTrainingSchema: z.ZodType<AiTrainingGenerateInput>;
  aiTipSchema: z.ZodType<AiTipInput>;
  trainingPlanJsonSchema: object;
  nutritionPlanJsonSchema: object;
  aiTrainingPlanResponseSchema: z.ZodType;
  aiNutritionPlanResponseSchema: z.ZodType;

  // Builders (extracted from index.ts)
  buildTrainingPrompt: (data: AiTrainingInput, isRetry: boolean, catalog: string) => string;
  buildNutritionPrompt: (data: AiNutritionInput, recipes: RecipeCatalogItem[], isRetry: boolean) => string;
  buildTrainingTemplate: (data: AiTrainingInput, catalog: ExerciseCatalogItem[]) => TrainingPlanTemplate | null;
  buildNutritionTemplate: (data: AiNutritionInput) => NutritionPlanTemplate | null;
  buildDeterministicTrainingFallbackPlan: (params: TrainingParams, catalog: ExerciseCatalogItem[]) => TrainingPlan;

  // Parsers & validators
  parseTrainingPlanPayload: (payload: unknown, startDate: Date, daysCount: number, daysPerWeek: number) => TrainingPlan;
  parseNutritionPlanPayload: (payload: unknown, startDate: Date, daysCount: number) => NutritionPlan;
  assertTrainingMatchesRequest: (plan: TrainingPlan, expectedDays: number) => void;
  assertNutritionMatchesRequest: (plan: NutritionPlan, mealsPerDay: number, daysCount: number) => void;
  assertTrainingLevelConsistency: (plan: TrainingPlan, level: string) => void;
  
  // Resolution
  resolveTrainingPlanExerciseIds: (plan: TrainingPlan, catalog: ExerciseCatalogItem[]) => TrainingPlan;
  resolveTrainingPlanWithDeterministicFallback: (plan: TrainingPlan, catalog: ExerciseCatalogItem[], params: TrainingParams, startDate: Date, logContext: { userId: string; route: string }) => TrainingPlan;
  resolveNutritionPlanRecipeIds: (plan: NutritionPlan, catalog: NutritionRecipeCatalogItem[]) => NutritionPlan;
  applyPersonalization: <T extends TrainingPlan | NutritionPlan>(plan: T, context: { name?: string }) => T;
  
  // Normalizers
  normalizeTrainingPlanDays: (template: TrainingPlanTemplate, startDate: Date, daysCount: number, daysPerWeek: number) => TrainingPlan;
  normalizeNutritionPlanDays: (template: NutritionPlanTemplate, startDate: Date, daysCount: number) => NutritionPlan;
  normalizeTrainingMealsPerDay: (plan: NutritionPlan, mealsPerDay: number) => NutritionPlan;
  normalizeExercisePayload: (payload: unknown) => ExerciseApiDto;
  
  // AI response processing
  extractTopLevelJson: (text: string) => Record<string, unknown>;
  callOpenAi: (prompt: string, attempt: number, parser: ParserFn, options: OpenAiOptions) => Promise<OpenAiResponse>;
  formatExerciseCatalogForPrompt: (catalog: ExerciseCatalogItem[]) => string;

  // Charging
  aiPricing: AiPricing;
  chargeAiUsage: (params: ChargeAiUsageParams) => Promise<void>;
  chargeAiUsageForResult: (params: ChargeAiUsageForResultParams) => Promise<ChargeResult>;
  extractExactProviderUsage: (usage: unknown) => AiUsageSummary | null;
  persistAiUsageLog: (params: PersistAiUsageLogParams) => Promise<void>;
  buildUsageTotals: (usage: unknown) => AiUsageSummary;

  // Storage
  storeAiContent: (userId: string, feature: string, mode: string, data: unknown) => Promise<void>;
  saveTrainingPlan: (prisma: PrismaClient, userId: string, plan: TrainingPlan, startDate: Date, daysCount: number, input: AiTrainingInput) => Promise<{ id: string }>;
  saveNutritionPlan: (prisma: PrismaClient, userId: string, plan: NutritionPlan, startDate: Date, daysCount: number) => Promise<{ id: string }>;
  
  // AI Error handling
  classifyAiGenerateError: (error: unknown) => ClassifiedError;

  // Enums
  enums: {
    GymMembershipStatus: Record<string, string>;
    GymRole: Record<string, string>;
    SubscriptionPlan: Record<string, string>;
  };
}

type UserWithRole = {
  id: string;
  email: string;
  role: string;
  [key: string]: unknown;
};
```

### 2. Domain Module Architecture

Plugin pattern with typed context:

```
apps/api/src/
├── index.ts                    # < 500 lines - app setup only
├── types/
│   └── appContext.ts           # Typed AppContext interface
├── middleware/
│   └── auth.ts                 # Extracted auth middleware
└── domains/
    ├── auth/                   # NEW
    │   ├── registerAuthRoutes.ts
    │   ├── handlers/
    │   │   ├── signup.ts
    │   │   ├── login.ts
    │   │   ├── logout.ts
    │   │   ├── verifyEmail.ts
    │   │   ├── googleOAuth.ts
    │   │   └── me.ts
    │   └── schemas.ts          # Auth-specific Zod schemas
    ├── profile/                # NEW
    │   └── registerProfileRoutes.ts
    ├── tracking/               # NEW
    │   └── registerTrackingRoutes.ts
    ├── feed/                  # NEW
    │   └── registerFeedRoutes.ts
    ├── gym/                   # EXISTING - merge remaining
    │   └── registerGymRoutes.ts
    ├── admin/                 # NEW
    │   └── registerAdminRoutes.ts
    ├── trainer/               # EXISTING - merge remaining
    │   └── registerTrainerRoutes.ts
    ├── dev/                   # NEW
    │   └── registerDevRoutes.ts
    ├── ai/                    # EXISTING
    │   └── registerAiRoutes.ts
    ├── billing/               # EXISTING
    │   ├── registerBillingRoutes.ts
    │   └── stripe.ts          # Extracted Stripe types
    ├── training/              # EXISTING
    │   ├── registerWorkoutRoutes.ts
    │   └── registerTrainingRoutes.ts
    └── nutrition/             # EXISTING
        └── registerNutritionRoutes.ts
```

Each domain module follows this pattern:

```typescript
// domains/auth/registerAuthRoutes.ts

import type { FastifyInstance } from "fastify";
import type { AppContext } from "../../types/appContext.js";

export function registerAuthRoutes(app: FastifyInstance, ctx: AppContext): void {
  const { prisma, requireUser, createHttpError, handleRequestError, env } = ctx;
  
  // Handlers use ctx instead of deps
  app.post("/auth/login", async (request, reply) => {
    // Implementation
  });
}
```

### 3. Route Mapping: 87 Inline Routes → Domain Modules

| Domain | File | Routes | Line Range (index.ts) |
|--------|------|--------|---------------------|
| health | index.ts | GET /health | 243 |
| auth | domains/auth/ | POST /auth/signup, POST /auth/register, POST /auth/login, POST /auth/logout, POST /auth/resend-verification, GET /auth/verify-email, GET /auth/me, POST /auth/change-password, GET /auth/google/start, GET /auth/google/callback, POST /auth/forgot-password, POST /auth/reset-password | 5453-6320 |
| profile | domains/profile/ | GET /profile, PUT /profile | 6324-6500 |
| tracking | domains/tracking/ | GET /tracking, PUT /tracking, POST /tracking, DELETE /tracking/:collection/:id | 6527-6790 |
| feed | domains/feed/ | GET /feed, POST /feed/generate | 6798-7220 |
| nutrition-plans | domains/nutrition/ | GET /nutrition-plans, GET /nutrition-plans/:id, GET /members/me/assigned-nutrition-plan | 7223-7470 |
| recipes | domains/nutrition/ | GET /recipes, GET /recipes/:id | 7471-7760 |
| trainer/gym | domains/trainer/ | GET /trainer/gym, PATCH /trainer/gym | 7760-7820 |
| gyms | domains/gym/ | GET /gyms, POST /gyms/join, POST /gyms/join-by-code, GET /gyms/membership, POST /gym/join-code, DELETE /gyms/membership | 7820-8100 |
| admin/gym-join-requests | domains/admin/ | GET /admin/gym-join-requests, POST /admin/gym-join-requests/:membershipId/accept, POST /admin/gym-join-requests/:membershipId/reject | 8072-8300 |
| admin/gym-members | domains/admin/ | GET /admin/gyms/:gymId/members, PATCH /admin/gyms/:gymId/members/:userId/role | 8240-8480 |
| trainer/nutrition-plans | domains/trainer/ | GET /trainer/nutrition-plans, POST /trainer/nutrition-plans, GET /trainer/nutrition-plans/:id, PATCH/PUT /trainer/nutrition-plans/:id | 8279-8695 |
| trainer/plans | domains/trainer/ | GET /trainer/plans, POST /trainer/plans, GET /trainer/plans/:planId, PATCH /trainer/plans/:planId, DELETE /trainer/plans/:planId | 8695-8960 |
| trainer/plans/days | domains/trainer/ | DELETE /trainer/plans/:planId/days/:dayId, POST /trainer/plans/:planId/days/:dayId/exercises | 8986-9080 |
| trainer/plans/exercises | domains/trainer/ | PATCH /trainer/plans/:planId/days/:dayId/exercises/:exerciseId, DELETE /trainer/plans/:planId/days/:dayId/exercises/:exerciseId | 9080-9130 |
| trainer/clients/plans | domains/trainer/ | POST /trainer/clients/:userId/assigned-plan, GET /trainer/clients/:userId/assigned-plan, DELETE /trainer/clients/:userId/assigned-plan | 9210-9280 |
| trainer/clients/nutrition | domains/trainer/ | POST /trainer/clients/:userId/assigned-nutrition-plan | 9290-9340 |
| trainer/members | domains/trainer/ | POST /trainer/members/:id/training-plan-assignment, DELETE /trainer/members/:id/training-plan-assignment | 9337-9405 |
| trainer/clients | domains/trainer/ | GET /trainer/clients, GET /trainer/clients/:userId, DELETE /trainer/clients/:userId | 9401-9555 |
| trainer/recipes | domains/trainer/ | GET /trainer/recipes, POST /trainer/recipes, GET /trainer/recipes/:id, PUT /trainer/recipes/:id, DELETE /trainer/recipes/:id | 9575-9695 |
| admin/gyms | domains/admin/ | POST /admin/gyms, GET /admin/gyms, DELETE /admin/gyms/:gymId | 9695-9770 |
| admin/gym-role | domains/admin/ | PATCH /admin/gyms/:gymId/members/:userId/role, PATCH /gym/admin/members/:userId/role | 9801-9850 |
| admin/users | domains/admin/ | GET /admin/users, POST /admin/users | 9904-10020 |
| admin/user-actions | domains/admin/ | POST /admin/users/:id/verify-email, POST /admin/users/:id/reset-password, PATCH /admin/users/:id/block, PATCH /admin/users/:id/unblock, PATCH /admin/users/:id/plan, PATCH /admin/users/:id/tokens, PATCH /admin/users/:id/tokens-allowance, POST /admin/users/:id/tokens/add, PATCH /admin/users/:id/tokens/balance, DELETE /admin/users/:id | 10020-10250 |
| dev | domains/dev/ | POST /dev/seed-exercises, POST /dev/seed-recipes, POST /dev/reset-demo | 10253-10368 |

### 4. Auth Middleware Extraction Design

```
apps/api/src/middleware/auth.ts
```

```typescript
import type { FastifyRequest, FastifyReply } from "fastify";
import type { User } from "@prisma/client";

export interface AuthUser extends User {
  role: string;
}

export async function normalizeToken(request: FastifyRequest): Promise<string | null> {
  // Workaround 1: Check Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader) {
    // Handle quoted tokens: "Bearer abc123" → abc123
    const match = authHeader.match(/Bearer\s+"?([^"]+)"?/);
    if (match) return match[1].trim();
  }
  
  // Workaround 2: Check fs_token cookie
  const cookieToken = request.cookies.fs_token;
  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return cookieToken;
  }
  
  // Workaround 3: Check ?token= query param
  const queryToken = request.query?.token;
  if (typeof queryToken === "string" && queryToken.length > 0) {
    return queryToken;
  }
  
  return null;
}

export async function requireUser(
  request: FastifyRequest,
  options?: { logContext?: string }
): Promise<AuthUser> {
  const token = await normalizeToken(request);
  if (!token) {
    throw createHttpError(401, "UNAUTHORIZED", { reason: "no_token" });
  }
  
  try {
    const decoded = await request.jwtVerify<{ sub: string; email: string; role: string }>();
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });
    
    if (!user || user.deletedAt) {
      throw createHttpError(401, "UNAUTHORIZED", { reason: "user_not_found" });
    }
    
    if (user.isBlocked) {
      throw createHttpError(403, "USER_BLOCKED");
    }
    
    return user as AuthUser;
  } catch (err) {
    if (err.statusCode === 401) throw err;
    throw createHttpError(401, "UNAUTHORIZED", { reason: "invalid_token" });
  }
}

export async function requireAdmin(request: FastifyRequest): Promise<AuthUser> {
  const user = await requireUser(request);
  
  if (user.role !== "ADMIN") {
    throw createHttpError(403, "FORBIDDEN", { reason: "admin_required" });
  }
  
  return user;
}

export function isGlobalAdminUser(user: { role: string; email: string }): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()) ?? [];
  return user.role === "ADMIN" || adminEmails.includes(user.email);
}
```

### 5. Stripe Extraction Design

```
apps/api/src/domains/billing/stripe.ts
```

```typescript
// Extracted from index.ts:137-200

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
  customer?: string | null;
  subscription?: string | null;
}

export interface StripePortalSession {
  id: string;
  url: string;
}

export interface StripeSubscription {
  id: string;
  customer: string;
  status: "active" | "canceled" | "past_due" | "trialing" | "incomplete" | "incomplete_expired";
  current_period_end: number | null;
  items?: {
    data?: Array<{
      current_period_end?: number | null;
      price?: {
        id?: string | null;
      } | null;
    }>;
  };
}

export interface StripeInvoiceLineItem {
  price?: {
    id?: string | null;
  } | null;
}

export interface StripeInvoice {
  id: string;
  customer?: string | null;
  subscription?: string | null;
  lines?: {
    data?: StripeInvoiceLineItem[];
  };
}

export interface StripeSubscriptionList {
  data: StripeSubscription[];
}

export interface StripeCustomer {
  id: string;
  email?: string;
  subscriptions?: {
    data: StripeSubscription[];
  };
}

export interface StripeProduct {
  id: string;
  name?: string | null;
}

export interface StripePrice {
  id: string;
  currency: string;
  unit_amount: number | null;
  recurring?: {
    interval?: "day" | "week" | "month" | "year" | null;
  } | null;
  product?: string | StripeProduct | null;
}

export type StripeInterval = "day" | "week" | "month" | "year" | "unknown";

// Helper functions
export function parseStripeAmount(price: StripePrice): number | null {
  if (typeof price.unit_amount !== "number") return null;
  return price.unit_amount / 100;
}

export function getStripePricePlanMap(env: Record<string, string | undefined>): Map<string, SubscriptionPlan> {
  const prices = [
    { priceId: env.STRIPE_PRO_PRICE_ID, plan: "PRO" as const },
    { priceId: env.STRIPE_PRICE_STRENGTH_AI_MONTHLY, plan: "STRENGTH_AI" as const },
    { priceId: env.STRIPE_PRICE_NUTRI_AI_MONTHLY, plan: "NUTRI_AI" as const },
  ];
  return new Map(prices.filter((e): e is typeof e & { priceId: string } => typeof e.priceId === "string").map(e => [e.priceId, e.plan]));
}

export function resolvePlanByPriceId(priceId: string, pricePlanMap: Map<string, SubscriptionPlan>): SubscriptionPlan | null {
  return pricePlanMap.get(priceId) ?? null;
}
```

### 6. index.ts Target Structure

```typescript
// apps/api/src/index.ts - TARGET: < 500 lines

import "dotenv/config";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import jwt from "@fastify/jwt";
import { createPrismaClientWithRetry, resolveDatabaseUrl } from "./prismaClient.js";
import { runDatabasePreflight } from "./dbPreflight.js";
import { getEnv } from "./config.js";

// Domain registrations
import { registerAuthRoutes } from "./domains/auth/registerAuthRoutes.js";
import { registerProfileRoutes } from "./domains/profile/registerProfileRoutes.js";
import { registerTrackingRoutes } from "./domains/tracking/registerTrackingRoutes.js";
import { registerFeedRoutes } from "./domains/feed/registerFeedRoutes.js";
import { registerGymRoutes } from "./domains/gym/registerGymRoutes.js";
import { registerAdminRoutes } from "./domains/admin/registerAdminRoutes.js";
import { registerTrainerRoutes } from "./domains/trainer/registerTrainerRoutes.js";
import { registerDevRoutes } from "./domains/dev/registerDevRoutes.js";
import { registerAiRoutes } from "./domains/ai/registerAiRoutes.js";
import { registerBillingRoutes } from "./domains/billing/registerBillingRoutes.js";
import { registerWorkoutRoutes } from "./domains/training/registerWorkoutRoutes.js";
import { registerTrainingRoutes } from "./domains/training/registerTrainingRoutes.js";
import { registerNutritionRoutes } from "./domains/nutrition/registerNutritionRoutes.js";

// Middleware
import { buildEntitlementGuard, resolveUserEntitlements } from "./middleware/entitlements.js";
import { normalizeToken, requireUser, requireAdmin, isGlobalAdminUser } from "./middleware/auth.js";

// Types
import type { AppContext } from "./types/appContext.js";

const env = getEnv();
const app = Fastify({ logger: true });
const prisma = await createPrismaClientWithRetry(app.log);

// Database preflight
if (process.env.NODE_ENV !== "production" || process.env.DB_PREFLIGHT_ON_BOOT === "true") {
  const { source, host, database } = resolveDatabaseUrl();
  await runDatabasePreflight(prisma, app.log, { source, host, database });
}

// Plugins
await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
await app.register(cookie, { secret: env.COOKIE_SECRET });
await app.register(jwt, {
  secret: env.JWT_SECRET,
  cookie: { cookieName: "fs_token", signed: false },
});

// Content-type parser for Stripe webhook
app.addContentTypeParser("application/json", { parseAs: "buffer" }, (request, body, done) => {
  if (request.url?.startsWith("/billing/stripe/webhook")) {
    done(null, body);
    return;
  }
  if (body.length === 0) {
    done(null, null);
    return;
  }
  try {
    done(null, JSON.parse(body.toString("utf8")));
  } catch (error) {
    done(error as Error, undefined);
  }
});

// Correlation ID & logging hooks
app.addHook("onRequest", async (request, reply) => {
  const correlationId = request.headers["x-correlation-id"] ?? request.id;
  (request as FastifyRequest & { startTimeMs?: number }).startTimeMs = Date.now();
  reply.header("x-correlation-id", correlationId);
});

app.addHook("onResponse", async (request, reply) => {
  const durationMs = Date.now() - ((request as FastifyRequest & { startTimeMs?: number }).startTimeMs ?? 0);
  app.log.info({
    route: request.routeOptions?.url ?? request.url,
    method: request.method,
    status: reply.statusCode,
    durationMs,
  }, "request completed");
});

// Helper functions (minimal - delegated to domains)
function createHttpError(statusCode: number, code: string, debug?: Record<string, unknown>) {
  const error = new Error(code) as Error & { statusCode: number; code: string; debug?: Record<string, unknown> };
  error.statusCode = statusCode;
  error.code = code;
  error.debug = debug;
  return error;
}

function handleRequestError(reply: FastifyReply, error: unknown) {
  if (error instanceof z.ZodError) {
    return reply.status(400).send({ error: "INVALID_INPUT", details: error.flatten() });
  }
  const typed = error as { statusCode?: number; code?: string; debug?: Record<string, unknown> };
  // ... error handling delegation ...
  app.log.error({ err: error }, "unhandled error");
  return reply.status(500).send({ error: "INTERNAL_ERROR" });
}

// Build AppContext
const ctx: AppContext = buildAppContext({
  prisma,
  app,
  env: process.env,
  log: app.log,
  createHttpError,
  handleRequestError,
  // ... all dependencies ...
});

// Health check
app.get("/health", async () => ({ status: "ok" }));

// Register all domain routes
registerAuthRoutes(app, ctx);
registerProfileRoutes(app, ctx);
registerTrackingRoutes(app, ctx);
registerFeedRoutes(app, ctx);
registerGymRoutes(app, ctx);
registerAdminRoutes(app, ctx);
registerTrainerRoutes(app, ctx);
registerDevRoutes(app, ctx);
registerAiRoutes(app, ctx);
registerBillingRoutes(app, ctx);
registerWorkoutRoutes(app, ctx);
registerTrainingRoutes(app, ctx);
registerNutritionRoutes(app, ctx);

// Start server
const PORT = parseInt(process.env.PORT ?? "3000", 10);
await app.listen({ port: PORT, host: "0.0.0.0" });

// --- Helper function to build AppContext ---
function buildAppContext(deps: Record<string, unknown>): AppContext {
  const isBootstrapAdmin = (email: string) => {
    const adminEmails = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()) ?? [];
    return adminEmails.includes(email);
  };
  
  // Build and return typed AppContext
  return {
    prisma: deps.prisma as PrismaClient,
    app: deps.app as FastifyInstance,
    env: deps.env as Record<string, string | undefined>,
    log: deps.log as AppLogger,
    handleRequestError: deps.handleRequestError as AppContext["handleRequestError"],
    createHttpError: deps.createHttpError as AppContext["createHttpError"],
    // ... map all deps to AppContext properties
  };
}
```

### 7. Migration Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND DECOMPOSITION PIPELINE                        │
├──────────┬─────────────────────────────────────────┬───────────────────────┤
│  Phase   │              Scope                       │       Gate           │
├──────────┼─────────────────────────────────────────┼───────────────────────┤
│    1     │ Extract auth middleware                   │ Typecheck + tests   │
│          │ • normalizeToken                          │                      │
│          │ • requireUser                             │                      │
│          │ • requireAdmin                            │                      │
│          │ • isGlobalAdminUser                       │                      │
├──────────┼─────────────────────────────────────────┼───────────────────────┤
│    2     │ Define AppContext interface               │ Typecheck passes    │
│          │ • Create types/appContext.ts              │                      │
│          │ • Add AppContext to existing domains      │                      │
│          │ • Update index.ts to build ctx            │                      │
├──────────┼─────────────────────────────────────────┼───────────────────────┤
│   3a     │ Extract auth domain                       │ Contract tests      │
│          │ • POST /auth/* (13 routes)                │                      │
├──────────┼─────────────────────────────────────────┼───────────────────────┤
│   3b     │ Extract profile domain                    │ Contract tests      │
│          │ • GET/PUT /profile (2 routes)             │                      │
├──────────┼─────────────────────────────────────────┼───────────────────────┤
│   3c     │ Extract tracking domain                   │ Contract tests      │
│          │ • GET/PUT/POST/DELETE /tracking (4 routes)│                      │
├──────────┼─────────────────────────────────────────┼───────────────────────┤
│   3d     │ Extract feed domain                       │ Contract tests      │
│          │ • GET/POST /feed (2 routes)               │                      │
├──────────┼─────────────────────────────────────────┼───────────────────────┤
│   3e     │ Merge gym routes into domains/gym/        │ Contract tests      │
│          │ • GET/POST /gyms/* (8 routes)             │                      │
│          │ • GET/POST /admin/gym-* (8 routes)        │                      │
├──────────┼─────────────────────────────────────────┼───────────────────────┤
│   3f     │ Extract admin domain                      │ Contract tests      │
│          │ • CRUD /admin/users (18 routes)           │                      │
│          │ • CRUD /admin/gyms (4 routes)             │                      │
├──────────┼─────────────────────────────────────────┼───────────────────────┤
│   3g     │ Merge trainer routes into domains/trainer/│ Contract tests     │
│          │ • GET/POST /trainer/* (22 routes)         │                      │
├──────────┼─────────────────────────────────────────┼───────────────────────┤
│   3h     │ Extract dev domain                        │ Contract tests      │
│          │ • POST /dev/* (3 routes)                  │                      │
├──────────┼─────────────────────────────────────────┼───────────────────────┤
│    4     │ Extract Stripe types                      │ Typecheck passes    │
│          │ • Move to domains/billing/stripe.ts       │                      │
├──────────┼─────────────────────────────────────────┼───────────────────────┤
│    5     │ Final cleanup                             │ Full test suite     │
│          │ • index.ts < 500 lines                    │                      │
│          │ • No inline route handlers                │                      │
└──────────┴─────────────────────────────────────────┴───────────────────────┘
```

### 8. DI Pattern

```
                         ┌─────────────────┐
                         │   index.ts      │
                         │  (composition)  │
                         └────────┬────────┘
                                  │ builds AppContext
                                  ▼
┌──────────────────────────────────────────────────────────────┐
│                     AppContext (typed)                        │
│  { prisma, app, env, createHttpError, requireUser, ... }    │
└──────────────────────────────────────────────────────────────┘
                                  │
          ┌───────────┬───────────┼───────────┬───────────┐
          ▼           ▼           ▼           ▼           ▼
    ┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐
    │  auth/   ││ profile/ ││ tracking ││   feed   ││  admin/  │
    │register..││register..││register..││register..││register..│
    └──────────┘└──────────┘└──────────┘└──────────┘└──────────┘
```

---

## Sprint 6: Design System Completion

### 9. Tabs Component Design

```
apps/web/src/design-system/components/Tabs/
├── Tabs.tsx
├── TabsList.tsx
├── TabsTrigger.tsx
├── TabsContent.tsx
├── Tabs.module.css
└── index.ts
```

**Props Interface:**

```typescript
// Tabs.tsx
import type { ReactNode } from "react";

export interface TabsProps {
  children: ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export interface TabsListProps {
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}

export interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
  forceMount?: boolean;
}
```

**Keyboard Navigation (WAI-ARIA):**

- `ArrowRight` / `ArrowLeft`: Move focus between tabs (horizontal)
- `ArrowDown` / `ArrowUp`: Move focus between tabs (vertical)
- `Home`: Focus first tab
- `End`: Focus last tab
- `Enter` / `Space`: Activate focused tab
- `Tab`: Leave tab list, enter tabpanel

**Implementation Pattern:**

```tsx
// Simplified implementation
function Tabs({ children, defaultValue, value, onValueChange, orientation = "horizontal" }: TabsProps) {
  const [activeValue, setActiveValue] = useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : activeValue;

  const handleTabActivate = (newValue: string) => {
    if (!isControlled) setActiveValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <div className="tabs-root" data-orientation={orientation}>
      {Children.map(children, child => 
        cloneElement(child, { 
          activeValue: currentValue, 
          onActivate: handleTabActivate 
        })
      )}
    </div>
  );
}
```

### 10. Select Component Design

```
apps/web/src/design-system/components/Select/
├── Select.tsx
├── SelectTrigger.tsx
├── SelectContent.tsx
├── SelectItem.tsx
├── SelectGroup.tsx
├── SelectLabel.tsx
├── SelectSeparator.tsx
├── Select.module.css
└── index.ts
```

**Props Interface:**

```typescript
export interface SelectProps {
  children: ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  name?: string;
  required?: boolean;
}

export interface SelectTriggerProps {
  children: ReactNode;
  className?: string;
}

export interface SelectContentProps {
  children: ReactNode;
  className?: string;
  position?: "popper" | "item-aligned";
  sideOffset?: number;
}

export interface SelectItemProps {
  value: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

export interface SelectGroupProps {
  children: ReactNode;
  label?: string;
}
```

**Accessibility (ARIA combobox pattern):**

- Trigger: `role="combobox"`, `aria-expanded`, `aria-haspopup="listbox"`, `aria-readonly`
- Content: `role="listbox"`, `aria-orientation="vertical"`
- Item: `role="option"`, `aria-selected`

**Search Implementation:**

```tsx
function SelectContent({ children, searchable, position = "popper" }: SelectContentProps) {
  const [search, setSearch] = useState("");
  
  const filteredChildren = useMemo(() => {
    if (!searchable || !search) return children;
    return Children.map(children, child => {
      if (!isSelectItem(child)) return child;
      const itemText = getSelectItemText(child);
      return itemText.toLowerCase().includes(search.toLowerCase()) ? child : null;
    });
  }, [children, searchable, search]);

  return (
    <div role="listbox" className="select-content" data-position={position}>
      {searchable && (
        <input 
          type="text" 
          onChange={e => setSearch(e.target.value)}
          aria-label="Search options"
        />
      )}
      {filteredChildren}
    </div>
  );
}
```

### 11. BottomSheet Component Design

```
apps/web/src/design-system/components/BottomSheet/
├── BottomSheet.tsx
├── BottomSheetOverlay.tsx
├── BottomSheetContent.tsx
├── BottomSheetHandle.tsx
├── BottomSheet.module.css
└── index.ts
```

**Props Interface:**

```typescript
export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  snapPoints?: number[];  // e.g., [0.25, 0.5, 0.9]
  defaultSnapIndex?: number;
  swipeToDismiss?: boolean;
  dismissOnOverlay?: boolean;
  dismissOnEsc?: boolean;
  className?: string;
  overlayClassName?: string;
  enableScrollLock?: boolean;
}
```

**Swipe-to-Dismiss Implementation:**

```tsx
function BottomSheetContent({ snapPoints = [0.5, 0.9], swipeToDismiss = true }: BottomSheetProps) {
  const [translateY, setTranslateY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const deltaY = e.touches[0].clientY - initialTouchY;
    const sheetHeight = sheetRef.current?.offsetHeight ?? 0;
    const threshold = sheetHeight * 0.5;
    
    if (deltaY > 0) {
      setTranslateY(deltaY);
      if (swipeToDismiss && deltaY > threshold) {
        onClose();
      }
    }
  }, [swipeToDismiss, onClose]);

  const handleTouchEnd = () => {
    const nearestSnap = snapPoints.reduce((prev, curr) => 
      Math.abs(curr - translateY) < Math.abs(prev - translateY) ? curr : prev
    );
    animateTo(nearestSnap * window.innerHeight);
  };

  return (
    <div 
      ref={sheetRef}
      style={{ transform: `translateY(${translateY}px)` }}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="bottom-sheet"
    >
      <div className="bottom-sheet-handle" />
      {children}
    </div>
  );
}
```

**Mobile-First Styling:**

```css
/* BottomSheet.module.css */
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 90vh;
  border-radius: 16px 16px 0 0;
  background: var(--theme-surface);
  box-shadow: var(--theme-shadow-modal);
  z-index: var(--z-index-bottom-sheet);
  transition: transform 300ms var(--theme-ease-out);
}

@media (min-width: 768px) {
  .bottom-sheet {
    max-width: 480px;
    left: 50%;
    transform: translateX(-50%);
  }
}
```

### 12. DateRangePicker Design

```
apps/web/src/design-system/components/DateRangePicker/
├── DateRangePicker.tsx
├── DateRangePickerTrigger.tsx
├── DateRangePickerContent.tsx
├── Calendar.tsx
├── CalendarDay.tsx
├── CalendarHeader.tsx
├── PresetMenu.tsx
├── DateRangePicker.module.css
└── index.ts
```

**Props Interface:**

```typescript
export interface DateRangePickerProps {
  startDate?: Date | null;
  endDate?: Date | null;
  onRangeChange?: (range: { start: Date | null; end: Date | null }) => void;
  defaultStartDate?: Date | null;
  defaultEndDate?: Date | null;
  presets?: Array<{ label: string; start: Date; end: Date }>;
  minDate?: Date;
  maxDate?: Date;
  numberOfMonths?: 1 | 2;
  locale?: string;  // "en-US", "es-ES", etc.
  className?: string;
  disabled?: boolean;
}
```

**Two-Month Calendar View:**

```tsx
function DateRangePickerContent({ numberOfMonths = 2 }: DateRangePickerProps) {
  const [viewDate, setViewDate] = useState(new Date()); // Left month
  const rightMonth = addMonths(viewDate, 1);

  const months = numberOfMonths === 2 ? [viewDate, rightMonth] : [viewDate];

  const handlePrevMonth = () => setViewDate(addMonths(viewDate, -1));
  const handleNextMonth = () => setViewDate(addMonths(viewDate, 1));

  return (
    <div className="date-range-picker-content" role="dialog" aria-modal="true">
      <div className="date-range-picker-presets">
        {presets?.map(preset => (
          <button onClick={() => onRangeChange({ start: preset.start, end: preset.end })}>
            {preset.label}
          </button>
        ))}
      </div>
      <div className="date-range-picker-calendars">
        {months.map((month, i) => (
          <Calendar
            key={i}
            month={month}
            startDate={startDate}
            endDate={endDate}
            selectionPhase={selectionPhase} // "start" | "end" | "none"
            onDayClick={handleDayClick}
            onMonthChange={i === 0 ? handlePrevMonth : handleNextMonth}
          />
        ))}
      </div>
    </div>
  );
}
```

### 13. CSS Variable Consolidation Mapping

```
apps/web/src/design-system/tokens.ts
```

**Current → New Namespace Mapping:**

| Current | New (`--theme-*`) | Notes |
|---------|-------------------|-------|
| `--fs-primary` | `--theme-primary` | Primary brand color |
| `--fs-secondary` | `--theme-secondary` | Secondary color |
| `--fs-accent` | `--theme-accent` | Accent color |
| `--fs-text` | `--theme-text-primary` | Primary text |
| `--fs-text-muted` | `--theme-text-secondary` | Secondary text |
| `--fs-bg` | `--theme-background` | Background |
| `--fs-surface` | `--theme-surface` | Card/panel surface |
| `--fs-border` | `--theme-border` | Border color |
| `--fs-border-subtle` | `--theme-border-subtle` | Subtle borders |
| `--dni-primary` | `--theme-primary` | Legacy - map to theme |
| `--dni-secondary` | `--theme-secondary` | Legacy - map to theme |
| `--brand-primary` | `--theme-primary` | Brand - map to theme |
| `--brand-accent` | `--theme-accent` | Brand - map to theme |

**Backward Compatibility Aliases:**

```css
/* apps/web/src/design-system/variables.css */
:root {
  /* New canonical variables */
  --theme-primary: #00F5C3;
  --theme-secondary: #3B82F6;
  --theme-accent: #FF6B6B;
  --theme-background: #0B0E13;
  --theme-surface: #141822;
  --theme-text-primary: #E6EAF2;
  --theme-text-secondary: #9AA3B2;
  --theme-border: #232A3A;
  --theme-border-subtle: #1E293B;
  --theme-success: #10B981;
  --theme-warning: #F59E0B;
  --theme-danger: #EF4444;

  /* Backward compatibility aliases */
  --fs-primary: var(--theme-primary);
  --fs-secondary: var(--theme-secondary);
  --fs-accent: var(--theme-accent);
  --fs-text: var(--theme-text-primary);
  --fs-text-muted: var(--theme-text-secondary);
  --fs-bg: var(--theme-background);
  --fs-surface: var(--theme-surface);
  --fs-border: var(--theme-border);
  --fs-border-subtle: var(--theme-border-subtle);
  
  --dni-primary: var(--theme-primary);
  --dni-secondary: var(--theme-secondary);
  
  --brand-primary: var(--theme-primary);
  --brand-accent: var(--theme-accent);
}
```

### 14. Storybook Setup

```
.storybook/
├── main.ts              # Framework, addons, stories glob
├── preview.ts           # Global decorators, parameters
├── theme.ts             # Storybook theme (FitSculpt branding)
└── manager.ts           # Sidebar grouping

stories/
├── Button.stories.tsx
├── Modal.stories.tsx
├── Input.stories.tsx
├── Card.stories.tsx
├── DropdownMenu.stories.tsx
├── SegmentedControl.stories.tsx
├── Tabs.stories.tsx     # NEW
├── Select.stories.tsx   # NEW
├── BottomSheet.stories.tsx   # NEW
└── DateRangePicker.stories.tsx  # NEW
```

**main.ts:**

```typescript
// .storybook/main.ts
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|ts|tsx)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
};

export default config;
```

**preview.ts:**

```typescript
// .storybook/preview.ts
import type { Preview } from "@storybook/react";
import "../src/app/globals.css"; // Import CSS variables

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
  },
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Global theme for components",
      defaultValue: "default",
      toolbar: {
        icon: "paintbrush",
        items: ["default", "professional"],
        showName: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      document.documentElement.setAttribute("data-theme", context.globals.theme);
      return <Story />;
    },
  ],
};

export default preview;
```

---

## File Changes Table

### Backend (Sprint 5)

| File | Action | Lines (approx) |
|------|--------|---------------|
| `apps/api/src/types/appContext.ts` | NEW | ~200 |
| `apps/api/src/middleware/auth.ts` | NEW | ~150 |
| `apps/api/src/domains/auth/registerAuthRoutes.ts` | NEW | ~400 |
| `apps/api/src/domains/auth/schemas.ts` | NEW | ~100 |
| `apps/api/src/domains/auth/handlers/*.ts` | NEW | ~600 |
| `apps/api/src/domains/profile/registerProfileRoutes.ts` | NEW | ~200 |
| `apps/api/src/domains/tracking/registerTrackingRoutes.ts` | NEW | ~300 |
| `apps/api/src/domains/feed/registerFeedRoutes.ts` | NEW | ~200 |
| `apps/api/src/domains/admin/registerAdminRoutes.ts` | NEW | ~600 |
| `apps/api/src/domains/dev/registerDevRoutes.ts` | NEW | ~150 |
| `apps/api/src/domains/billing/stripe.ts` | MODIFY | +100 |
| `apps/api/src/index.ts` | MODIFY | -9000 (10368 → ~500) |

### Design System (Sprint 6)

| File | Action | Notes |
|------|--------|-------|
| `apps/web/src/design-system/components/Tabs/` | NEW | 5 files |
| `apps/web/src/design-system/components/Select/` | NEW | 8 files |
| `apps/web/src/design-system/components/BottomSheet/` | NEW | 4 files |
| `apps/web/src/design-system/components/DateRangePicker/` | NEW | 7 files |
| `apps/web/src/design-system/variables.css` | MODIFY | Add theme aliases |
| `apps/web/src/design-system/components/index.ts` | MODIFY | Export new components |
| `.storybook/main.ts` | NEW | |
| `.storybook/preview.ts` | NEW | |
| `.storybook/theme.ts` | NEW | |
| `stories/**/*.stories.tsx` | NEW | Existing + new components |

---

## Testing Strategy

### Backend

1. **Contract Tests** (existing): Run after each domain extraction
   ```bash
   npm run test:contract
   ```

2. **TypeScript Checking**: After each phase
   ```bash
   npm run typecheck
   ```

3. **Manual API Testing**:
   - Auth flow: signup → verify email → login → logout
   - Profile: GET/PUT /profile
   - Tracking: CRUD operations
   - Admin: CRUD users, gyms

### Design System

1. **Storybook Verification**:
   ```bash
   npx storybook dev
   ```

2. **Component Tests** (React Testing Library):
   ```bash
   npm run test -- --grep "Tabs"
   npm run test -- --grep "Select"
   npm run test -- --grep "BottomSheet"
   npm run test -- --grep "DateRangePicker"
   ```

3. **Accessibility Testing**:
   - axe-core integration
   - Keyboard navigation verification
   - Screen reader testing (VoiceOver/NVDA)

---

## Architecture Diagrams

### Backend Module Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        index.ts                                  │
│  • Fastify setup (plugins, hooks)                               │
│  • AppContext construction                                     │
│  • Domain route registration (8 calls)                          │
│  • Server start                                                 │
│  ~ 450 lines                                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  domains/auth/  │  │ domains/profile │  │ domains/tracking │
│  registerAuth   │  │ registerProfile │  │ registerTracking│
│  Routes.ts      │  │ Routes.ts       │  │ Routes.ts       │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ handlers/      │  │ • GET /profile  │  │ • GET /tracking │
│ • signup       │  │ • PUT /profile  │  │ • PUT /tracking │
│ • login        │  │                 │  │ • POST /tracking│
│ • logout       │  │                 │  │ • DELETE /track │
│ • verify-email │  │                 │  │                 │
│ • googleOAuth  │  │                 │  │                 │
│ • me           │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   domains/      │  │   domains/      │  │   domains/      │
│   feed/         │  │   gym/          │  │   admin/        │
│ registerFeed    │  │ registerGym    │  │ registerAdmin   │
│ Routes.ts       │  │ Routes.ts      │  │ Routes.ts       │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • GET /feed     │  │ • GET /gyms    │  │ • GET /admin/*  │
│ • POST /feed    │  │ • POST /gyms   │  │ • POST /admin/* │
│                 │  │ • GET member   │  │ • PATCH /admin/*│
│                 │  │ • DELETE mem   │  │ • DELETE /admin │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Design System Component Hierarchy

```
                    ┌─────────────────────────────────────────────┐
                    │                  Tabs                       │
                    │  <Tabs defaultValue="a">                     │
                    │    <TabsList>                                │
                    │      <TabsTrigger value="a">Tab A</TabsTrigger>│
                    │      <TabsTrigger value="b">Tab B</TabsTrigger>│
                    │    </TabsList>                               │
                    │    <TabsContent value="a">Content A</TabsContent>│
                    │    <TabsContent value="b">Content B</TabsContent>│
                    └─────────────────────────────────────────────┘

┌─────────────┐                    ┌─────────────────────────────┐
│   Select    │                    │      DateRangePicker        │
│ <Select>    │                    │  <DateRangePicker            │
│   Trigger  │                    │    startDate={start}        │
│   Content  │                    │    endDate={end}            │
│   - Item   │                    │    onRangeChange={fn}        │
│   - Group  │                    │    presets={presets}         │
│   - Label  │                    │    numberOfMonths={2}>       │
└─────────────┘                    │    <Calendar month={m1} />   │
                                   │    <Calendar month={m2} />   │
┌─────────────────────────────┐    └─────────────────────────────┘
│      BottomSheet            │
│  <BottomSheet               │
│    open={isOpen}            │
│    onClose={fn}             │
│    snapPoints={[0.5,0.9]}   │
│    swipeToDismiss>          │
│    ...content...            │
└─────────────────────────────┘
```

---

## Acceptance Criteria

### Sprint 5 - Backend

- [ ] `apps/api/src/index.ts` reduced to < 500 lines
- [ ] All 87 routes registered via domain modules
- [ ] `AppContext` interface fully typed (no `Record<string, any>` in domains)
- [ ] Auth middleware extracted to `middleware/auth.ts`
- [ ] Stripe types extracted to `domains/billing/stripe.ts`
- [ ] All contract tests pass after each domain extraction
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] No lint errors: `npm run lint`

### Sprint 6 - Design System

- [ ] Tabs component implemented with keyboard navigation
- [ ] Select component implemented with search and accessibility
- [ ] BottomSheet component implemented with swipe gestures
- [ ] DateRangePicker implemented with two-month view and presets
- [ ] CSS variables consolidated with `--theme-*` namespace
- [ ] Backward compatibility aliases working
- [ ] Storybook configured and running
- [ ] Stories created for all new components
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] No lint errors: `npm run lint`

---

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking routes during extraction | High | Extract one domain at a time, run contract tests after each |
| AppContext injection awkward | High | Define interface early (Phase 2), test with existing domains first |
| CSS consolidation breaks themes | Medium | Add `--theme-*` aliases first, test dark/light after each change |
| normalizeToken workarounds fragile | Medium | Preserve verbatim, add regression tests for edge cases |
| Storybook build conflicts | Low | Use `@storybook/react-vite` matching Vite setup |