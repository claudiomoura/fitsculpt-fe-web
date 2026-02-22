# Incident Tracker (Single Source of Truth)

**Dependency statement:** This PR can run now on origin/dev.

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
| INC-2026-02-22-001 | 2026-02-22 14:10 | P1 | `POST /api/tracking` responde 500 intermitente tras login | BE on-call (`@backend-oncall`) | Monitoring | Intermitente (~35%) | Usuarios no pueden guardar progreso en `/app/hoy` | Reintentar 1 vez y fallback a cola local hasta hotfix | `#incidents` + ticket `REL-241` | CI: `.github/workflows/pr-quality-gates.yml` (último run PASS). Smoke: `docs/demo-smoke-test.md` (re-ejecutado PASS). E2E: `docs/e2e.md` (suite lite PASS). | N/A (P1) |

## Checklist mínimo por incidente

- [ ] Severidad asignada (P0/P1/P2).
- [ ] Owner asignado.
- [ ] Estado actualizado.
- [ ] Impacto descrito (usuario/negocio).
- [ ] Workaround documentado o `N/A`.
- [ ] Links a evidencia (ticket, logs, CI, smoke/e2e).
