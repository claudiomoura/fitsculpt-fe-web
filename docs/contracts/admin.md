# Admin/BFF contract audit snapshot

Fuente: `node tools/contract-audit/run.mjs`.
Snapshot actual: `tools/contract-audit/output/report.json` y `tools/contract-audit/output/report.md`.

## Rutas auditadas: `/api/admin/users/[id]/*`

| Estado | Método | Ruta BFF | Target backend detectado |
|---|---|---|---|
| matched | PATCH | `/api/admin/users/:id/block` | `/api/admin/users/:param/block` |
| missing | PATCH | `/api/admin/users/:id/plan` | `/api/admin/users/:param/plan` |
| matched | POST | `/api/admin/users/:id/reset-password` | `/api/admin/users/:param/reset-password` |
| missing | PATCH | `/api/admin/users/:id/tokens` | `/api/admin/users/:param/tokens` |
| missing | PATCH | `/api/admin/users/:id/tokens-allowance` | `/api/admin/users/:param/tokens-allowance` |
| missing | POST | `/api/admin/users/:id/tokens/add` | `/api/admin/users/:param/tokens/add` |
| missing | PATCH | `/api/admin/users/:id/tokens/balance` | `/api/admin/users/:param/tokens/balance` |
| matched | PATCH | `/api/admin/users/:id/unblock` | `/api/admin/users/:param/unblock` |
| matched | POST | `/api/admin/users/:id/verify-email` | `/api/admin/users/:param/verify-email` |

## Rutas detectadas con `tokens*` o `plan`

| Estado | Método | Ruta BFF |
|---|---|---|
| missing | PATCH | `/api/admin/users/:id/plan` |
| missing | PATCH | `/api/admin/users/:id/tokens` |
| missing | PATCH | `/api/admin/users/:id/tokens-allowance` |
| missing | POST | `/api/admin/users/:id/tokens/add` |
| missing | PATCH | `/api/admin/users/:id/tokens/balance` |
| matched | GET | `/api/billing/plans` |
| matched | GET | `/api/trainer/plans` |
| matched | POST | `/api/trainer/plans` |
| matched | DELETE | `/api/trainer/plans/:id` |
| matched | GET | `/api/trainer/plans/:id` |
| matched | PATCH | `/api/trainer/plans/:id` |
| missing | PUT | `/api/trainer/plans/:id` |
| matched | DELETE | `/api/trainer/plans/:id/days/:dayId` |
| matched | POST | `/api/trainer/plans/:id/days/:dayId/exercises` |
| matched | DELETE | `/api/trainer/plans/:id/days/:dayId/exercises/:exerciseId` |
| matched | PATCH | `/api/trainer/plans/:id/days/:dayId/exercises/:exerciseId` |

## Decisión propuesta para rutas missing

| Método | Ruta BFF missing | Propuesta |
|---|---|---|
| PATCH | `/api/admin/users/:id/plan` | **Implementar backend** |
| PATCH | `/api/admin/users/:id/tokens` | **Implementar backend** |
| PATCH | `/api/admin/users/:id/tokens-allowance` | **Implementar backend** |
| POST | `/api/admin/users/:id/tokens/add` | **Implementar backend** |
| PATCH | `/api/admin/users/:id/tokens/balance` | **Implementar backend** |
| PUT | `/api/trainer/plans/:id` | **Eliminar BFF** (backend ya expone PATCH para update) |

