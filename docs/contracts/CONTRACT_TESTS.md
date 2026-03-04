# Contract Drift Gate — BFF critical endpoints

Estado: **RC v1 gate activo**  
Owner: **Equipo C**  
Dependencia: **This PR depends on PR-04 being merged**

## Objetivo

Evitar drift de contrato en endpoints críticos consumidos por FE vía BFF (`/api/*`).

La fuente de verdad del shape validado es:

- `docs/contracts/CONTRACTS_RC_V1.md`

## Endpoints cubiertos por los contract tests

El gate valida shape mínimo (campos críticos) para:

1. `GET /api/auth/me`
2. `GET /api/gym/me`
3. `GET /api/tracking`
4. `GET /api/exercises`
5. `POST /api/ai/training-plan/generate`
6. `POST /api/ai/nutrition-plan/generate`

> Nota: la cobertura sigue la sección de rutas críticas de Contracts RC v1.

## Dónde vive

- Test: `apps/web/src/test/bffContractsRcV1.contract.test.ts`
- Script npm: `apps/web/package.json` → `test:contracts`
- CI job: `.github/workflows/ci.yml` → `web-contract-gate`
- PR job: `.github/workflows/pr-quality-gates.yml` → `web-contract-gate`

## Ejecución local

Desde raíz del repo:

```bash
npm --prefix apps/web run test:contracts
```

O desde `apps/web`:

```bash
npm run test:contracts
```

## Validación manual del gate (drift intencional)

Para confirmar que el gate falla ante cambios de shape:

1. Editar temporalmente `apps/web/src/test/bffContractsRcV1.contract.test.ts`.
2. En cualquier caso de éxito, remover un campo obligatorio de assertion (por ejemplo `entitlements.modules.ai.enabled` en `/api/auth/me`) o cambiar tipo esperado.
3. Ejecutar `npm --prefix apps/web run test:contracts`.
4. Confirmar fallo del test.
5. Revertir el cambio temporal y volver a ejecutar para confirmar PASS.

## Resultado esperado en CI

El job `Web Contract Drift Gate (BFF critical endpoints)` debe quedar en **PASS** para permitir merge sin drift en contratos críticos.


## BETA-11 guardrail #2 (subset crítico)

Además del gate RC v1 existente, se agregó un subset crítico para IA + billing + core loop:

1. `POST /api/ai/training-plan/generate`
2. `POST /api/ai/nutrition-plan/generate`
3. `GET /api/ai/quota`
4. `GET /api/billing/status`
5. `GET /api/training-plans/active`

Documentación de criterio y contrato mínimo: `docs/contracts/BETA11_CRITICAL_ENDPOINTS.md`.

Tests: `apps/web/src/test/aiGenerateGuardrail.contract.test.ts` y `apps/web/src/test/betaCriticalBff.contract.test.ts`.
