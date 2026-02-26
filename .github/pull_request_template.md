## Summary
- What changed?
- Why?

## Dependency statement (mandatory)
Depends on PR-01 to reference the real CI gates.

## Release Candidate DoD checklist (mandatory)
- [ ] FE PASS (`build` + `lint` + `typecheck`) **si aplica**
- [ ] BE PASS (`build` + `test`) **si aplica**
- [ ] 0 console errors en flujos afectados
- [ ] No rompe `fs_token`
- [ ] No rompe `/api/*`
- [ ] No rompe rutas existentes

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
