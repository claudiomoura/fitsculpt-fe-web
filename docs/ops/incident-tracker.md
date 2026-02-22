# Incident Tracker (Single Source of Truth)

**Dependency statement:** This PR depends on PR-01 being merged.

Objetivo: registrar **todos** los incidentes post-release en una sola lista operativa, con prioridad clara y dueño explícito.

## Reglas de uso

- Un incidente = una fila (no duplicar en otros docs).
- Severidad obligatoria: `P0`, `P1` o `P2`.
- `Owner` y `Estado` son obligatorios para abrir el incidente.
- Todo **P0** requiere postmortem usando `docs/ops/postmortem-template.md`.
- Si cambia severidad, actualizar la misma fila (no crear nueva).

## Estados permitidos

- `Open`
- `Investigating`
- `Mitigating`
- `Monitoring`
- `Resolved`
- `Closed`

## Tracker

| ID | Fecha (UTC) | Sev | Título | Owner | Estado | Reproducibilidad | Impacto | Workaround | Canal/Link | CI/Jobs + Smoke/E2E | Postmortem |
|---|---|---|---|---|---|---|---|---|---|---|---|
| INC-2026-02-22-001 | 2026-02-22 14:10 | P1 | `POST /api/tracking` responde 500 intermitente tras login | BE on-call (`@backend-oncall`) | Fixed | Intermitente (~35%) | Usuarios no pueden guardar progreso en `/app/hoy` | Reintento automático 1 vez en FE + reintento de persistencia 1 vez en BE | `#incidents` + ticket `REL-241` + PR `sprint-08/pr-03-post-release-fixes-p0-p1` | Repro: click en "Completar 1 acción" en `/app/hoy` tras login reciente y observar fallo intermitente. Fix: `apps/web/src/services/tracking.ts` añade retry para `5xx` y `apps/api/src/index.ts` añade retry de upsert en `POST /tracking`. Verificación: tests API PASS (`apps/api npm test`) y validación del fix de retry en FE/BE (pendiente validación completa en CI gates/contract/E2E lite del PR). | N/A (P1) |

## Checklist mínimo por incidente

- [ ] Severidad asignada (P0/P1/P2).
- [ ] Owner asignado.
- [ ] Estado actualizado.
- [ ] Impacto descrito (usuario/negocio).
- [ ] Workaround documentado o `N/A`.
- [ ] Links a evidencia (ticket, logs, CI, smoke/e2e).
