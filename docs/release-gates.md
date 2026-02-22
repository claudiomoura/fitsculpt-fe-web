# Release Gates (CI)

## Objetivo
Definir los **gates mínimos bloqueantes** para merges de Pull Requests, validando Frontend y Backend con scripts reales del repositorio.

## Dependency statement
This PR can run now on origin/dev

## Workflow
- Archivo: `.github/workflows/ci.yml`
- Trigger: `pull_request` (y `workflow_dispatch` para ejecución manual)

## Checks obligatorios (PASS requerido)

### Frontend (`apps/web`)
1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run build`

### Backend (`apps/api`)
1. `npm ci`
2. `npm run build`
3. `npm test`

## Definición de PASS
Un PR está en PASS cuando **todos** los jobs del workflow `CI Release Gates` finalizan en estado exitoso.
Si cualquiera falla (lint/typecheck/build/test), el PR **no** cumple los release gates y debe corregirse antes de merge.

## Notas
- Se usan scripts existentes en `package.json`.
- Se añadió `typecheck` en frontend como alias a `tsc --noEmit` por ser requisito explícito del gate y no existir previamente.
