# Go/No-Go Checklist — Sprint 15 RC

**Owner:** Equipo C  
**Dependency statement:** This PR depends on PR-02 being merged

## Uso
Completar esta checklist antes de declarar salida RC. Cada gate debe estar en **PASS** con evidencia verificable.

## Checklist de decisión
| Gate obligatorio | Evidencia | Estado (PASS/FAIL) | Owner | Notas |
|---|---|---|---|---|
| Gates Sprint 13 (PR-01) | Link run CI/quality gates | FAIL | Dev/QA | Pendiente anexar evidencia final del run objetivo |
| Contratos Sprint 14 (PR-04 + PR-06) | Reporte/runs de contratos API | FAIL | BE/QA | Pendiente consolidación de evidencia en RC |
| E2E Sprint 15 (PR-07) | Link run E2E + artifacts | FAIL | QA | Pendiente corrida final sobre RC candidate |
| Smoke manual PASS (PR-03) | Checklist/capturas smoke | FAIL | QA | Pendiente ejecución final en build RC objetivo |
| 0 errores de consola (flows afectados) | Captura/export de Console limpia | FAIL | QA/FE | Falta evidencia completa en recorrido final |

## Regla de decisión
- **GO:** todos los gates en PASS.
- **NO-GO:** al menos un gate en FAIL.

## Resultado
- **Estado actual sugerido:** **NO-GO** (hasta completar evidencias y cambiar todos los gates a PASS).
- Registrar el estado final en `docs/release/RC_STATUS.md`.

## Ejemplo de evidencias aceptables
- URL de workflow run con checks verdes.
- Archivo markdown con resultados de pruebas firmado por owner.
- Capturas de consola sin errores en los flujos del demo runbook.
