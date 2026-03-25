# Sprint Planning - FitSculpt

## Overview

**Project:** FitSculpt MVP → Beta Ready  
**Sprint Duration:** 2 weeks each  
**Current Sprint:** Sprint 1 - Beta Hardening  

---

## Sprint 1: Beta Hardening (Semanas 1-2)

### Objetivo
Cerrar gaps que impiden cobrar por el producto.

### Tasks Completadas ✅

| Task | Priority | Status | Notes |
|------|----------|--------|-------|
| Crear BFF route handler para meals | P0 | ✅ Done | 6 archivos creados |
| Actualizar mealApi.ts | P0 | ✅ Done | Cambiado a `/api/meals` |
| Crear contract tests para meals | P0 | ✅ Done | 12 tests pasando |
| Habilitar admin gym nav | P1 | ✅ Done | navConfig.ts |
| Actualizar docs BFF endpoints | P1 | ✅ Done | bff-endpoints.md |

### Tasks Pendientes

| Task | Priority | Estimación | Dependencias |
|------|----------|------------|--------------|
| Verificar smoke tests CI | P0 | 2h | Ninguna |
| Routes legacy ya redirigen | - | - | ✅ Redirects existentes |
| Crear e2e smoke test para meals | P2 | 2h | Tests existentes |

### Criterios de Aceptación Sprint 1

- [x] Meals BFF route handler creado
- [x] mealApi.ts actualizado  
- [x] 12 contract tests pasando
- [x] Admin gym requests visible en nav
- [x] Routes aliases ya redirigen a canónicas
- [ ] Smoke suite pasa en CI
- [ ] E2E smoke test para meals creado

---

## Sprint 2: Analytics + UX Quality (Semanas 3-4)

### Objetivo
Producto medible y UX mejorada.

### Tasks

| Task | Priority | Estimación | Dependencias | Status |
|------|----------|------------|--------------|--------|
| Integrar PostHog/Segment | P1 | 1 día | Ninguna | ✅ Docs + ENV actualizados |
| Enforce onboarding | P1 | 4h | Ninguna | ✅ Ya implementado |
| Remove entitlements legacy | P2 | 4h | Ninguna | ⏳ Pendiente |
| Consolidar DS layer | P2 | 2 días | Ninguna | ⏳ Pendiente |
| Fix TypeScript errors | P2 | 4h | Ninguna | ⏳ Pendiente |

### Criterios de Aceptación

- [ ] Analytics muestra eventos reales (configurar POSTHOG_KEY)
- [x] Onboarding enforced antes de Today vacío
- [ ] Entitlements usa solo módulos nuevos
- [ ] DS tiene single source of truth
- [ ] 0 TypeScript errors

### Notas Sprint 2 Progreso

- Analytics implementation ya existe y está bien conectado
- `AnalyticsProvider` en `ClientProviders`
- 22 usages de `trackEvent` en el codebase
- Solo falta configurar `NEXT_PUBLIC_POSTHOG_KEY` en entorno

---

## Sprint 3: AI Reliability (Semanas 5-6)

### Objetivo
AI production-ready con monitoring.

### Tasks

| Task | Priority | Estimación | Dependencias |
|------|----------|------------|--------------|
| AI queue system (BullMQ) | P1 | 2 días | Ninguna |
| Rate limiting real por plan | P1 | 1 día | Ninguna |
| Monitoring/alerting AI calls | P2 | 1 día | Ninguna |
| Cache layer robusto | P2 | 4h | Ninguna |
| Graceful degradation UI | P1 | 4h | Ninguna |

### Criterios de Aceptación

- [ ] AI generation no bloquea requests
- [ ] Rate limits enforceados
- [ ] AI failures tienen fallback UI claro
- [ ] Logs centralizados

---

## Sprint 4: Adaptive Engine (Semanas 7-8)

### Objetivo
Diferenciador real en producción.

### Tasks

| Task | Priority | Estimación | Dependencias |
|------|----------|------------|--------------|
| Full adaptive math en prod | P1 | 2 días | Sprint 1-2 |
| RCT tracking completo | P1 | 1 día | Sprint 1-2 |
| Recommendations UI | P1 | 2 días | Sprint 1-2 |
| Future projection visible | P2 | 1 día | Sprint 1-2 |

### Criterios de Aceptación

- [ ] Weekly review usa adaptive engine completo
- [ ] User puede aceptar/rechazar recommendations
- [ ] RCT metrics se guardan correctamente

---

## Sprint 5: Monitoring & Launch (Semanas 9-10)

### Objetivo
Listo para usuarios reales.

### Tasks

| Task | Priority | Estimación | Dependencias |
|------|----------|------------|--------------|
| Error tracking (Sentry) | P1 | 1 día | Ninguna |
| Performance monitoring | P2 | 1 día | Ninguna |
| Health checks endpoints | P2 | 2h | Ninguna |
| Runbooks documentados | P2 | 1 día | Ninguna |
| Soft launch 50 users | P1 | - | Todos |

### Criterios de Aceptación

- [ ] Errors capturados y alertados
- [ ] P95 latency < 2s para endpoints core
- [ ] Runbooks ejecutables por cualquier engineer
- [ ] 50 beta users paying activos

---

## Definition of Done

Para cada task, el PR debe incluir:

1. ✅ Código implementando la feature
2. ✅ Tests unitarios (si aplica)
3. ✅ Contract tests (si endpoints nuevos/modificados)
4. ✅ TypeScript sin errores
5. ✅ Documentación actualizada
6. ✅ Criterios de aceptación verificados

---

## Definition of Ready

Para comenzar una task:

1. Requirements claros
2. Criterios de aceptación definidos
3. Dependencias identificadas
4. Estimación de tiempo acordada

---

## Progress Tracking

| Sprint | Status | % Complete | Key Deliverables |
|--------|--------|------------|-----------------|
| Sprint 1 | 🚧 In Progress | 60% | Meals BFF ✅, Admin nav ✅ |
| Sprint 2 | ⏳ Not Started | 0% | - |
| Sprint 3 | ⏳ Not Started | 0% | - |
| Sprint 4 | ⏳ Not Started | 0% | - |
| Sprint 5 | ⏳ Not Started | 0% | - |

---

## Metrics

| Metric | Sprint 1 Target | Sprint 1 Actual |
|--------|-----------------|-----------------|
| Contract tests passing | 100% | 12/12 ✅ |
| TypeScript errors | 0 | Reduciéndose |
| Smoke tests passing | 100% | Pendiente |
| Coverage | +5% | Pendiente |

---

## Blockers

| Blocker | Impact | Mitigation |
|---------|--------|------------|
| None currently | - | - |

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|------------|
| 2026-03-25 | Crear BFF route handler para meals | mealApi.ts llamaba sin proxy |
| 2026-03-25 | Usar fetchBackend para DELETE 204 | proxyToBackend usa NextResponse.json() que no soporta 204 |
