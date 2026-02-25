# Contract Audit Report

Generated at: 2026-02-24T19:04:06.987Z

- BFF routes audited: 108
- Backend routes discovered: 105
- Matched: 91
- Missing backend contract: 17

## Missing routes

| Method | BFF path | Backend target | Source |
|---|---|---|---|
| POST | /api/admin/gym-join-requests/:membershipId/:action | /api/admin/gym-join-requests/:param/:param | apps/web/src/app/api/admin/gym-join-requests/[membershipId]/[action]/route.ts |
| PATCH | /api/admin/users/:id/plan | /api/admin/users/:param/plan | apps/web/src/app/api/admin/users/[id]/plan/route.ts |
| PATCH | /api/admin/users/:id/tokens | /api/admin/users/:param/tokens | apps/web/src/app/api/admin/users/[id]/tokens/route.ts |
| PATCH | /api/admin/users/:id/tokens-allowance | /api/admin/users/:param/tokens-allowance | apps/web/src/app/api/admin/users/[id]/tokens-allowance/route.ts |
| POST | /api/admin/users/:id/tokens/add | /api/admin/users/:param/tokens/add | apps/web/src/app/api/admin/users/[id]/tokens/add/route.ts |
| PATCH | /api/admin/users/:id/tokens/balance | /api/admin/users/:param/tokens/balance | apps/web/src/app/api/admin/users/[id]/tokens/balance/route.ts |
| POST | /api/trainer/assign-training-plan | (dynamic/unresolved) | apps/web/src/app/api/trainer/assign-training-plan/route.ts |
| GET | /api/trainer/capabilities | (dynamic/unresolved) | apps/web/src/app/api/trainer/capabilities/route.ts |
| GET | /api/trainer/clients/:id/notes | (dynamic/unresolved) | apps/web/src/app/api/trainer/clients/[id]/notes/route.ts |
| POST | /api/trainer/clients/:id/notes | (dynamic/unresolved) | apps/web/src/app/api/trainer/clients/[id]/notes/route.ts |
| GET | /api/trainer/join-requests | (dynamic/unresolved) | apps/web/src/app/api/trainer/join-requests/route.ts |
| POST | /api/trainer/join-requests/:membershipId/:action | (dynamic/unresolved) | apps/web/src/app/api/trainer/join-requests/[membershipId]/[action]/route.ts |
| POST | /api/trainer/join-requests/:membershipId/accept | (dynamic/unresolved) | apps/web/src/app/api/trainer/join-requests/[membershipId]/accept/route.ts |
| POST | /api/trainer/join-requests/:membershipId/reject | (dynamic/unresolved) | apps/web/src/app/api/trainer/join-requests/[membershipId]/reject/route.ts |
| GET | /api/trainer/members | (dynamic/unresolved) | apps/web/src/app/api/trainer/members/route.ts |
| PUT | /api/trainer/plans/:id | /api/trainer/plans/:param | apps/web/src/app/api/trainer/plans/[id]/route.ts |
| POST | /api/training-plans/active | (dynamic/unresolved) | apps/web/src/app/api/training-plans/active/route.ts |

## Focus: admin users + tokens*/plan

| Status | Method | BFF path | Backend target |
|---|---|---|---|
| matched | PATCH | /api/admin/users/:id/block | /api/admin/users/:param/block |
| missing | PATCH | /api/admin/users/:id/plan | /api/admin/users/:param/plan |
| matched | POST | /api/admin/users/:id/reset-password | /api/admin/users/:param/reset-password |
| missing | PATCH | /api/admin/users/:id/tokens | /api/admin/users/:param/tokens |
| missing | PATCH | /api/admin/users/:id/tokens-allowance | /api/admin/users/:param/tokens-allowance |
| missing | POST | /api/admin/users/:id/tokens/add | /api/admin/users/:param/tokens/add |
| missing | PATCH | /api/admin/users/:id/tokens/balance | /api/admin/users/:param/tokens/balance |
| matched | PATCH | /api/admin/users/:id/unblock | /api/admin/users/:param/unblock |
| matched | POST | /api/admin/users/:id/verify-email | /api/admin/users/:param/verify-email |
| matched | GET | /api/billing/plans | (dynamic/unresolved) |
| matched | GET | /api/trainer/plans | /api/trainer/plans |
| matched | POST | /api/trainer/plans | /api/trainer/plans |
| matched | DELETE | /api/trainer/plans/:id | /api/trainer/plans/:param |
| matched | GET | /api/trainer/plans/:id | /api/trainer/plans/:param |
| matched | PATCH | /api/trainer/plans/:id | /api/trainer/plans/:param |
| missing | PUT | /api/trainer/plans/:id | /api/trainer/plans/:param |
| matched | DELETE | /api/trainer/plans/:id/days/:dayId | /api/trainer/plans/:param/days/:param |
| matched | POST | /api/trainer/plans/:id/days/:dayId/exercises | /api/trainer/plans/:param/days/:param/exercises |
| matched | DELETE | /api/trainer/plans/:id/days/:dayId/exercises/:exerciseId | /api/trainer/plans/:param/days/:param/exercises/:param |
| matched | PATCH | /api/trainer/plans/:id/days/:dayId/exercises/:exerciseId | /api/trainer/plans/:param/days/:param/exercises/:param |