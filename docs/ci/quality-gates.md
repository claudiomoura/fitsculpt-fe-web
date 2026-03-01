# CI Quality Gates (obligatorios)

Este repositorio define gates mínimos obligatorios en PR para mantener **Repo GREEN**.

## Workflows

- `.github/workflows/pr-quality-gates.yml` (PR)
- `.github/workflows/ci.yml` (PR + ejecución manual)

## Gates mínimos

### Web (`apps/web`)
1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. `npm test`

### API (`apps/api`)
1. `npm run typecheck`
2. `npm run build`
3. `npm test`

### E2E smoke pack Beta Ready (`apps/web`)
1. `npm run e2e:smoke:beta`
   - Siempre ejecuta `core-loop.spec.ts`.
   - `token-lifecycle.spec.ts` se ejecuta solo cuando `E2E_INCLUDE_TOKEN_LIFECYCLE=1`.
   - `gym-flow.spec.ts` queda fuera de este gate por ahora (se incorporará cuando el flujo esté estable).

> Si cualquiera de estos comandos falla, el job falla y el workflow queda en rojo (exit code != 0), bloqueando merge cuando estos checks están marcados como *required* en branch protection.

## Política PASS/FAIL automatizada

- `web-gates` y `api-gates` validan compilación + tests unitarios por paquete.
- `e2e-smoke` depende de ambos y falla si no completa el smoke pack Beta Ready.
- En `pull_request` el smoke corre con token lifecycle opcional desactivado (`E2E_INCLUDE_TOKEN_LIFECYCLE=0`).
- En `workflow_dispatch` se puede activar `include_token_lifecycle=true` para ejecutar también el smoke de ciclo de tokens y convertirlo en gate PASS/FAIL del run manual.

## Artefactos para debugging

Cada job publica logs como artefactos de Actions (siempre, incluso en fallo):

- `web-*-gate-logs`
- `api-*-gate-logs`

Los logs no imprimen secretos aplicacionales y `secret-hygiene.yml` se mantiene como barrera adicional.

## Validación recomendada

1. Crear PR con cambio trivial (ej. docs) y verificar que todos los jobs pasan.
2. Forzar un fallo controlado de lint en una rama de prueba (introducir y luego revertir una violación de ESLint) para confirmar que el PR queda no-mergeable hasta corregirlo.
