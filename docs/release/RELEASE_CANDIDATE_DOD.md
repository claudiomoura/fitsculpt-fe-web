# Release Candidate Definition of Done (Sprint 13)

Este documento define el mínimo obligatorio para aprobar un PR durante Release Candidate (RC).

## Objetivo
Hacer visible y obligatorio el DoD de RC por PR, con evidencia verificable antes de merge.

## Gates obligatorios
- **Gates Sprint 13**: cumplir los checks automáticos exigidos por PR-01 (calidad/CI).
- **Smoke manual ejecutado + evidencia**: correr el smoke definido en PR-03 y adjuntar pruebas en el PR.
- **Console clean**: **0 console errors** en los flujos afectados por el cambio.

## DoD mínimo por tipo de cambio
- **FE (si aplica)**: build + lint + typecheck en PASS.
- **BE (si aplica)**: build + test en PASS.
- No rompe `fs_token`.
- No rompe `/api/*`.
- No rompe rutas existentes.

## Evidencia requerida en la descripción del PR
- Link al resultado/evidencia de gates Sprint 13 (PR-01).
- Link o evidencia del smoke manual ejecutado (PR-03).
- Evidencia de consola limpia (captura o log) en flujos afectados.
- Link a este documento: `docs/release/RELEASE_CANDIDATE_DOD.md`.

## Verificación manual
- Confirmar que el template de PR activo incluye checklist RC obligatorio.
- Confirmar que el checklist referencia explícitamente:
  - gates PR-01
  - smoke PR-03

## Dependency statement
This PR can run now on origin/dev.
