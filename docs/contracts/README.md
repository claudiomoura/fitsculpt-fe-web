# Contracts docs

- [`CONTRACTS_RC_V1.md`](./CONTRACTS_RC_V1.md): source of truth RC v1 para rutas críticas FE consume BFF `/api/*`.
- [`admin.md`](./admin.md): snapshot de auditoría de contratos admin.
- [`bff-endpoints.json`](./bff-endpoints.json) + [`bff-endpoints.md`](./bff-endpoints.md): inventario versionado de endpoints BFF (`apps/web/src/app/api/**/route.ts`). Para actualizarlo ejecuta `npm --prefix apps/web run endpoints:inventory`; para validar drift en CI/local ejecuta `npm --prefix apps/web run endpoints:inventory:check`.

- [`BETA11_CRITICAL_ENDPOINTS.md`](./BETA11_CRITICAL_ENDPOINTS.md): subset crítico del guardrail #2 (BETA-11) para IA, billing/entitlements y core loop.
