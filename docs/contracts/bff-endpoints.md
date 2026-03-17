# BFF Endpoints Inventory

Generated from `apps/web/src/app/api/**/route.ts` via `npm --prefix apps/web run endpoints:inventory`.

| Path | Methods | Source |
| --- | --- | --- |
| `/api/admin/gym-join-requests` | GET | `apps/web/src/app/api/admin/gym-join-requests/route.ts` |
| `/api/admin/gym-join-requests/[membershipId]/[action]` | POST | `apps/web/src/app/api/admin/gym-join-requests/[membershipId]/[action]/route.ts` |
| `/api/admin/gym-join-requests/[membershipId]/accept` | POST | `apps/web/src/app/api/admin/gym-join-requests/[membershipId]/accept/route.ts` |
| `/api/admin/gym-join-requests/[membershipId]/reject` | POST | `apps/web/src/app/api/admin/gym-join-requests/[membershipId]/reject/route.ts` |
| `/api/admin/gyms` | GET, POST | `apps/web/src/app/api/admin/gyms/route.ts` |
| `/api/admin/gyms/[gymId]` | DELETE | `apps/web/src/app/api/admin/gyms/[gymId]/route.ts` |
| `/api/admin/gyms/[gymId]/members` | GET | `apps/web/src/app/api/admin/gyms/[gymId]/members/route.ts` |
| `/api/admin/gyms/[gymId]/members/[userId]/assign-training-plan` | POST | `apps/web/src/app/api/admin/gyms/[gymId]/members/[userId]/assign-training-plan/route.ts` |
| `/api/admin/gyms/[gymId]/members/[userId]/role` | PATCH | `apps/web/src/app/api/admin/gyms/[gymId]/members/[userId]/role/route.ts` |
| `/api/admin/users` | GET, POST | `apps/web/src/app/api/admin/users/route.ts` |
| `/api/admin/users/[id]` | DELETE | `apps/web/src/app/api/admin/users/[id]/route.ts` |
| `/api/admin/users/[id]/block` | PATCH | `apps/web/src/app/api/admin/users/[id]/block/route.ts` |
| `/api/admin/users/[id]/gym-role` | GET, POST | `apps/web/src/app/api/admin/users/[id]/gym-role/route.ts` |
| `/api/admin/users/[id]/reset-password` | POST | `apps/web/src/app/api/admin/users/[id]/reset-password/route.ts` |
| `/api/admin/users/[id]/unblock` | PATCH | `apps/web/src/app/api/admin/users/[id]/unblock/route.ts` |
| `/api/admin/users/[id]/verify-email` | POST | `apps/web/src/app/api/admin/users/[id]/verify-email/route.ts` |
| `/api/ai/daily-tip` | POST | `apps/web/src/app/api/ai/daily-tip/route.ts` |
| `/api/ai/nutrition-plan` | POST | `apps/web/src/app/api/ai/nutrition-plan/route.ts` |
| `/api/ai/nutrition-plan/generate` | POST | `apps/web/src/app/api/ai/nutrition-plan/generate/route.ts` |
| `/api/ai/quota` | GET | `apps/web/src/app/api/ai/quota/route.ts` |
| `/api/ai/training-plan` | POST | `apps/web/src/app/api/ai/training-plan/route.ts` |
| `/api/ai/training-plan/generate` | POST | `apps/web/src/app/api/ai/training-plan/generate/route.ts` |
| `/api/auth/change-password` | POST | `apps/web/src/app/api/auth/change-password/route.ts` |
| `/api/auth/google/callback` | GET | `apps/web/src/app/api/auth/google/callback/route.ts` |
| `/api/auth/google/start` | GET | `apps/web/src/app/api/auth/google/start/route.ts` |
| `/api/auth/me` | GET | `apps/web/src/app/api/auth/me/route.ts` |
| `/api/auth/resend-verification` | POST | `apps/web/src/app/api/auth/resend-verification/route.ts` |
| `/api/auth/verify-email` | GET | `apps/web/src/app/api/auth/verify-email/route.ts` |
| `/api/billing/checkout` | POST | `apps/web/src/app/api/billing/checkout/route.ts` |
| `/api/billing/plans` | GET | `apps/web/src/app/api/billing/plans/route.ts` |
| `/api/billing/portal` | POST | `apps/web/src/app/api/billing/portal/route.ts` |
| `/api/billing/status` | GET | `apps/web/src/app/api/billing/status/route.ts` |
| `/api/exercises` | GET, POST | `apps/web/src/app/api/exercises/route.ts` |
| `/api/exercises/[id]` | GET | `apps/web/src/app/api/exercises/[id]/route.ts` |
| `/api/feed` | GET | `apps/web/src/app/api/feed/route.ts` |
| `/api/feed/generate` | POST | `apps/web/src/app/api/feed/generate/route.ts` |
| `/api/gym-flow/approve` | POST | `apps/web/src/app/api/gym-flow/approve/route.ts` |
| `/api/gym-flow/assign` | POST, DELETE | `apps/web/src/app/api/gym-flow/assign/route.ts` |
| `/api/gym-flow/assigned-plan` | GET, POST, DELETE | `apps/web/src/app/api/gym-flow/assigned-plan/route.ts` |
| `/api/gym-flow/join` | POST | `apps/web/src/app/api/gym-flow/join/route.ts` |
| `/api/gym-flow/members` | GET | `apps/web/src/app/api/gym-flow/members/route.ts` |
| `/api/gym/admin/members/[userId]/role` | PATCH | `apps/web/src/app/api/gym/admin/members/[userId]/role/route.ts` |
| `/api/gym/join-code` | POST | `apps/web/src/app/api/gym/join-code/route.ts` |
| `/api/gym/join-request` | POST | `apps/web/src/app/api/gym/join-request/route.ts` |
| `/api/gym/me` | GET, DELETE | `apps/web/src/app/api/gym/me/route.ts` |
| `/api/gyms` | GET | `apps/web/src/app/api/gyms/route.ts` |
| `/api/gyms/join` | POST | `apps/web/src/app/api/gyms/join/route.ts` |
| `/api/gyms/join-by-code` | POST | `apps/web/src/app/api/gyms/join-by-code/route.ts` |
| `/api/gyms/membership` | GET, DELETE | `apps/web/src/app/api/gyms/membership/route.ts` |
| `/api/nutrition-plans` | GET | `apps/web/src/app/api/nutrition-plans/route.ts` |
| `/api/nutrition-plans/[id]` | GET | `apps/web/src/app/api/nutrition-plans/[id]/route.ts` |
| `/api/nutrition-plans/assigned` | GET | `apps/web/src/app/api/nutrition-plans/assigned/route.ts` |
| `/api/profile` | GET, PUT | `apps/web/src/app/api/profile/route.ts` |
| `/api/recipes` | GET | `apps/web/src/app/api/recipes/route.ts` |
| `/api/recipes/[id]` | GET | `apps/web/src/app/api/recipes/[id]/route.ts` |
| `/api/review/weekly` | GET | `apps/web/src/app/api/review/weekly/route.ts` |
| `/api/tracking` | GET, POST, PUT | `apps/web/src/app/api/tracking/route.ts` |
| `/api/tracking/[collection]/[id]` | DELETE | `apps/web/src/app/api/tracking/[collection]/[id]/route.ts` |
| `/api/trainer/assign-training-plan` | POST | `apps/web/src/app/api/trainer/assign-training-plan/route.ts` |
| `/api/trainer/capabilities` | GET | `apps/web/src/app/api/trainer/capabilities/route.ts` |
| `/api/trainer/clients` | GET | `apps/web/src/app/api/trainer/clients/route.ts` |
| `/api/trainer/clients/[id]` | GET, DELETE | `apps/web/src/app/api/trainer/clients/[id]/route.ts` |
| `/api/trainer/clients/[id]/assigned-nutrition-plan` | GET, POST, DELETE | `apps/web/src/app/api/trainer/clients/[id]/assigned-nutrition-plan/route.ts` |
| `/api/trainer/clients/[id]/assigned-plan` | GET, POST, DELETE | `apps/web/src/app/api/trainer/clients/[id]/assigned-plan/route.ts` |
| `/api/trainer/clients/[id]/notes` | GET, POST, OPTIONS | `apps/web/src/app/api/trainer/clients/[id]/notes/route.ts` |
| `/api/trainer/clients/[id]/plan` | — | `apps/web/src/app/api/trainer/clients/[id]/plan/route.ts` |
| `/api/trainer/join-requests` | GET | `apps/web/src/app/api/trainer/join-requests/route.ts` |
| `/api/trainer/join-requests/[membershipId]/[action]` | POST | `apps/web/src/app/api/trainer/join-requests/[membershipId]/[action]/route.ts` |
| `/api/trainer/join-requests/[membershipId]/accept` | POST | `apps/web/src/app/api/trainer/join-requests/[membershipId]/accept/route.ts` |
| `/api/trainer/join-requests/[membershipId]/reject` | POST | `apps/web/src/app/api/trainer/join-requests/[membershipId]/reject/route.ts` |
| `/api/trainer/members` | GET | `apps/web/src/app/api/trainer/members/route.ts` |
| `/api/trainer/members/[id]/assigned-plan` | — | `apps/web/src/app/api/trainer/members/[id]/assigned-plan/route.ts` |
| `/api/trainer/members/[id]/nutrition-plan-assignment` | POST, DELETE, OPTIONS | `apps/web/src/app/api/trainer/members/[id]/nutrition-plan-assignment/route.ts` |
| `/api/trainer/members/[id]/training-plan-assignment` | POST, DELETE, OPTIONS | `apps/web/src/app/api/trainer/members/[id]/training-plan-assignment/route.ts` |
| `/api/trainer/nutrition-plans` | GET, POST | `apps/web/src/app/api/trainer/nutrition-plans/route.ts` |
| `/api/trainer/nutrition-plans/[id]` | GET, PATCH, DELETE | `apps/web/src/app/api/trainer/nutrition-plans/[id]/route.ts` |
| `/api/trainer/plans` | GET, POST | `apps/web/src/app/api/trainer/plans/route.ts` |
| `/api/trainer/plans/[id]` | GET, PUT, PATCH, DELETE, OPTIONS | `apps/web/src/app/api/trainer/plans/[id]/route.ts` |
| `/api/trainer/plans/[id]/days/[dayId]` | DELETE, OPTIONS | `apps/web/src/app/api/trainer/plans/[id]/days/[dayId]/route.ts` |
| `/api/trainer/plans/[id]/days/[dayId]/exercises` | POST, OPTIONS | `apps/web/src/app/api/trainer/plans/[id]/days/[dayId]/exercises/route.ts` |
| `/api/trainer/plans/[id]/days/[dayId]/exercises/[exerciseId]` | PATCH, DELETE, OPTIONS | `apps/web/src/app/api/trainer/plans/[id]/days/[dayId]/exercises/[exerciseId]/route.ts` |
| `/api/training-plans` | GET, POST | `apps/web/src/app/api/training-plans/route.ts` |
| `/api/training-plans/[id]` | GET | `apps/web/src/app/api/training-plans/[id]/route.ts` |
| `/api/training-plans/[id]/days/[dayId]/exercises` | POST | `apps/web/src/app/api/training-plans/[id]/days/[dayId]/exercises/route.ts` |
| `/api/training-plans/active` | GET, POST | `apps/web/src/app/api/training-plans/active/route.ts` |
| `/api/user-foods` | GET, POST | `apps/web/src/app/api/user-foods/route.ts` |
| `/api/user-foods/[id]` | PUT, DELETE | `apps/web/src/app/api/user-foods/[id]/route.ts` |
| `/api/workout-sessions/[id]` | PATCH | `apps/web/src/app/api/workout-sessions/[id]/route.ts` |
| `/api/workout-sessions/[id]/finish` | POST | `apps/web/src/app/api/workout-sessions/[id]/finish/route.ts` |
| `/api/workouts` | GET, POST | `apps/web/src/app/api/workouts/route.ts` |
| `/api/workouts/[id]` | GET, PATCH, DELETE | `apps/web/src/app/api/workouts/[id]/route.ts` |
| `/api/workouts/[id]/start` | POST | `apps/web/src/app/api/workouts/[id]/start/route.ts` |
