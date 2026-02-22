# Bug Bash Log (RC)

**Dependency statement:** This PR depends on PR-03 being merged (and is recommended after PR-02).

## Instrucciones
Registrar todos los hallazgos RC con severidad y owner. Este log es input directo para GO/NO-GO.

## Severidad
- **P0:** caída total / pérdida de datos / bloqueo release absoluto.
- **P1:** funcionalidad crítica rota sin workaround aceptable.
- **P2:** defecto relevante con workaround, no bloquea por sí solo.

## Tabla de hallazgos
| ID | Fecha (UTC) | Área | Severidad (P0/P1/P2) | Descripción | Pasos de reproducción | Estado (OPEN/FIXED/VERIFIED) | Owner | PR/Commit fix | Evidencia |
|---|---|---|---|---|---|---|---|---|---|
| BB-001 | 2026-02-22 | web | P0 | Biblioteca mostraba placeholder cuando backend enviaba `imageUrls`/`image_urls` sin `imageUrl` directo. | 1) Abrir `/app/biblioteca` con ejercicios que solo tengan arrays de imágenes. 2) Verificar que tarjetas no mostraban imagen real. | VERIFIED | FE | PR-04 | `apps/web/src/lib/exerciseMedia.ts` + tests |
| BB-002 | 2026-02-22 | release-ops | P2 | Evidencias externas de gates (CI/contract/E2E/consola demo) aún no anexadas en documentos finales. | Revisar `go-no-go.md` y `rc-checklist-run-2026-02-22.md`. | OPEN | QA/Release | PR-04 docs | `docs/release/go-no-go.md` |

## Resumen para decisión
- **P0 abiertos:** `0`
- **P1 abiertos:** `0`
- **P2 abiertos:** `1`
- **Bloquea GO:** `NO` por severidad (sí condiciona cierre operativo por checks pendientes)
