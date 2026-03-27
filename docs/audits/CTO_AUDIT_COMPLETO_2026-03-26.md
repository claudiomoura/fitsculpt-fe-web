# CTO AUDIT COMPLETA - FitSculpt
**Fecha:** 2026-03-26  
**Auditor:** OpenCode (Staff Engineer + CTO)  
**Producto:** FitSculpt - Web app fitness mobile-first con AI

---

## 1. EXECUTIVE SUMMARY

| Métrica | Estado |
|---------|--------|
| **Compilación API** | ✅ Clean (10,083 líneas) |
| **Compilación Web** | ❌ 8 errores TS (nutritionAdherence, posthog) |
| **Beta-Ready** | ⚠️ Parcial - gaps críticos conocidos |
| **Monetización** | ✅ Stripe billing + tokens AI implementados |
| **IA Core** | ✅ Training/Nutrition plans, Chat, Tips |
| **Gym B2B** | ⚠️ Parcial - nav admin deshabilitada |
| **Arquitectura** | ⚠️ God file reducido pero no terminado |

**Veredicto:** Producto en estado **MVP avanzado / Beta temprana**. Tiene core funcional real pero carece de validación E2E, analytics real, y algunas features "durables" (nutrition log). Listo para alpha interno, NO para beta pública pagada.

---

## 2. ESTADO DEL PRODUCTO (Tabla Real)

| Feature | Docs | Backend | Frontend | Estado |
|---------|------|---------|----------|--------|
| **Auth (cookie fs_token)** | ✅ | ✅ | ✅ | ✅ COMPLETO |
| **Onboarding** | ✅ | ✅ | ✅ | ✅ COMPLETO |
| **Today Hub (/app/hoy)** | ✅ | ✅ | ✅ | ✅ COMPLETO |
| **Training (/app/entrenamiento)** | ✅ | ✅ | ✅ | ✅ COMPLETO |
| **Nutrition (/app/nutricion)** | ✅ | ✅ | ⚠️ | ⚠️ PARCIAL - quick log local |
| **Progress (/app/seguimiento)** | ✅ | ✅ | ✅ | ✅ COMPLETO |
| **Profile** | ✅ | ✅ | ✅ | ✅ COMPLETO |
| **AI Training Plan** | ✅ | ✅ | ✅ | ✅ COMPLETO |
| **AI Nutrition Plan** | ✅ | ✅ | ✅ | ✅ COMPLETO |
| **AI Chat Contextual** | ✅ | ✅ | ✅ | ✅ COMPLETO |
| **AI Daily Tips** | ✅ | ✅ | ✅ | ✅ COMPLETO |
| **AI Token Economy** | ✅ | ✅ | ✅ | ✅ COMPLETO |
| **Billing (Stripe)** | ✅ | ✅ | ✅ | ✅ COMPLETO |
| **Gym (B2B)** | ✅ | ✅ | ⚠️ | ⚠️ PARCIAL - nav deshabilitada |
| **Trainer Panel** | ✅ | ✅ | ✅ | ✅ COMPLETO |
| **Admin Panel** | ✅ | ✅ | ⚠️ | ⚠️ PARCIAL - nav incompleta |
| **Exercise Library** | ✅ | ✅ | ✅ | ✅ COMPLETO |
| **Recipes** | ✅ | ✅ | ✅ | ✅ COMPLETO |
| **Weekly Review** | ✅ | ✅ | ✅ | ✅ COMPLETO |
| **Check-in** | ✅ | ✅ | ✅ | ✅ COMPLETO |
| **Analytics** | ⚠️ | ❌ | ⚠️ | ❌ NO IMPLEMENTADO |
| **Adaptive Engine** | ⚠️ | ❓ | ❓ | ❓ NO VERIFICADO |
| **Food Recognition** | 📄 | ❌ | ❌ | ❌ NO IMPLEMENTADO |
| **Wearable Integration** | 📄 | ❌ | ❌ | ❌ NO IMPLEMENTADO |

**Leyenda:** ✅ Funcionando | ⚠️ Parcial/Gap | ❌ No implementado | 📄 Docs existen | ❓ Sin evidencia clara

---

## 3. AUDITORÍA FUNCIONAL (Inventario Completo)

### 3.1 Rutas Canónicas Frontend (verificadas)
```
/app/hoy              → Today hub (3 acciones máx) ✓
/app/entrenamiento    → Training home ✓
/app/nutricion        → Nutrition home (quick log local) ⚠️
/app/seguimiento      → Progress/Tracking ✓
/app/profile          → Account settings ✓
/app/gym              → Gym membership ✓
/app/biblioteca       → Exercise library + recipes ✓
/app/trainer/*        → Trainer panel (plans, clients, recipes) ✓
/app/admin/*          → Admin panel (incompleto) ⚠️
/app/onboarding       → User onboarding ✓
```

### 3.2 Endpoints Backend (principales verificados)
```
/auth/me              → Auth + entitlements ✓
/auth/register       → Registro usuario ✓
/auth/login          → Login + JWT ✓
/auth/google/*       → OAuth Google ✓

/profile             → GET/PUT user profile ✓
/tracking            → GET/PUT tracking data ✓
/feed                → GET feed items ✓

/ai/training-plan/generate    → AI training (v1) ✓
/ai/training-plan/generate-v2 → AI training (v2) ✓
/ai/nutrition-plan/generate   → AI nutrition ✓
/ai/chat/contextual           → AI chat ✓
/ai/daily-tip                 → AI tips ✓
/ai/quota                     → Token balance ✓
/ai/errors                   → Admin error log ✓

/billing/checkout    → Stripe checkout ✓
/billing/portal      → Stripe portal ✓
/billing/status      → Subscription status ✓
/billing/plans       → Pricing plans ✓

/gym/*               → Gym membership ops ✓
/gyms                → Gym listing ✓

/training-plans/*    → CRUD training plans ✓
/nutrition-plans/*  → CRUD nutrition plans ✓
/recipes/*          → Recipe CRUD ✓
/workouts/*         → Workout logging ✓
```

### 3.3 Features "Fake" Detectadas
1. **Nutrition Quick Log** - UI existe pero persiste solo en cliente (localStorage). No hay endpoint `/meals/complete` funcional. Evidencia: `apps/web/src/lib/nutritionAdherence.ts:25-137`
2. **Analytics** - Stub existe (`posthog` en window) pero proveedor no conectado. Evidencia: `apps/web/src/components/analytics/WebVitals.tsx:15-16`
3. **Gym Requests** - Nav marca como disabled. Evidencia: `apps/web/src/components/layout/navConfig.ts:153-159`

### 3.4 Legacy / Alias Activos
- `/app/dashboard` → redirect a `/app/hoy`
- `/app/entrenamientos` → redirect a `/app/entrenamiento`
- `/app/workouts` → redirect a `/app/entrenamiento`
- `/app/nutrition` → redirect a `/app/nutricion`

---

## 4. AUDITORÍA TÉCNICA

### 4.1 Arquitectura Monorepo
```
fitsculpt-fe-web/
├── apps/
│   ├── api/          (Fastify + Prisma + OpenAI)
│   │   ├── src/
│   │   │   ├── index.ts          (10,083 líneas - GOD FILE)
│   │   │   ├── routes/           (13 archivos)
│   │   │   ├── domains/          (7 dominios)
│   │   │   ├── lib/              (utilidades)
│   │   │   ├── ai/               (35+ archivos AI)
│   │   │   └── exercises/        (catálogo)
│   │   └── prisma/schema.prisma  (512 líneas, 50+ modelos)
│   │
│   └── web/          (Next.js 14 App Router)
│       └── src/
│           ├── app/(app)/        (páginas autenticadas)
│           ├── app/api/          (BFF routes - 100+)
│           ├── components/       (UI + layout)
│           ├── context/          (auth, entitlements)
│           └── lib/              (utilidades)
│
└── docs/              (100+ archivos)
```

### 4.2 Deuda Técnica Identificada

| Área | Problema | Severidad |
|------|----------|-----------|
| **API** | index.ts sigue siendo 10,083 líneas (god file) | P1 |
| **Web** | 8 errores TypeScript pendientes | P0 |
| **Auth** | Múltiples fallback de entitlements (legacy) | P1 |
| **Nav** | Admin gym requests deshabilitado | P1 |
| **Analytics** | Provider no conectado | P0 |
| **Nutrition** | Quick log no durable | P0 |
| **Tests** | Coverage limitado en áreas críticas | P1 |

### 4.3 Contratos FE↔BEE↔BE

| Contrato | Estado | Evidencia |
|----------|--------|-----------|
| Auth entitlements | ✅ OK | `context/auth/entitlements.ts` |
| Billing returnTo | ✅ OK | `api/billing/checkout` + `settings/billing` |
| Training plan generation | ✅ OK | `/ai/training-plan/generate` |
| Nutrition plan generation | ✅ OK | `/ai/nutrition-plan/generate` |
| Quick log nutrition | ❌ FAIL | Sin endpoint backend |
| Focus workout mode | ✅ OK | `/app/entrenamiento/[id]/start` |

### 4.4 IA Implementation

**Stack confirmado:**
- Provider: OpenAI (GPT-4)
- Token economy: Precargado por plan (FREE: 0, PREMIUM: 30-50 tokens/mes)
- Rate limiting: Implementado (`ai/monitoring/rateLimiter.ts`)
- Fallback: Deterministic templates cuando AI falla

**Endpoints AI:**
- `/ai/training-plan/generate` (v1)
- `/ai/training-plan/generate-v2` (v2 - nueva arquitectura)
- `/ai/nutrition-plan/generate`
- `/ai/chat/contextual`
- `/ai/daily-tip`
- `/ai/quota`

**Costos:** Sistema de pricing documentado (`ai/pricing.ts`), charges por uso real.

---

## 5. AUDITORÍA UX

### 5.1 Puntuaciones (0-10)

| Criterio | Puntuación | Notas |
|----------|------------|-------|
| **Claridad de navegación** | 7/10 | Alias confunden, admin incompleto |
| **Velocidad de uso** | 8/10 | App Router rápido, hydration OK |
| **Consistencia visual** | 6/10 | Doble capa design-system + ui/* |
| **Core loop (Today → acción → resultado)** | 7/10 | Training funciona, nutrition tiene gap |
| **Percepción premium** | 6/10 | Funcional pero detalles heurísticos |
| **Movilidad (mobile-first)** | 8/10 | Responsive bien implementado |

**Media: 7/10**

### 5.2 Fricciones Identificadas

1. **Nav Admin gym requests disabled** - Feature invisible para usuario
2. **Nutrition quick log no persiste** - Confianza comprometida si usuario nota
3. **Copy heurística en Today** - "Meta: -5 kg" hardcoded, no de datos reales
4. **Múltiples rutas aliases** - Confusión arquitectura interna
5. **Analytics inexistente** - No medible producto

---

## 6. AUDITORÍA DE DIFERENCIACIÓN

### 6.1 vs Competidores (FitnessAI, Freeletics, Strong)

| Feature | FitSculpt | FitnessAI | Freeletics | Strong |
|---------|-----------|-----------|------------|--------|
| AI Training | ✅ | ✅ | ❌ | ❌ |
| AI Nutrition | ✅ | ✅ | ❌ | ❌ |
| Gym B2B | ⚠️ | ❌ | ❌ | ❌ |
| Token economy | ✅ | ✅ | ❌ | ❌ |
| Offline mode | ❌ | ❌ | ✅ | ✅ |
| Web-only | ✅ | ❌ | ❌ | ❌ |
| Price | ? | $19.99/mo | $12.99/mo | $9.99/mo |

### 6.2 Diferenciadores Reales
- **Web-first** (vs apps nativas) - Menor barrier to entry
- **B2B Gym pilot** - Unique en el mercado
- **Módulos premium independientes** - Nutrición o Fitness separable

### 6.3 Necesario para Top-Tier
1. Analytics real (PostHog/GA conectado)
2. Nutrition durable (quick log backend)
3. Offline capability (PWA)
4. Adaptive engine (no verificado implementación)
5. Ejercicios con media real (GIFs/videos)

---

## 7. RIESGOS

### P0 (Bloquea lanzamiento)
| ID | Riesgo | Evidencia | Mitigación |
|----|--------|------------|-------------|
| P0-1 | TypeScript errors bloquean build web | 8 errores en web | Fix tipos nutritionAdherence + posthog |
| P0-2 | Nutrition quick log no es durable | Sin endpoint /meals/complete | Implementar contrato backend |
| P0-3 | Smoke E2E no demostrado | `run-beta-smoke.mjs` existe pero no verificado | Ejecutar y validar |

### P1 (Rompe experiencia)
| ID | Riesgo | Evidencia | Mitigación |
|----|--------|------------|-------------|
| P1-1 | Analytics no conecta | `window.posthog` undefined | Conectar provider real |
| P1-2 | Gym requests nav deshabilitada | navConfig.ts:153-159 | Habilitar o remover |
| P1-3 | Copy heurística en Today | "Meta: -5 kg" hardcoded | Parametrizar desde datos |

### P2 (Deuda técnica)
| ID | Riesgo | Evidencia | Mitigación |
|----|--------|------------|-------------|
| P2-1 | God file 10k líneas | index.ts sigue masivo | Continuar refactoring modular |
| P2-2 | Legacy aliases | múltiples redirects | Limpiar rutas dead |
| P2-3 | Doble capa design-system | Card wrapper duplicado | Consolidar componentes |

---

## 8. ESTADO REAL DEL PROYECTO

### ¿Está listo para beta real?
**NO**. Estado: **MVP avanzado / Beta-alpha**.

### ¿Se puede cobrar hoy?
**Técnicamente SÍ** (Stripe implementado, tokens funcionando). Pero:
- Sin analytics no se puede medir retención
- Nutrition quick log puede generar refunds por UX rota
- Gym B2B incompleto limita modelo de negocio

### Nivel de madurez honesto

| Nivel | FitSculpt | Evidencia |
|-------|-----------|------------|
| Concept/MVP | ❌ | Ya tiene features reales |
| **MVP** | ✅ | Core loop funciona |
| **Beta temprana** | ✅ | Con gaps conocidos |
| Product-Market Fit | ❌ | Sin métricas aún |
| Scale | ❌ | No procede |

**Ubicación real:** Entre MVP y Beta temprana.类似的产品在市场上有竞争，但产品尚未准备好进行公开测试。

---

## 9. ROADMAP PROPUESTO (CTO)

### Sprint 1 - Cierre Beta Operativa (2 semanas)
**Objetivo:** Validar que el producto funciona end-to-end

| Task | Scope | Criteria | Deps |
|------|-------|----------|------|
| Fix TypeScript web | 8 errores | `npm run typecheck` clean | None |
| Ejecutar smoke E2E | Core loop | `/app/hoy` → training → finish | API running |
| Validar billing returnTo | Checkout flow | Return a origen correcto | Stripe keys |
| Nutrition quick log backend | Meal completion | POST `/meals/:id/complete` real | Backend dev |

### Sprint 2 - Producto Medible (1 semana)
**Objetivo:** Analytics y métricas

| Task | Scope | Criteria | Deps |
|------|-------|----------|------|
| Conectar PostHog/GA | Analytics | Eventos fluyen | Account config |
| Dashboard métricas | Admin | DAU, retention, revenue | PostHog |
| Gym requests nav | UX | Item habilitado | Sprint 1 |

### Sprint 3 - Hardening Premium (2 semanas)
**Objetivo:** Features que justifican pago

| Task | Scope | Criteria | Deps |
|------|-------|----------|------|
| Adaptive engine (si existe) | Docs vs code | Verificar implementación | Docs review |
| Offline PWA | Service worker | Cache views offline | None |
| Copy parametrizada | Today | Datos reales, no heurística | Profile data |

### Sprint 4 - Gym B2B Completion (1 semana)
**Objetivo:** Modelo de negocio B2B funcional

| Task | Scope | Criteria | Deps |
|------|-------|----------|------|
| Gym admin complete | Admin gym | CRUD gym, members, plans | Sprint 1 |
| Trainer tools | Trainer panel | Asignar planes a members | Sprint 1 |
| Join flow | Gym join | Código o aceptación manual | Sprint 1 |

---

## 10. TOP 5 PRIORIDADES ABSOLUTAS

1. **Fix TypeScript web (P0)** - Build broken = nada funciona
2. **Nutrition quick log backend (P0)** - Sin esto no hay nutrition real
3. **Smoke E2E validación (P0)** - No hay confianza de release
4. **Analytics provider (P1)** - No se puede mejorar lo que no se mide
5. **Gym nav habilitar (P1)** - B2B feature oculta = no genera revenue

---

## 11. RECOMENDACIÓN FINAL (COMO CTO)

### ¿Qué harías tú y por qué?

**Inmediato (esta semana):**
1. Fix los 8 errores TypeScript en web - 1 hora
2. Ejecutar smoke test E2E - 2 horas
3. Documentar qué significa "nutrition quick log" backend - 1 hora

**Corto plazo (2-3 semanas):**
- Cerrar los 3 gaps P0 antes de cualquier demo externa
- No hacer marketing hasta que smoke pase verde

**Por qué:**
El producto tiene **core real funcionando** (AI, billing, auth, training). Pero los gaps de nutrition durable y analytics lo hacen **no medible y no monetizable de forma fiable**. Invertir en usuarios antes de resolver esto = churn garantizado y refunds.

**No harías:**
- No añadiría más features AI (ya está completo)
- No haría marketing hasta P0 resuelto
- No expandiría B2B hasta nutrition fix

---

*Auditoría basada en código real, docs, y auditorías anteriores. Sin invenciones.*