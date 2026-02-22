# Bug Bash Log (RC)

**Dependency statement:** This PR can run now on origin/dev

## Instrucciones
Registrar todos los hallazgos RC con severidad y owner. Este log es input directo para GO/NO-GO.

## Severidad
- **P0:** caída total / pérdida de datos / bloqueo release absoluto.
- **P1:** funcionalidad crítica rota sin workaround aceptable.
- **P2:** defecto relevante con workaround, no bloquea por sí solo.

## Tabla de hallazgos
| ID | Fecha (UTC) | Área | Severidad (P0/P1/P2) | Descripción | Pasos de reproducción | Estado (OPEN/FIXED/VERIFIED) | Owner | PR/Commit fix | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| BB-001 | `<yyyy-mm-dd>` | `<web/api>` | P2 | `<pendiente>` | `<steps>` | OPEN | `<owner>` | `<pr/sha>` | `<link>` |

## Resumen para decisión
- **P0 abiertos:** `0`
- **P1 abiertos:** `0`
- **P2 abiertos:** `1`
- **Bloquea GO:** `NO` (solo bloquea si hay P0/P1 abiertos)
