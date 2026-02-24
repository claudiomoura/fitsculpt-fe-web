# Known Issues — Release Ops

**Dependency statement:** This PR can run now on origin/dev.

Fuente única de incidentes activos e históricos: `docs/ops/incident-tracker.md`.

## Estado actual

- P0 abiertos: **0**
- P1 abiertos: **1**
- P2 abiertos: **0**

## Vista resumida (sin duplicar detalle)

| ID | Sev | Estado | Owner | Nota |
|---|---|---|---|---|
| INC-2026-02-22-001 | P1 | Monitoring | BE on-call | Tracking write intermitente; workaround activo; smoke/e2e re-validados. |

## Reglas

- AI generate (`/api/ai/*/generate`) devuelve `AI_NOT_CONFIGURED`/`AI_AUTH_FAILED` cuando `OPENAI_API_KEY` no está configurada o es inválida; configurar una key válida con prefijo `sk-` para restaurar respuestas 200.

- Si hay cualquier P0 abierto: estado release = **NO-GO**.
- El detalle completo (impacto, reproducibilidad, workaround, links) vive solo en el tracker.
- Al cerrar un incidente, actualizar primero el tracker y luego este resumen.
