# GO/NO-GO Decision Template (Release RC)

**Dependency statement:** This PR can run now on origin/dev

## Uso
Este documento define criterios objetivos para decisión release. Completar con evidencia verificable; evitar criterios subjetivos.

## Referencias obligatorias
- CI Release Gates: `.github/workflows/ci.yml`
- PR Quality Gates: `.github/workflows/pr-quality-gates.yml`
- Contract tests (API): `docs/prs/sprint-01-pr-02-contract-test-exercises-imageurl.md`
- E2E lite: `docs/e2e.md`
- RC checklist (Sprint 6): `docs/rc-checklist.md`
- Freeze policy: `docs/release/release-freeze.md`
- Bug bash log: `docs/release/bug-bash-log.md`

## Checklist de decisión (objetivo)
| Check | Evidence link | PASS/FAIL | Owner | Notes |
|---|---|---|---|---|
| CI Release Gates en verde | `<link job/re-run>` | PENDING | Dev Owner | |
| PR Quality Gates en verde | `<link job/re-run>` | PENDING | Dev Owner | |
| Contract tests API | `<link run/report>` | PENDING | BE Owner | |
| E2E lite | `<link run/report>` | PENDING | QA Owner | |
| RC checklist Sprint 6 completado | `docs/rc-checklist.md` + `<evidence>` | PENDING | QA Owner | |
| Sin bugs abiertos P0/P1 en bug bash | `docs/release/bug-bash-log.md` | PENDING | QA Lead | |
| Scope freeze respetado (solo fixes) | `docs/release/release-freeze.md` + PR diff | PENDING | Release Owner | |

## Reglas de decisión
- Si **todos** los checks están en PASS => candidato **GO**.
- Si **uno o más** checks están en FAIL => **NO-GO**.
- Si hay estado PENDING en checks obligatorios => **NO-GO** hasta completar evidencia.

## Decision: GO/NO-GO
- **Release Candidate:** `<tag/sha>`
- **Resultado final:** `GO` / `NO-GO`
- **Release Owner (nombre):** `<owner>`
- **Fecha/Hora (UTC):** `<yyyy-mm-dd hh:mm>`
- **Justificación (1-3 líneas):** `<razón objetiva basada en checks>`
