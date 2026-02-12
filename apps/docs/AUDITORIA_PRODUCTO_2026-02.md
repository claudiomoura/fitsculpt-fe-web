# Auditoría de producto y arquitectura (2026-02)

## 1) Executive summary

FitSculpt tiene una base técnica sólida en varios frentes: API tipada con Fastify + Zod + Prisma, BFF en Next para proteger cookies, y una arquitectura objetivo bien documentada centrada en mobile-first.

Sin embargo, hay señales claras de fragilidad funcional y de producto que explican los problemas reportados en demo:
- El control de acceso del frontend depende de `/api/profile`, pero ese endpoint no devuelve `role`; por eso el frontend no detecta correctamente Admin/Trainer para navegación y capacidades.
- El backend no expone endpoints de trainer/coach consumibles por el frontend actual, por lo que parte de Trainer queda en modo “unavailable”.
- La suite de tests de frontend está rota por configuración (`expect is not defined`), reduciendo confianza de release.
- El lint de frontend falla con 2 errores y decenas de warnings; hay deuda de hooks, renders y consistencia.
- Hay fuga de secretos/credenciales en documentación (URLs DB, correos y passwords), riesgo crítico.
- La UX de Settings/Billing mezcla estilos inline y estructura mínima, percibida como “fría” y poco guiada.

A corto plazo (P0/P1), el mayor impacto para demo está en: corregir control de roles en frontend, cerrar brecha trainer (feature-flag o implementación mínima), endurecer secretos, y elevar baseline de calidad (tests/lint/errores de navegación móvil).

Actualización de esta segunda auditoría: el comando de producción del frontend (`npm run build --prefix apps/web`) **sí compila y genera rutas correctamente** en este entorno. Es decir, el problema de “run build falla” no se reprodujo localmente con el código actual; la evidencia sugiere que los fallos percibidos vienen más de calidad no-gateada (tests/lint en rojo) o de diferencias de entorno en CI/Vercel.

## 2) Mapa del sistema

### Estructura principal del repo
- `apps/web`: Frontend Next.js (App Router), BFF en `/app/api/*`, UI y navegación.
- `apps/api`: Backend Fastify + Prisma (PostgreSQL), auth, billing, IA, admin.
- `apps/docs`: Documentación de arquitectura, decisiones, sprints y reglas.

### Arquitectura (front + BFF + backend)
- Frontend (Next) consume siempre `/api/*` local (BFF).
- BFF reenvía peticiones al backend real usando cookie `fs_token`.
- Backend Fastify centraliza lógica de negocio, auth, roles, billing/Stripe e IA.

### Flujos críticos detectados
- Auth email/password + verificación email + OAuth Google.
- Gestión de sesión por cookie HTTP-only `fs_token`.
- Perfil/onboarding con JSON en `UserProfile.profile`.
- Planes entrenamiento/nutrición + tracking.
- Admin users (listar, bloquear, reset password, etc.).
- Stripe checkout/portal/webhook.

### Dependencias clave
- Front: Next 16, React 19, Vitest.
- Back: Fastify 5, Prisma 5, Zod, JWT, Stripe.
- DB: PostgreSQL (schema Prisma).

## 3) Hallazgos clave (Top 10)

1. **[Critical] Secretos en documentación versionada** (credenciales DB + passwords de usuarios).
2. **[High] Frontend no resuelve rol por diseño actual de AccessProvider** (usa `/api/profile` sin `role`).
3. **[High] Módulo trainer incompleto a nivel API** (frontend espera endpoints que no existen).
4. **[High] Tests frontend rotos por configuración de entorno de test**.
5. **[High] Lint frontend no pasa (2 errores + múltiples warnings)**.
6. **[Med] Inconsistencia de rutas/idiomas (`/trainer` vs `/treinador`) que complica UX/navegación.**
7. **[Med] Settings/Billing con UI mínima e inline styles; baja coherencia visual.**
8. **[Med] Backend concentrado en un `index.ts` grande (mantenibilidad y riesgo de regresión).**
9. **[Med] Observabilidad limitada a logs; no hay métricas/tracing/alerting visible en repo.**
10. **[Low-Med] Falta de CI/CD declarada en repo (no workflows Docker/CI visibles).**

## 4) Auditoría detallada

### Backend

**Fortalezas (hechos):**
- Validación de env robusta con Zod y defaults.
- `requireUser` + `requireAdmin` centralizados.
- Manejo de errores consistente con códigos (`INVALID_INPUT`, `UNAUTHORIZED`, etc.).
- Webhook Stripe con verificación de firma HMAC y tolerancia de timestamp.

**Riesgos/deuda (hechos):**
- Archivo `apps/api/src/index.ts` concentra muchos dominios (auth, billing, IA, admin, profile, etc.).
- `/profile` devuelve solo `profile.profile` (JSON de negocio), no metadata de usuario/rol.
- No se detectan endpoints `/trainer/*` o `/coach/*` en backend, pese a consumo frontend.

**Hipótesis:**
- Parte de incidencias “no funciona” en admin/trainer pueden venir de desalineación contrato frontend-backend en capacidades/roles.

### Frontend

**Fortalezas (hechos):**
- BFF consistente (`/app/api/*`) y forwarding de cookie `fs_token`.
- Sistema de componentes reutilizables y `globals.css` con tokens design-system.
- Layout app con sidebar + mobile tab bar.

**Problemas (hechos):**
- `AccessProvider` resuelve acceso desde `/api/profile`, no desde `/api/auth/me`.
- Como `/profile` backend no trae role, `isAdmin/isCoach` puede quedar en falso.
- Trainer depende de `probeTrainerClientsCapability()` a endpoints `/api/trainer/clients` o `/api/coach/clients`; no están implementados.
- Tests frontend fallan por setup Vitest/Jest-dom (`expect is not defined`).
- ESLint falla con errores de hooks (`set-state-in-effect`) y muchos warnings.

### UI/UX

**Fortalezas (hechos):**
- Existe mobile tab bar, safe area y estructura responsive definida en CSS.
- Se contemplan estados loading/empty/error en varios módulos.

**Problemas (hechos):**
- Percepción de confusión: coexistencia de rutas y conceptos duplicados (`trainer`/`treinador`) y secciones heterogéneas.
- Settings principal es demasiado básico (solo CTA a billing) y billing usa mucho inline style.
- Inconsistencia de lenguaje (ES/PT/EN en labels/rutas/textos).

**Hipótesis:**
- “Tab bar no fijo” puede ser intermitente por capas/z-index u otras pantallas fuera del layout app; en código sí está `position: fixed` y además en portal a `body`.

### Calidad y operación

**Hechos:**
- API tests básicos pasan (auth utils / ai parsing).
- Front tests no ejecutan correctamente.
- Lint frontend falla (2 errors).
- No se observan pipelines CI/CD versionadas en repo.
- Documentación incluye datos sensibles en `README`.

## 5) Lista completa de issues (priorizada)

### FS-001
- **Severidad:** Critical
- **Evidencia:** `apps/web/README.md`, `apps/api/README.md`
- **Causa probable:** secretos subidos al repo por documentación manual.
- **Repro:** abrir READMEs y ver strings de conexión/passwords.
- **Fix recomendado:** rotar credenciales inmediatamente, purgar historial sensible, mover ejemplos a placeholders.

### FS-002
- **Severidad:** High
- **Evidencia:** `AccessProvider` usa `/api/profile`; backend `/profile` no incluye `role`.
- **Causa probable:** contrato de acceso basado en payload incorrecto.
- **Repro:** login como ADMIN, menú no muestra opciones admin/trainer consistentemente.
- **Fix recomendado (mínimo cambio):** en frontend, resolver permisos con `/api/auth/me` o extender `/profile` para incluir `role`.

### FS-003
- **Severidad:** High
- **Evidencia:** `probeTrainerClientsCapability` consulta `/api/trainer/clients` y `/api/coach/clients`.
- **Causa probable:** backend sin endpoints trainer/coach actuales.
- **Repro:** entrar a `/app/trainer`; aparece unavailable/error.
- **Fix recomendado:** crear endpoint mínimo (read-only clients) o desactivar módulo con feature flag hasta completar backend.

### FS-004
- **Severidad:** High
- **Evidencia:** `npm test --prefix apps/web` falla con `expect is not defined`.
- **Causa probable:** setup Vitest sin `globals: true` o sin inicializar expect antes de jest-dom.
- **Repro:** ejecutar test frontend.
- **Fix recomendado:** corregir `vitest.config`/setup para exponer `expect` y cargar `@testing-library/jest-dom/vitest`.

### FS-005
- **Severidad:** High
- **Evidencia:** `npm run lint --prefix apps/web` falla con errores `react-hooks/set-state-in-effect`.
- **Causa probable:** patrones de efecto no compatibles con reglas React 19/eslint plugin.
- **Repro:** ejecutar lint frontend.
- **Fix recomendado:** refactor de efectos en `MobileTabBar` y `TrainerHomeClient`; dejar lint en verde como gate.

### FS-006
- **Severidad:** Medium
- **Evidencia:** coexisten rutas `/(app)/app/trainer/*` y `/(app)/app/treinador/*`.
- **Causa probable:** evolución incremental sin convergencia de IA18n/routing.
- **Repro:** navegación y deep links muestran rutas semánticamente duplicadas.
- **Fix recomendado:** unificar ruta canónica y redirecciones 301/rewrites.

### FS-007
- **Severidad:** Medium
- **Evidencia:** `settings/page.tsx` minimalista; `billing/BillingClient.tsx` con múltiples inline styles.
- **Causa probable:** pantalla de transición no integrada al design system.
- **Repro:** abrir `/app/settings` y `/app/settings/billing`.
- **Fix recomendado:** rediseño incremental: cards consistentes, jerarquía clara, copy orientado a acción, feedback post-acción.

### FS-008
- **Severidad:** Medium
- **Evidencia:** `apps/api/src/index.ts` centraliza muchas responsabilidades.
- **Causa probable:** fase MVP sin modularización por dominios.
- **Repro:** revisar tamaño/complejidad del archivo.
- **Fix recomendado:** extraer rutas por dominio (`auth.routes.ts`, `admin.routes.ts`, etc.) y servicios.

### FS-009
- **Severidad:** Medium
- **Evidencia:** no se observan workflows CI/CD en repo.
- **Causa probable:** operación manual.
- **Repro:** buscar `.github/workflows` / pipelines.
- **Fix recomendado:** pipeline mínimo (lint+test+build) para web y api.

### FS-010
- **Severidad:** Low-Med
- **Evidencia:** múltiple mezcla de idiomas en UI, rutas y docs.
- **Causa probable:** estrategia i18n no cerrada.
- **Repro:** revisar textos y paths.
- **Fix recomendado:** definir idioma base por mercado + checklist i18n por release.

## 6) Recomendaciones priorizadas

### Quick wins (1-5 días)
1. Corregir detección de roles en frontend usando `/api/auth/me`.
2. Bloquear/ocultar trainer incompleto bajo feature flag explícita.
3. Arreglar setup de tests frontend.
4. Dejar lint sin errores (al menos en archivos críticos de layout/nav/access).
5. Remover secretos de README y rotar claves.

### Refactors (1-3 semanas)
1. Modularizar backend por dominios.
2. Unificar rutas trainer/treinador y taxonomía de navegación.
3. Rediseño UX de Settings/Billing con componentes DS y estados.
4. CI/CD mínimo + quality gates.

## 7) Roadmap PM (epics + stories)

### Epic E1 — Seguridad y Compliance básica
- **Story:** Como owner quiero eliminar secretos del repo para reducir riesgo operacional.
  - **AC:** No hay credenciales reales en repo; secretos rotados; guía de `.env.example` limpia.
  - **Impacto:** Alto | **Riesgo:** Alto | **Esfuerzo:** S

### Epic E2 — Accesos y roles confiables
- **Story:** Como admin quiero ver navegación y páginas admin consistentes.
  - **AC:** login admin muestra menú admin, `/app/admin` y `/app/admin/users` operativos.
  - **Impacto:** Alto | **Riesgo:** Medio | **Esfuerzo:** M
- **Story:** Como usuario no-admin no debo ver opciones restringidas.
  - **AC:** validación UI + backend de autorización.
  - **Impacto:** Alto | **Riesgo:** Medio | **Esfuerzo:** S

### Epic E3 — Trainer readiness para demo
- **Story:** Como coach quiero ver al menos listado base de clientes.
  - **AC:** endpoint mínimo disponible o módulo claramente “coming soon” sin errores.
  - **Impacto:** Alto | **Riesgo:** Medio | **Esfuerzo:** M

### Epic E4 — UX coherence (Settings + navegación)
- **Story:** Como usuario quiero entender settings/billing sin fricción.
  - **AC:** IA visual consistente, jerarquía y feedback claros, sin inline ad-hoc.
  - **Impacto:** Medio-Alto | **Riesgo:** Bajo | **Esfuerzo:** M
- **Story:** Como usuario móvil quiero tab bar estable y consistente en todas las pantallas app.
  - **AC:** barra visible/fija en rutas app en viewport <=900.
  - **Impacto:** Alto demo | **Riesgo:** Medio | **Esfuerzo:** S

### Epic E5 — Calidad de release
- **Story:** Como equipo quiero tests/lint en verde antes de deploy.
  - **AC:** frontend tests ejecutan; lint sin errores; pipeline CI activo.
  - **Impacto:** Alto | **Riesgo:** Medio | **Esfuerzo:** M

## Propuesta de sprints (2 semanas)

### Sprint 1 (Objetivo: demo estable)
- P0: FS-001, FS-002, FS-004, FS-005
- P1: FS-003 (modo mínimo o flag), FS-007 (mejoras rápidas)

### Sprint 2 (Objetivo: robustez operativa)
- P1: FS-006, FS-009
- P2: FS-008, FS-010

## 8) Diagnóstico específico: "run build" frontend + regla de oro

### Hecho observado (re-validado)
- `npm run build --prefix apps/web` terminó con éxito: compilación, typecheck, generación de páginas y optimización final.

### Si build pasa, ¿por qué parece que "no está listo para prod"?
**Hechos:**
- Tests frontend fallan (`expect is not defined`).
- Lint frontend falla con errores de hooks (`react-hooks/set-state-in-effect`).

**Conclusión:**
- Hoy existe una brecha entre "compilar" y "estar listo para producción".
- La definición correcta de Done para release no debe ser solo build, sino **build + lint + tests en verde**.

### Regla de oro recomendada (obligatoria para merges)
1. **Build verde obligatorio** (`npm run build --prefix apps/web`).
2. **Lint sin errores obligatorio** (`npm run lint --prefix apps/web`).
3. **Tests obligatorios en verde** (`npm test --prefix apps/web`, `npm test --prefix apps/api`).
4. Si cualquiera falla, **no se mergea**.

### Implementación mínima (sin refactor grande)
- Añadir pipeline CI con 4 jobs bloqueantes: `web-lint`, `web-test`, `web-build`, `api-test`.
- Refactor puntual de los 2 errores de lint para dejar baseline sin errores.
- Corregir setup Vitest para recuperar tests frontend.
- Publicar checklist de release en PR template.
