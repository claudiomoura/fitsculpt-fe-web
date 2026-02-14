# MVP Done vs Gap Audit Matrix (RC Readiness)

Source of truth for MVP scope: `apps/docs/PROJECT_BRIEF.md`.

## Matrix

| MVP item (Project Brief) | Status | Evidence pointer(s) | Notes / Gap to close |
|---|---|---|---|
| Authentication and stable session (`fs_token`) | Done | `apps/docs/PROJECT_STATUS.md` → “Implementado” includes “Autenticação funcional” and “Gestão de sessão estável via cookie (fs_token)”. | Keep out of this sprint scope (no auth/session changes). |
| Simple onboarding (goal, level, preferences) | Done | `apps/docs/PROJECT_STATUS.md` → “Implementado” includes “Perfil de utilizador e onboarding base”. | Validate UX consistency during RC QA pass. |
| “Hoy” screen with quick actions (check-in, training, food) | Done | `apps/docs/PROJECT_STATUS.md` → “Ecrã Hoje” lists shell + quick action + summary states as implemented. | Continue state polish where needed. |
| Exercise library with technique detail, cues, muscles, media | Done (with polish pending) | `apps/docs/PROJECT_STATUS.md` → “Biblioteca de exercícios (funcional; UX premium em progresso)” and implemented detail/media bullets. | Final UX polish still tracked. |
| Training and nutrition plans (manual + AI) with incremental adjustments | Gap | `apps/docs/PROJECT_STATUS.md` → “Treino” and “Nutrição” base flows implemented; explicit manual+AI incremental-adjust parity not confirmed in current status. | Confirm/document full manual+AI adjustment coverage before final RC sign-off. |
| Basic tracking: weight, measures, body fat (when applicable), energy, notes, food log | Gap (partial done) | `apps/docs/PROJECT_STATUS.md` → tracking weight + conditional measures/energy/notes implemented; payload coverage still “em progresso”. No explicit “food log” completion line. | Close/confirm food-log and payload parity coverage; keep neutral states where data is missing. |
| Dashboard with weekly summary and progress | Done | `apps/docs/PROJECT_STATUS.md` → dashboard sections and weekly progress module listed as implemented/partially implemented with data dependency notes. | Verify with realistic data in mobile QA pass. |

## RC readiness takeaways

- MVP baseline is largely implemented in `apps/web`, with the remaining risk concentrated in tracking completeness (payload parity + food log confirmation) and final UX polish consistency.
- This document is intended for release-candidate go/no-go conversations and should be re-checked after each sprint close.
