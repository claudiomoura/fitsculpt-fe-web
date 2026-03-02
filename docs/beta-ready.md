# Runbook mínimo: Beta Vendible

## Índice
- [1) Checklist Beta-Ready (10 minutos)](#1-checklist-beta-ready-10-minutos)
- [2) Reset demo (<=5 min)](#2-reset-demo-5-min)
- [3) Ver estado usuario (<=2 min)](#3-ver-estado-usuario-2-min)
- [4) Troubleshooting](#4-troubleshooting)
- [5) Política de secretos](#5-política-de-secretos)
- [When to escalate](#when-to-escalate)

## 1) Checklist Beta-Ready (10 minutos)

### A. Web/API gates (local)
- Desde root del repo, correr gates completos:
```bash
npm run release:check
```
- Si quieres correr por paquete:
```bash
npm --prefix apps/web run build
npm --prefix apps/web run typecheck
npm --prefix apps/web run test
npm --prefix apps/api run lint
npm --prefix apps/api run typecheck
npm --prefix apps/api run build
npm --prefix apps/api run test
```

### B. E2E core loop
- Requisitos mínimos:
```bash
# Terminal 1 (API)
npm --prefix apps/api run dev

# Terminal 2 (E2E en web)
cd apps/web
npm run e2e:smoke:core
```
- Alternativa smoke pack beta (core + token opcional):
```bash
cd apps/web
npm run e2e:smoke:beta
```

### C. Gym-flow 5x (estabilidad)
- Si aplica validación de gym en tu release, ejecutar 5 veces:
```bash
cd apps/web
for i in 1 2 3 4 5; do
  echo "[gym-flow run $i/5]"
  npx playwright test e2e/gym-flow.spec.ts || break
done
```

### D. Outputs esperados (GREEN)
- Gates: todos los comandos terminan con exit code `0`.
- Playwright: resumen final con `passed` y sin `failed`.
- Core loop: login + navegación + acción en tracking sin errores.
- Gym-flow 5x: 5/5 corridas `passed` (o documentar flaky con artifacts).

## 2) Reset demo (<=5 min)

### Opción endpoint dev (si existe)
- Backend expone reset en dev:
```bash
curl -X POST "http://127.0.0.1:4000/dev/reset-demo?tokenState=empty"
```
- Variante con usuario "paid":
```bash
curl -X POST "http://127.0.0.1:4000/dev/reset-demo?tokenState=paid"
```
- Esperado: JSON con `ok: true`.

### Opción script npm
- Desde `apps/api`:
```bash
npm run demo:reset
```
- Seed de demo (root o apps/api):
```bash
npm run seed:demo
```

## 3) Ver estado usuario (<=2 min)

### A. Con curl + cookie (placeholder)
- **No pegar cookies reales**. Usa placeholder:
```bash
# Front BFF
curl -i "http://127.0.0.1:3000/api/auth/me" \
  -H "Cookie: fs_token=<SESSION_COOKIE_PLACEHOLDER>"

curl -i "http://127.0.0.1:3000/api/billing/status" \
  -H "Cookie: fs_token=<SESSION_COOKIE_PLACEHOLDER>"

# Backend directo
curl -i "http://127.0.0.1:4000/members/me/assigned-training-plan" \
  -H "Cookie: fs_token=<SESSION_COOKIE_PLACEHOLDER>"
```

### B. Con Playwright request context (sin exponer secreto)
```ts
import { request } from '@playwright/test';

const ctx = await request.newContext({
  baseURL: 'http://127.0.0.1:4000',
  extraHTTPHeaders: {
    Cookie: 'fs_token=<SESSION_COOKIE_PLACEHOLDER>',
  },
});

const me = await ctx.get('/auth/me');
const billing = await ctx.get('/billing/status');
const assigned = await ctx.get('/members/me/assigned-training-plan');

console.log(me.status(), billing.status(), assigned.status());
await ctx.dispose();
```

## 4) Troubleshooting

- `401 UNAUTHORIZED`:
  - Re-login y renueva cookie `fs_token`.
  - Verifica que usas el host correcto (`3000` BFF vs `4000` API).
  - Si es E2E, vuelve a correr reset demo antes del spec.

- `502` (contract drift / backend unavailable):
  - Revisar logs de web y API.
  - Verificar que backend esté arriba y responda endpoints base.
  - Confirmar que payload backend mantiene contrato esperado.

- `500 INTERNAL_ERROR`:
  - Revisar stacktrace de API.
  - Repetir `npm run demo:reset` y/o `npm run seed:demo`.
  - Validar migraciones/DB si aplica.

- Artifacts Playwright (trace):
  - HTML report + artifacts en `apps/web/playwright-report` y `apps/web/test-results`.
  - Abrir trace local:
```bash
cd apps/web
npx playwright show-trace test-results/<test-folder>/trace.zip
```

## 5) Política de secretos

- NO pegar tokens/cookies reales en docs, issues o PR comments.
- Usar siempre placeholders (`<SESSION_COOKIE_PLACEHOLDER>`, `<TOKEN_PLACEHOLDER>`).
- Si compartes logs, redactar `Authorization`, `Cookie`, `Set-Cookie`.

## When to escalate

Escalar cuando:
- falla un gate obligatorio y no hay fix en <=30 min,
- aparece `401/502/500` persistente tras reset + re-run,
- o hay flaky repetido en gym-flow/core-loop.

Información mínima para escalar:
- link del run (CI/local notes),
- `correlationId` (si existe en respuesta/log),
- `trace.zip` de Playwright,
- comando exacto ejecutado y timestamp,
- endpoint afectado + status code.
