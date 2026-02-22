# Release Freeze Policy (Sprint 07)

**Dependency statement:** This PR can run now on origin/dev

## Objetivo
Congelar scope para la ventana de release RC y asegurar que la decisión de salida sea objetiva y auditable.

## Ventana de freeze
- **Inicio:** al crear el RC candidate.
- **Fin:** cuando el Release Owner registra decisión final GO/NO-GO.

## Regla principal
Durante freeze **solo entran fixes de release**.

## Cambios permitidos (ALLOW)
1. Fixes bloqueantes de severidad **P0/P1** que impiden GO.
2. Fixes de build/test/CI que rompen gates obligatorios.
3. Ajustes de configuración para entorno release.
4. Documentación de evidencia (checklists, logs, resultados).

## Cambios NO permitidos (BLOCK)
1. Nuevas features o ampliación de alcance funcional.
2. Refactors no requeridos por un bug bloqueante.
3. Cambios de UX no vinculados a un defecto release.
4. Dependencias nuevas sin justificación de bloqueo.

## Criterio de entrada de un fix durante freeze
Un cambio solo puede entrar si cumple **todos**:
- Ticket/incidencia con severidad (P0/P1/P2) y owner.
- Evidencia reproducible (pasos + expected/actual).
- Impacto acotado (sin scope creep).
- Validación en CI + test relevante en verde.
- Aprobación explícita del Release Owner.

## Gates obligatorios (PASS/FAIL)
- CI Release Gates: `.github/workflows/ci.yml`
- PR Quality Gates: `.github/workflows/pr-quality-gates.yml`
- Contract tests (API): `docs/prs/sprint-01-pr-02-contract-test-exercises-imageurl.md`
- E2E lite: `docs/e2e.md`
- RC checklist (Sprint 6 baseline): `docs/rc-checklist.md`

Si cualquier gate/check obligatorio está en FAIL => estado de release: **NO-GO**.

## Gobernanza y responsabilidades
- **Release Owner (decisión final):** responsable GO/NO-GO.
- **QA Owner:** ejecuta checklist y consolida evidencias.
- **Tech Owners (FE/BE):** implementan fixes aprobados.

## Definición operativa de GO/NO-GO
- **GO:** todos los checks obligatorios en PASS + sin bloqueantes P0/P1 abiertos.
- **NO-GO:** al menos un check en FAIL o hay bloqueante abierto sin mitigación aprobada.
