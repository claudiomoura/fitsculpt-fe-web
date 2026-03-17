# Release Candidate DoD (Official)

**Owner:** Equipo Plataforma + QA  
**Dependency statement:** Depends on PR-01 to reference the real CI gates.

Este documento convierte “Done” en un checklist verificable por PR durante Release Candidate.

## RC gates obligatorios por PR
- [ ] Gates de CI de Sprint 13 (PR-01) en PASS.
- [ ] Smoke test oficial ejecutado y reportado con PASS/FAIL por flujo (`docs/SMOKE_TEST.md`).
- [ ] Evidencia adjunta en el PR (capturas/logs/enlaces).

## Checklist DoD RC obligatorio
- [ ] FE PASS (`build` + `lint` + `typecheck`) si aplica.
- [ ] BE PASS (`build` + `test`) si aplica.
- [ ] 0 console errors en los flujos afectados.
- [ ] No rompe auth por cookie `fs_token`.
- [ ] No rompe `/api/*`.
- [ ] No rompe rutas existentes.

## Evidencia mínima exigida en PR
1. Link a ejecución de gates PR-01.
2. Resultado del smoke test oficial (PASS/FAIL por flujo).
3. Evidencia de consola limpia (o detalle de error si FAIL).
4. Link a `docs/RC_STATUS.md` actualizado para la corrida más reciente.

## Regla de merge
Un PR de RC solo se aprueba si todos los checkboxes anteriores están marcados y la evidencia es verificable.
