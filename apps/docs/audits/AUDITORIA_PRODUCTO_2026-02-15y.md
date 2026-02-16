# Auditoria_FitSculpt_2026-02-15.md
Fecha: 2026-02-15  
Autor/a auditoría: Equipo Auditoría (Senior Staff Architects)  
Solicitado por: Founder/PM (FitSculpt)  
Motivo: Mapa verificable de “qué existe hoy”, gaps del MVP modular, readiness para vender a un gym pequeño.

Fuentes auditadas (solo lectura):
- front.zip (Next.js App Router con BFF en `/api/*`)
- back.zip (Fastify + Prisma + Stripe + OpenAI)
- Nota de verificabilidad: los zips no incluían `.git`, por eso no hay commit hash. Se recomienda fijar un commit SHA en el repo y adjuntar artefactos de build en CI.

---

## 1) Executive Summary (máx 12 bullets)

1) **Release-ready: NO.** Motivos principales: divergencia de fuente de verdad para planes (perfil JSON vs tablas), contratos admin incompletos, riesgos de seguridad (credenciales expuestas en README), y validación de perfil para IA que no se puede completar bien desde el flujo actual.  
2) **MVP Modular: NO.** Hay enum de planes y gating parcial, pero la UX no segmenta features por tier de forma coherente, y la persistencia de planes no es unificada.  
3) **Gym Pilot: PARCIAL.** Join por código y join request existen en backend, panel de gyms y join requests existe en frontend. Faltan piezas claras para “asignar plan template” desde trainer/admin en FE y cerrar el flujo.  
4) **Top riesgos (5):**
   - (Crítico) **Credenciales en texto plano en `back/README.md`** (rotación inmediata).  
   - (Crítico) **Planes de entrenamiento y nutrición con doble storage** (perfil JSON y tablas `TrainingPlan`/`NutritionPlan`), alto riesgo de inconsistencias.  
   - (Alto) **IA exige perfil completo en backend**, pero el recorrido “editar perfil” manda a onboarding corto, no garantiza completitud (bloquea IA).  
   - (Alto) **Contratos admin incompletos**: FE tiene endpoints BFF para tokens y plan que no existen en backend.  
   - (Medio) Middleware de protección de `/app` solo valida presencia de cookie, no validez del token, produce navegación “fantasma” con fallos de API.
5) **Quick wins (5):**
   - Ocultar en UI final secciones “en desarrollo” y tabs deshabilitados, y mover Labs a Admin-only bien marcado.  
   - Unificar “perfil completo” (backend schema vs frontend check) y ajustar CTA “Editar perfil” a un form que cubra campos requeridos.  
   - Declarar una única fuente de verdad para planes (tablas o perfil JSON), y adaptar la pantalla principal a ese contrato.  
   - Corregir contrato `GET /admin/users` o ajustar FE para no esperar campos inexistentes.  
   - Eliminar secretos del repo y activar un escáner de secretos en CI.

---

## 2) Inventario de Producto “qué existe hoy”

### 2.1 Mapa de navegación (rutas y dónde viven)

Evidencia: rutas detectadas en `front/src/app/**/page.tsx`.

**Auth (usuario final)**
- `/login` (front: `src/app/(auth)/login/page.tsx`)
- `/signup` (front: `src/app/(auth)/signup/page.tsx`)
- `/verify-email` y páginas de verificación existen vía rutas auth (ver BFF `src/app/api/auth/*`).

**App core (usuario final)**
- `/app/hoy` (Hoy, resumen y quick actions)
- `/app/biblioteca` (biblioteca de ejercicios) y detalle `/app/biblioteca/:exerciseId`
- `/app/seguimiento` (tracking: checkins, food log por gramos, workout log)
- `/app/macros` (cálculo/ajuste macros)
- `/app/entrenamiento` (plan entrenamiento, incluye AI/Manual, persistencia en perfil JSON)
- `/app/nutricion` (plan nutrición, incluye AI, persistencia en perfil JSON)
- `/app/dietas` (lista de `nutrition-plans` en tabla, lectura)
- `/app/biblioteca/entrenamientos` (lista de `training-plans` en tabla, lectura)
- `/app/profile` (resumen del perfil)
- `/app/settings`
- `/app/gym` (unirse a gym, ver estado)

**Trainer (zona gym)**
- `/app/trainer/*` (pantallas de trainer y clientes)
- Existe además duplicado en portugués: `/app/treinador/*` (inconsistencia i18n y rutas duplicadas).

**Admin (dev/admin)**
- `/app/admin` (dashboard admin)
- `/app/admin/users` (gestión de usuarios)
- `/app/admin/gyms` (gestión de gyms)
- `/app/admin/gym-requests` (gestión join requests)
- `/app/admin/labs` (hub de pantallas “beta”, solo admin)

**Callejones sin salida detectados**
- “Editar perfil” en `/app/profile` manda a `/app/onboarding`, pero onboarding es corto (3 pasos) y no cubre todos los campos que backend exige para IA.  
  Evidencia: `ProfileSummaryClient.tsx` link a `/app/onboarding` (líneas 148-150) y onboarding `LAST_STEP = 2` (línea 25 en `OnboardingClient.tsx`).  
- Sección Labs etiqueta “sem backend” para páginas que sí tienen backend o sí existen (mala señalización).  
  Evidencia: `AdminLabsClient.tsx` enum `LabStatus` y lista `LAB_ITEMS`.

---

### 2.2 Flujos end-to-end (journeys)

#### Login + acceso a `/app` protegido
- **Paso 1:** Usuario entra a `/login`.  
- **Paso 2:** Server Action hace login contra backend y setea cookie `fs_token`.  
  Evidencia: `front/src/app/(auth)/login/actions.ts` (usa `cookies().set("fs_token", ...)`).  
- **Paso 3:** Middleware permite `/app/*` si existe cookie.  
  Evidencia: `front/src/middleware.ts` líneas 12-18.
- **Resultado esperado:** acceso a `/app/hoy`.  
- **Riesgo:** middleware no valida token con backend, solo existencia de cookie, puede haber sesión inválida que deja navegar pero falla en API.

#### Hoy + 1 acción rápida
- `/app/hoy` renderiza `TodaySummaryClient` y `TodayQuickActionsClient`.  
- Quick actions consumen `/api/profile` y `/api/tracking`.  
- Persistencia de tracking se realiza vía `PUT /api/tracking` que proxy a backend `/tracking`.  
  Evidencia BFF: `front/src/app/api/tracking/route.ts`.  
  Evidencia backend schema tracking: `back/src/index.ts` checkin/foodLog/workoutLog schemas (zona ~869 en adelante).

#### Biblioteca: lista → detalle
- Lista ejercicios: `/app/biblioteca` consume `GET /api/exercises`.  
  Evidencia BFF: `front/src/app/api/exercises/route.ts`  
  Evidencia backend: `app.get("/exercises"... )` en `back/src/index.ts` (existe).  
- Detalle: `/app/biblioteca/:id` consume `GET /api/exercises/:id`.  
  Evidencia BFF: `front/src/app/api/exercises/[id]/route.ts`.

#### Tracking: crear 1 registro y confirmar persistencia
- `/app/seguimiento` permite crear checkin y food log.  
- Guarda vía `PUT /api/tracking`, luego recarga con `GET /api/tracking`.  
- **Persistencia existe** (modelo `Tracking` en Prisma).  
  Evidencia: `back/prisma/schema.prisma` modelo `Tracking`, `checkins`, `foodLog`, `workoutLog`.

#### Food log: registrar ítems por gramos y ver macros/calorías
- UI permite añadir item, elegir alimento (default profiles o `user-foods`), introducir gramos.  
- Cálculo: escala macros y kcal en base a 100g.  
  Evidencia: `TrackingClient.tsx` cálculo con `factor = grams / 100` (zona ~610-710).  
- **Riesgo:** `UserFood.unit` puede ser `unit` o `serving`, pero la UI escala siempre por gramos. Si se usa unit/serving se puede interpretar mal.  
  Evidencia: Prisma `UserFood.unit` enum y UI que no ajusta por unidad.

#### Onboarding (si existe)
- Existe `/app/onboarding` con 3 pasos.  
  Evidencia: `OnboardingClient.tsx` `LAST_STEP = 2`.  
- **Gap:** No cubre todos los campos que backend exige como “perfil completo” para IA.

#### Dashboard semanal (si existe)
- Rutas existen (por navegación y pantallas), pero no se validó en detalle su métrica principal en esta pasada. (Assunção: requiere exploración funcional manual o test E2E).

#### IA Nutrición: generar plan semanal + lista compra + ajuste (si existe)
- Backend: `POST /ai/nutrition-plan` genera JSON estructurado con `json_schema`, normaliza, valida y **guarda en tabla** con `saveNutritionPlan`.  
  Evidencia: `back/src/index.ts` líneas 4596-4639 y 4680-4687 (guarda y devuelve `plan`).  
- Front: llama a `/api/ai/nutrition-plan`, luego **además** hace `updateUserProfile({ nutritionPlan: plan })`.  
  Evidencia: `NutritionPlanClient.tsx` líneas 1154-1208 (guarda en perfil JSON).  
- **Resultado:** doble storage, alto riesgo de divergencia y UX confusa (pantallas `/app/nutricion` vs `/app/dietas`).

#### IA Fitness: generar plan + ajuste semanal (si existe)
- Backend: `POST /ai/training-plan` existe con guard y cuota (no se pegó aquí el bloque completo).  
- Front: entrenamiento principal persiste en `profile.trainingPlan` vía `PUT /api/profile`.  
  Evidencia: `TrainingPlanClient.tsx` líneas 496-535.

#### Gym Pilot: usuario se une a gym + admin gestiona + asigna plan (si existe)
- Backend:
  - `POST /gyms/join-by-code`, `POST /gym/join-code` (join por código)
  - `POST /gyms/join`, `POST /gym/join-request` (join request)
  - `GET /gyms/membership` y `GET /gym/me` (estado)  
  Evidencia: `back/src/index.ts` líneas 5793-5925 (incluye `gymRoutes.get("/me"... )`).
  - Admin join requests: `GET /admin/gym-join-requests`, accept/reject endpoints.  
  Evidencia: `back/src/index.ts` líneas 5960-6036.
- Front:
  - `/app/gym` intenta `GET /api/gym/me` y fallback a `GET /api/gyms/membership`.  
    Evidencia: `GymPageClient.tsx` líneas 140-155.
  - Admin join requests UI existe: `/app/admin/gym-requests`.  
- **Gap clave:** acción “asignar plan template” desde trainer/admin no está cerrada en FE. Además hay un BFF `POST /api/trainer/assign-training-plan` que no existe en backend (ver contratos).

---

### 2.3 Matriz de entitlements (Free / Nutrición Premium / Fitness Premium / Bundle / Gym)

**Fuente de verdad (backend)**
- Enum `SubscriptionPlan`: `FREE`, `STRENGTH_AI`, `NUTRI_AI`, `PRO`.  
  Evidencia: `back/prisma/schema.prisma` enum `SubscriptionPlan`.  
- Gym roles: `GymRole` con `MEMBER`, `TRAINER`, `ADMIN`.  
  Evidencia: `back/prisma/schema.prisma` enum `GymRole`.

Tabla (implementado vs planeado)
| Feature | Free | Nutrición Premium (NUTRI_AI) | Fitness Premium (STRENGTH_AI) | Bundle (PRO) | Gym |
|---|---|---|---|---|---|
| Login + /app protegido | Sí | Sí | Sí | Sí | Sí |
| Hoy + quick action (tracking) | Sí | Sí | Sí | Sí | Sí |
| Biblioteca ejercicios | Sí | Sí | Sí | Sí | Sí |
| Tracking persistente | Sí | Sí | Sí | Sí | Sí |
| Food log con macros/kcal (UI) | Sí (cálculo UI) | Sí | Sí | Sí | Sí |
| IA plan nutrición | No (guard por tokens) | Sí (token guard) | No | Sí | Depende plan/tokens |
| IA plan entrenamiento | No (guard por tokens) | No | Sí (token guard) | Sí | Depende plan/tokens |
| Gym join por código o request | Sí | Sí | Sí | Sí | Sí |
| Panel admin gyms y join requests | Admin-only | Admin-only | Admin-only | Admin-only | Sí (roles gym) |
| Asignar plan template a miembro | Incompleto en FE | Incompleto en FE | Incompleto en FE | Incompleto en FE | Objetivo piloto |

Notas:
- Implementación real de gating en backend se basa en token balance y guard de IA. La UX de tiers no está completamente reflejada en navegación y pantallas (gap).

---

## 3) Auditoría UX (mobile-first)

### Consistencia tab bar y navegación
- Tab bar existe y se monta en `front/src/app/(app)/app/layout.tsx` con `MobileTabBar`.  
- Hay items “disabled” visibles en navegación para usuarios finales, lo que choca con la regla de “ocultar funcionalidad incompleta”.  
  Evidencia: `navConfig.ts` define items con `disabled: true` en secciones.

### Estados obligatorios (loading/empty/error/success/disabled)
- En varias pantallas hay componentes de loading y empty state (bien). Ejemplo: trainer clients usa `LoadingState`, `EmptyState`, `ErrorState`.  
- En otras, se usan `Skeleton` y mensajes, pero no hay patrón único para “error con retry” en todo el producto (inconsistente).

### Copy/i18n: inconsistencias
- Duplicación de rutas Trainer en español (`/trainer`) y portugués (`/treinador`), implica riesgo de duplicidad funcional y confusión.  
- Labs usa etiquetas en portugués (“sem backend”) mezcladas con UI en español.

### 10 fricciones concretas (con recomendación)
1) CTA “Editar perfil” lleva a onboarding corto, no a un editor completo. Recomendación: crear “Perfil (editar)” que cubra el schema requerido por IA, o ampliar onboarding.  
2) “Perfil completo” se evalúa distinto en FE y BE. Recomendación: exportar un contrato común (schema) o endpoint `GET /profile/completion` calculado en backend.  
3) Planes guardados duplicados (perfil JSON + tablas). Recomendación: elegir una fuente de verdad, migrar UI principal a esa.  
4) Tabs deshabilitados visibles. Recomendación: ocultar en usuario final, dejar solo para admin.  
5) Gym page hace llamada primaria a endpoint que existe, pero la detección de soporte está basada en 404/405. Mantener fallback está bien, pero simplificar a un solo endpoint estable.  
6) Food log escala por gramos siempre, pero `UserFood.unit` permite otras unidades. Recomendación: normalizar todo a 100g y no exponer units, o soportar conversión real.  
7) Admin Users muestra tokens/plan que backend no devuelve. Recomendación: alinear tabla o esconder columnas.  
8) Labs marca “sem backend” en pantallas con backend. Recomendación: corregir el catálogo de Labs para no confundir.  
9) Navegación mezcla “entrenamiento” y “entrenamientos”, “dietas” y “nutricion”, sugiere dos modelos de datos paralelos. Recomendación: consolidar información y nombres.  
10) Protección de sesión basada solo en cookie. Recomendación: añadir verificación ligera (por ejemplo ping a `/api/auth/me` en layout) y limpiar cookie si 401.

---

## 4) Auditoría de Arquitectura y Contratos

### 4.1 Arquitectura real (Frontend + BFF + Backend)
- Frontend: Next.js App Router. Rutas UI en `src/app/(app)/app/*`.  
- BFF: Next route handlers en `src/app/api/*` que hacen fetch al backend y pasan cookie `fs_token`.  
- Backend: Fastify en `back/src/index.ts`, Prisma, JWT cookie `fs_token`.  

Zonas sensibles:
- `fs_token` es el mecanismo central de auth. Front lo lee en middleware y BFF lo reenvía como cookie.  
- No romper rutas `/api/*`: están ampliamente usadas por UI.

### 4.2 Contratos FE↔BE (mapa)

Resumen:
- La mayoría de endpoints BFF existen en backend.
- **Faltan 6 endpoints** que FE declara en BFF pero backend no implementa:
  - `PATCH /admin/users/:id/plan`
  - `POST /admin/users/:id/tokens/add`
  - `PATCH /admin/users/:id/tokens/balance`
  - `PATCH /admin/users/:id/tokens`
  - `PATCH /admin/users/:id/tokens-allowance`
  - `POST /trainer/assign-training-plan`

Evidencia:
- Lista BFF: `front/src/app/api/**/route.ts`.  
- Backend no contiene esos paths en `back/src/index.ts`.

Mismatches de response relevantes:
- `GET /admin/users` en backend devuelve campos básicos (id, email, role, etc), pero FE espera además `subscriptionPlan`, `aiTokenBalance`, `aiTokenMonthlyAllowance`, etc.  
  Evidencia FE: `AdminUsersClient.tsx` type `UserRow`.  
  Evidencia BE: `back/src/index.ts` handler `GET /admin/users` (retorna payload sin plan/tokens).

### 4.3 IA (assistiva)
- Backend usa OpenAI con salida estructurada `json_schema` y validación, y persiste el plan (nutrición) en tabla.  
  Evidencia: `back/src/index.ts` bloque `/ai/nutrition-plan` con `responseFormat: json_schema` y `saveNutritionPlan`.
- Riesgos:
  - Perfil incompleto bloquea IA (409) y UI no guía bien al usuario.  
  - Logging: backend `logger: true`, revisar que no se loguea PII en prompts o resultados. No se auditó el logger en profundidad aquí (Assunção).
- Mitigaciones recomendadas:
  - Sanitizar logs, no incluir prompts completos ni datos sensibles.  
  - Guardar solo JSON validado, ya se está haciendo en nutrición, replicar patrón en entrenamiento.

---

## 5) Calidad y Release Readiness (con evidencia)

### 5.1 Evidencia técnica (PASS/FAIL)
No se pudo ejecutar build/lint/tests de forma confiable en este entorno porque la instalación de dependencias (`npm ci`) fue terminada por señal (SIGTERM) durante la descarga. Esto bloquea un veredicto verificable de CI local.

Evidencia: log generado durante el intento muestra terminación:
- `front_quality.txt` contiene `process terminated` (SIGTERM) durante `npm ci`.

Estado:
- build web: FAIL (no verificable en este entorno)
- lint web: FAIL (no verificable)
- typecheck web: FAIL (no verificable)
- tests web: FAIL (no verificable)
- build api: FAIL (no verificable)
- tests api: FAIL (no verificable)

Recomendación: ejecutar en CI del repo (GitHub Actions) con cache de npm y adjuntar el output en el PR.

### 5.2 Checklist DoD + MVP Modular + Gym (PASS/FAIL + motivo)

A) DoD mínimo:
- login: PASS (server action setea `fs_token`)
- /app protegido: PASS parcial (cookie check, no valida token)
- tab bar: PASS
- Hoy + 1 acción: PASS (tracking)
- tracking persistente: PASS (modelo y endpoint existen)
- biblioteca lista+detalle: PASS

B) Entitlements modular: FAIL
- Planes enum existen, pero UI y contratos no reflejan claramente tiers, y endpoints admin para ajustar plan/tokens faltan.

C) Free: FAIL parcial
- Métricas básicas y tracking sí, food log sí, pero performance y calidad no verificadas por falta de build/test.

D) Nutrición Premium: FAIL
- Backend genera y guarda en tabla, FE guarda también en perfil, no hay flujo coherente, lista compra y ajustes necesitan confirmación end-to-end.

E) Fitness Premium: FAIL
- Persistencia en perfil, posible divergencia con `training-plans` tabla, ajuste semanal no verificado.

F) Gym Pilot: PASS parcial
- Join por código/request y admin join requests existen, falta asignación de plan template cerrada en FE y entitlements gym claros.

---

## 6) Hallazgos priorizados (tabla)

| ID | Severidad | Área | Hallazgo | Impacto | Evidencia | Recomendación | Owner sugerido | Esfuerzo |
|---|---|---|---|---|---|---|---|---|
| FS-001 | Crítico | Seguridad | Credenciales expuestas en `back/README.md` | Compromiso inmediato de infra | Archivo `back/README.md` (no pegar secretos) | Rotar credenciales, borrar del repo, activar secret scanning | Backend + DevOps | S |
| FS-002 | Crítico | Producto/Arquitectura | Doble fuente de verdad para planes (perfil JSON vs tablas) | Bugs, inconsistencia UX, soporte caro | FE guarda en `updateUserProfile`, BE guarda en `saveNutritionPlan` | Elegir una fuente, migrar UI principal y datos | Full-stack | M |
| FS-003 | Alto | UX/Producto | “Editar perfil” manda a onboarding corto y no completa schema IA | IA bloqueada, churn | `ProfileSummaryClient.tsx` 148-150, `OnboardingClient.tsx` LAST_STEP=2 | Crear editor de perfil completo, o ampliar onboarding | FE + Producto | M |
| FS-004 | Alto | Contratos | `GET /admin/users` no devuelve plan/tokens que FE espera | Admin panel roto o inconsistente | `AdminUsersClient.tsx` vs `back/src/index.ts` admin users | Alinear contrato o ajustar UI y types | Full-stack | S |
| FS-005 | Alto | Contratos | Endpoints admin tokens/plan existen en FE BFF pero no en backend | Features admin incompletas, confusión | Lista BFF `/api/admin/users/:id/tokens*` | Implementar endpoints o eliminar UI | Backend | M |
| FS-006 | Medio | Auth/UX | Middleware solo comprueba cookie presente | Navegación con sesión inválida | `front/src/middleware.ts` 12-18 | Validar con `/api/auth/me` en layout, limpiar cookie en 401 | FE | S |
| FS-007 | Medio | i18n | Duplicación `/trainer` y `/treinador` | Deuda, confusión rutas | Rutas detectadas | Consolidar y usar i18n real, no duplicar rutas | FE | M |
| FS-008 | Medio | Producto | Labs etiqueta “sem backend” incorrectamente | Señal de baja calidad | `AdminLabsClient.tsx` | Revisar catálogo Labs y esconderlo en prod | FE | S |

---

## 7) Próximos pasos (roadmap, 3 sprints)

### Sprint 1, “Perfil y fuente de verdad”
Goal: desbloquear IA y estabilizar datos.
- Entra: pantalla de edición de perfil completa alineada con backend `profileSchema`, CTA “Editar perfil” a esa pantalla, unificar check de completitud (idealmente backend-driven), ocultar features incompletas en usuario final.
- No entra: nuevos módulos enterprise.
- Métricas: % usuarios con perfil completo, tasa de éxito de `POST /ai/*`, reducción de errores 409/402.
- Riesgos: migración de campos, i18n del formulario.

### Sprint 2, “Planes coherentes”
Goal: una sola fuente de planes.
- Entra: decidir “tablas” como fuente, adaptar `/app/nutricion` y `/app/entrenamiento` a consumir `nutrition-plans` y `training-plans`, o al revés si se decide perfil JSON, pero con una sola vía. Resolver listado y detalle, y “shopping list” si ya existe en backend.
- No entra: funcionalidades nuevas de entrenamiento social.
- Métricas: divergencias cero entre pantallas, tasa de carga plan sin fallback, menos bugs de soporte.

### Sprint 3, “Gym Pilot vendible”
Goal: flujo completo gym pequeño.
- Entra: join por código/request, panel admin para aceptar, trainer ve clientes, asignación de plan template desde trainer/admin (cerrar endpoints y UI), permisos por rol gym.
- No entra: billing avanzado enterprise.
- Métricas: tiempo de setup gym < 15 min, % asignaciones exitosas, retención semanal en gym.

---

## 8) Anexos

### 8.1 Árbol de rutas/pantallas (extracto)
Core:
- `/login`, `/signup`
- `/app/hoy`, `/app/biblioteca`, `/app/biblioteca/:id`
- `/app/seguimiento`, `/app/macros`
- `/app/entrenamiento`, `/app/nutricion`, `/app/dietas`
- `/app/profile`, `/app/settings`, `/app/gym`

Admin:
- `/app/admin`, `/app/admin/users`, `/app/admin/gyms`, `/app/admin/gym-requests`, `/app/admin/labs`

Trainer:
- `/app/trainer/*` y duplicado `/app/treinador/*`

### 8.2 Lista de feature flags/toggles
No se detectó un sistema formal de feature flags. Hay gating por rol en navegación (`useAccess`, `navConfig.ts`) y “Labs” como hub. Recomendación: introducir flags server-driven si se necesita modularidad real.

### 8.3 Secretos
Se detectaron secretos en documentación del backend. No se pegan aquí. Acción: rotar y eliminar del repo.

---
Fin del documento.
