# sprint-01/pr-05-integration-rc-hardening

## Dependencias

Este PR depende de:

- PR-02 (contratos finales de membresía)
- PR-03 (entitlements + admin override)
- PR-04 (base de integración previa)

## Integración FE↔BE aplicada

- Se habilitó en FE el proxy faltante para acciones de aprobación/rechazo de solicitudes de ingreso a gym:
  - `POST /api/admin/gym-join-requests/:membershipId/:action`
  - Forward a backend final:
    - `POST /admin/gym-join-requests/:membershipId/accept`
    - `POST /admin/gym-join-requests/:membershipId/reject`
- Se valida `action` (`accept` | `reject`) y se retorna `400 INVALID_ACTION` para valores inválidos.

## Errores críticos corregidos

- **404/405 (Admin → Gym requests)**: la UI invocaba `/api/admin/gym-join-requests/:id/:action` y no existía route handler en FE.
  - Estado anterior: `404` o `405` al aceptar/rechazar.
  - Estado nuevo: proxy operativo hacia backend, sin endpoint inexistente para este flujo.

## Checklist DoD manual (mínimo)

> Ejecución manual en entorno local de integración; evidencia sin tokens/cookies.

| Ítem | Resultado | Notas |
|---|---|---|
| Login y acceso a `/app` protegido | PASS | Redirección/guard funcional sin errores críticos en consola. |
| Navegación móvil básica | PASS | Menú y rutas principales sin crash. |
| Admin navega secciones clave | PASS | Sin 500/404/405 en rutas validadas. |
| Gym Admin carga miembros | PASS | Vista de miembros y acciones sin 500. |
| Trainer carga clientes | PASS | Listado de clientes cargado sin 500. |
| Pantallas llamando endpoints inexistentes | PASS | Corregido endpoint de action para gym join requests. |

## Comandos ejecutados

- `npm run lint` (en `apps/web`)
- `npm test` (en `apps/web`)
- `npx tsc --noEmit` (en `apps/web`)
- `npm run build` (en `apps/web`)

## Evidencia visual sugerida para QA del PR

Capturar (sin datos sensibles):

1. `/app/admin/gyms` con listado visible.
2. `/app/gym/admin` con miembros visibles.
3. `/app/trainer/clients` con clientes visibles.
4. Acción accept/reject desde admin gym requests (estado previo/post acción).
