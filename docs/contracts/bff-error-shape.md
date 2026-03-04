# BFF standard error shape

Todos los endpoints BFF deben devolver este formato para errores controlados:

```json
{
  "error": "<STABLE_CODE>",
  "kind": "auth | validation | quota | upstream | not_found | unknown",
  "status": 400,
  "message": "optional_safe_message",
  "requestId": "optional_request_id"
}
```

## Stable codes y mapeo

| Condición | HTTP | `error` | `kind` |
|---|---:|---|---|
| Sesión ausente / 401 upstream | 401 | `UNAUTHORIZED` | `auth` |
| 403 upstream | 403 | `FORBIDDEN` | `auth` |
| 404 upstream | 404 | `NOT_FOUND` | `not_found` |
| Payload inválido en BFF | 400 | `INVALID_REQUEST` | `validation` |
| Upstream 5xx / timeout | 502/504 | `UPSTREAM_ERROR` o `AI_TIMEOUT`* | `upstream` |
| Quota IA proveedor | 429 | `AI_QUOTA_EXCEEDED` | `quota` |
| Error IA genérico (compat) | variable | `AI_REQUEST_FAILED` | `upstream` / `unknown` |

\* `AI_TIMEOUT` se mantiene por compatibilidad en endpoints IA y agrega `kind` + `status`.

## Endpoints aplicados en este PR

- `POST /api/ai/training-plan/generate`
- `POST /api/ai/nutrition-plan/generate`
- `GET /api/billing/status`
- `GET|POST|PUT /api/tracking`

## Extensión en PRs futuros

1. Reutilizar `normalizeBffError` / `jsonBffError` desde `apps/web/src/app/api/_utils/normalizeBffError.ts`.
2. Reemplazar respuestas ad-hoc en `catch` y en ramas `!response.ok` por el helper.
3. Mantener compatibilidad de códigos ya consumidos por UI (ej. `AI_QUOTA_EXCEEDED`, `AI_REQUEST_FAILED`).
4. No exponer mensajes sensibles del backend/proveedor.
