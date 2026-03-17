# Domain ownership (BETA-7)

Este documento define ownership mínimo por dominio en `apps/web/src` sin cambiar rutas, contratos ni comportamiento.

## Mapa de ownership

| Dominio | Carpetas/código principal | Rutas/páginas relacionadas (App Router) | Servicios/APIs principales |
| --- | --- | --- | --- |
| Auth | `src/domains/auth`, `src/lib/auth/*`, `src/context/auth/*`, `src/app/(auth)/*` | `/login`, `/register`, `/verify-email`, `/auth/google/*` | `GET /api/auth/me`, verify/resend email, session role helpers |
| AI | `src/domains/ai`, `src/components/access/*`, `src/components/training-plan/aiPlanGeneration.ts`, `src/lib/aiErrorMapping.ts` | `/app/entrenamiento`, `/app/nutricion`, `/app/seguimiento`, `/app/feed` | `POST /api/ai/training-plan/generate`, `POST /api/ai/nutrition-plan/generate`, `GET /api/ai/quota` |
| Gym | `src/domains/gym`, `src/services/gym.ts`, `src/lib/gymMembership.ts`, `src/components/gym/*` | `/app/gym`, `/app/gym/admin`, `/app/(trainer)/*`, `/app/(admin)/admin/gyms` | `/api/gym/*`, `/api/gyms/*`, `/api/trainer/join-requests/*` |
| Training | `src/domains/training`, `src/services/trainingPlans.ts`, `src/lib/trainingPlanAdjustment.ts`, `src/components/training-plan/*` | `/app/entrenamiento`, `/app/entrenamientos`, `/app/(trainer)/trainer/plans*` | `/api/training-plans*`, `/api/trainer/plans*`, `/api/ai/training-plan*` |
| Nutrition | `src/domains/nutrition`, `src/services/nutrition.ts`, `src/lib/nutritionPlanLibrary.ts`, `src/components/nutrition/*` | `/app/nutricion`, `/app/dietas`, `/app/(trainer)/trainer/nutrition-plans`, `/app/biblioteca/recetas/*` | `/api/ai/nutrition-plan*`, `/api/nutrition-plans*`, `/api/recipes/*` |
| Billing | `src/domains/billing`, `src/services/billing.ts`, `src/app/(app)/app/settings/billing/*` | `/app/settings/billing`, `/pricing` | `/api/billing/plans`, `/api/billing/checkout`, `/api/billing/portal`, `/api/billing/status` |
| Library | `src/domains/library`, `src/components/exercise-library/*`, `src/services/exercises*` | `/app/biblioteca`, `/app/biblioteca/[exerciseId]`, `/app/biblioteca/entrenamientos/*` | `/api/exercises*`, `/api/training-plans`, componentes de lista/detalle |

## Public API por dominio

- Cada dominio expone su API estable desde `src/domains/<dominio>/index.ts`.
- Consumidores fuera del dominio deben importar desde `@/domains/<dominio>` y evitar imports profundos directos.
- Los barrels son delgados: re-exportan utilidades/servicios existentes sin mover rutas ni lógica de negocio.

## Cómo tocar cada dominio (reglas rápidas)

- **Auth**
  - Cambios de sesión/claims pasan por utilidades en `src/lib/auth` y export público en `src/domains/auth`.
  - No mezclar reglas de entitlements AI en este dominio.
- **AI**
  - Entitlements + generación de planes deben exponerse vía `src/domains/ai`.
  - Mantener mapeo de errores AI centralizado, sin duplicar parsers por pantalla.
- **Gym**
  - Acceso a membership/join-requests por `src/domains/gym`.
  - Evitar que componentes trainer/admin hagan imports directos profundos de `services/gym`.
- **Training**
  - Ajustes de plan y API de training plans salen por `src/domains/training`.
  - No introducir lógica de UI dentro de servicios de dominio.
- **Nutrition**
  - Generación AI y helpers de selección de plan desde `src/domains/nutrition`.
  - No acoplar componentes de UI a shape interna del backend fuera de helpers.
- **Billing**
  - Flujos checkout/portal/plans sólo por `src/domains/billing`.
  - Mantener manejo de errores de config centralizado en servicio.
- **Library**
  - Componentes reutilizables de biblioteca se consumen por `src/domains/library`.
  - Evitar imports a subcarpetas internas salvo dentro del propio dominio.

## Qué se movió y qué no

- Se agregaron carpetas de dominio y barrels (`index.ts`) para ownership mínimo.
- Se reemplazaron algunos imports cruzados de alto impacto para consumir el public API de dominio.
- **No** se movieron páginas/rutas de Next App Router.
- **No** se cambiaron contratos de API ni payloads.
- **No** se introdujeron cambios visuales ni de UX.
