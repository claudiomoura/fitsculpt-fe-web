## Summary
- What changed?
- Why?

## Dependency statement (mandatory)
Depends on PR-01 to reference the real CI gates.

## BETA-11 operational guardrail (mandatory)
- [ ] No toqué endpoints BFF (`/apps/web/src/app/api/**`)
- [ ] Si toqué endpoints BFF: corrí `pnpm --filter web endpoints:inventory` y commiteé cambios
- [ ] Si toqué endpoints críticos: actualicé/validé contract tests y dejé evidencia
- [ ] Corrí `pnpm --filter web smoke`

Referencias obligatorias:
- Contratos BFF: [`docs/contracts/`](../docs/contracts/) · [`docs/contracts/BETA11_CRITICAL_ENDPOINTS.md`](../docs/contracts/BETA11_CRITICAL_ENDPOINTS.md) · [`docs/contracts/bff-error-shape.md`](../docs/contracts/bff-error-shape.md)
- Smoke pack / demo: [`docs/beta/beta-readiness.md`](../docs/beta/beta-readiness.md)

## Gates + smoke + evidence (mandatory)
- [ ] Gates de CI (PR-01) ejecutados y enlazados
  - Link gates:
- [ ] Smoke test oficial (`docs/SMOKE_TEST.md`) ejecutado y reportado PASS/FAIL
  - Link evidencia smoke:
- [ ] Evidencia adjunta (capturas/logs) para validar resultado
  - Link evidencia adicional:

## Required links in PR description
- [ ] Link RC DoD: `docs/RELEASE_CANDIDATE_DOD.md`
- [ ] Link RC Status actualizado: `docs/RC_STATUS.md`
- [ ] Link Smoke oficial: `docs/SMOKE_TEST.md`
- [ ] Screenshot de la plantilla de PR funcionando

## Smoke result (paste)
```md
Smoke Test RC
- Fecha:
- Entorno:
- Resultado final: PASS | FAIL
- Flujos:
  - Login: PASS | FAIL
  - Navegación /app: PASS | FAIL
  - IA entrenamiento (200 + persistencia): PASS | FAIL
  - IA nutrición (200 + persistencia): PASS | FAIL
  - Biblioteca detalle: PASS | FAIL
  - Header Free/Pro: PASS | FAIL
  - Tracking opcional: PASS | FAIL | N/A
- Evidencia: <links>
```
