# sprint-01/pr-03-entitlements-admin-override

## Contrato final de entitlements (BE source of truth)

`GET /auth/me` ahora mantiene campos legacy y agrega `entitlements`:

- `subscriptionPlan` (legacy): tier simplificado para compat FE (`FREE` | `PRO`).
- `plan` (legacy): espejo de `subscriptionPlan`.
- `entitlements.version`: versión de contrato (`2026-02-01`).
- `entitlements.plan.base`: plan real persistido (`FREE` | `STRENGTH_AI` | `NUTRI_AI` | `PRO`).
- `entitlements.plan.effective`: plan efectivo de acceso (admin => `PRO`).
- `entitlements.role.isAdmin`: si el usuario es admin efectivo.
- `entitlements.role.adminOverride`: si se aplicó override admin.
- `entitlements.modules.strength.enabled/reason`.
- `entitlements.modules.nutrition.enabled/reason`.
- `entitlements.modules.ai.enabled/reason`.
- `entitlements.legacy.tier`: tier legado (`FREE` | `PRO`).
- `entitlements.legacy.canUseAI`: capacidad IA simplificada para clientes legacy.

## Compatibilidad

Se preservan campos utilizados por FE:

- `subscriptionPlan`, `plan`, `aiTokenBalance`, `aiTokenRenewalAt`, `role`, `gymId`, `gymName`.
- Se evita estado `UNKNOWN` en el FE para planes `STRENGTH_AI`/`NUTRI_AI` al mapearlos a tier `PRO` en la capa UI.

## Admin override en backend

- `aiAccessGuard` usa entitlements efectivos, no bypass de UI.
- Si `adminOverride=true`, permite acceso IA aun con `plan.base=FREE`.
- En override admin no se exige saldo de tokens y no se debita consumo.

## Ejemplos de response (sanitizados)

### Usuario normal (FREE)

```json
{
  "id": "usr_***",
  "role": "USER",
  "subscriptionPlan": "FREE",
  "plan": "FREE",
  "aiTokenBalance": null,
  "aiTokenRenewalAt": null,
  "entitlements": {
    "version": "2026-02-01",
    "plan": { "base": "FREE", "effective": "FREE" },
    "role": { "isAdmin": false, "adminOverride": false },
    "modules": {
      "strength": { "enabled": false, "reason": "none" },
      "nutrition": { "enabled": false, "reason": "none" },
      "ai": { "enabled": false, "reason": "none" }
    },
    "legacy": { "tier": "FREE", "canUseAI": false }
  }
}
```

### Usuario admin con plan base FREE (override activo)

```json
{
  "id": "usr_admin_***",
  "role": "ADMIN",
  "subscriptionPlan": "PRO",
  "plan": "PRO",
  "aiTokenBalance": null,
  "aiTokenRenewalAt": null,
  "entitlements": {
    "version": "2026-02-01",
    "plan": { "base": "FREE", "effective": "PRO" },
    "role": { "isAdmin": true, "adminOverride": true },
    "modules": {
      "strength": { "enabled": true, "reason": "admin_override" },
      "nutrition": { "enabled": true, "reason": "admin_override" },
      "ai": { "enabled": true, "reason": "admin_override" }
    },
    "legacy": { "tier": "PRO", "canUseAI": true }
  }
}
```
