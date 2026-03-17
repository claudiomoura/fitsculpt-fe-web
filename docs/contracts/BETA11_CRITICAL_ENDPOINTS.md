# BETA-11 — Critical BFF endpoints (guardrail #2)

Este guardrail cubre un **subset mínimo y estable** de rutas BFF del journey beta para detectar drift temprano sin volver frágil el CI.

## Endpoints críticos cubiertos

### IA (generación y cuota)
- `POST /api/ai/training-plan/generate`
- `POST /api/ai/nutrition-plan/generate`
- `GET /api/ai/quota`

**Por qué son críticos:** impactan la generación principal de planes y el estado de consumo de tokens que desbloquea/bloquea acciones en UI.

**Contrato mínimo validado:**
- Status code esperado para errores mapeados.
- Errores estables:
  - quota: `{ error: "AI_QUOTA_EXCEEDED", code: "AI_QUOTA_EXCEEDED", kind: "quota" }`
  - upstream/network: `{ error: "AI_REQUEST_FAILED", code: "UPSTREAM_ERROR", kind: "upstream" }`
- En quota: presencia de balance mínimo (`tokens` numérico).

### Entitlements/Billing
- `GET /api/billing/status`

**Por qué es crítico:** define gating de plan/tokens en pantallas de nutrición y settings billing.

**Contrato mínimo validado:**
- Respuesta exitosa mantiene `plan` (string) y `tokens` (number).

### Core loop (alta frecuencia)
- `GET /api/training-plans/active`

**Por qué es crítico:** alimenta “hoy/plan activo” y decisiones de rendering de entrenamiento.

**Contrato mínimo validado:**
- Respuesta exitosa mantiene `source` (`assigned|own`) y `plan.id` + `plan.days`.

## Tests asociados
- `apps/web/src/test/aiGenerateGuardrail.contract.test.ts`
- `apps/web/src/test/betaCriticalBff.contract.test.ts`

## Política anti-flakiness
- Todos los tests usan mocks deterministas de `fetch`.
- No hay llamadas de red reales ni dependencias de proveedores externos.
- No se usan sleeps ni timers no controlados.

## Cómo actualizar fixtures sin romper CI accidentalmente
1. Cambiar primero este documento con la decisión de contrato mínimo (si el backend cambió intencionalmente).
2. Ajustar los fixtures/mocks en tests para reflejar el nuevo contrato.
3. Mantener explícitos `error`, `kind`, `code` cuando aplique (nunca relajar a asserts genéricos en esos campos críticos).
4. Ejecutar `pnpm --filter web test:contracts` y el resto de checks antes de merge.
