# AI Usage Audit (RC16B)

## Objetivo
Persistir uso real de IA por request (`aiRequestId`) para auditoría RC, sin inferir tokens.

## Fuente de verdad de usage
Los tokens se leen exclusivamente del payload del provider OpenAI en `data.usage`:
- `prompt_tokens`
- `completion_tokens`
- `total_tokens`

Implementación: `apps/api/src/ai/provider/openaiClient.ts` retorna `usage` y `requestId` desde el response del SDK/API.

## Persistencia
La tabla `AiUsageLog` guarda por ejecución:
- `provider`
- `model`
- `requestId`
- `promptTokens`
- `completionTokens`
- `totalTokens`
- `mode` (`AI` o `FALLBACK`)
- `fallbackReason` (cuando aplica)

## Reglas de registro
1. **Ejecución IA real** (`mode=AI`):
   - `totalTokens` viene del provider.
   - `requestId` se guarda cuando OpenAI lo retorna.
2. **Fallback/no-IA** (`mode=FALLBACK`):
   - `totalTokens=0`
   - `fallbackReason` se guarda con la causa conocida.

## Query sugerida (evidencia)
```sql
SELECT "createdAt", "feature", "mode", "requestId", "provider", "model", "totalTokens", "fallbackReason"
FROM "AiUsageLog"
WHERE "feature" IN ('training-generate','nutrition-generate')
ORDER BY "createdAt" DESC
LIMIT 20;
```

## Nota de seguridad
No se persisten ni exponen secrets; `requestId` es identificador técnico del provider.
