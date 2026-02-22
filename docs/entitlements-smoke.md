# Entitlements Smoke Test (FREE vs PRO/GYM)

Objetivo: validar de forma manual y reproducible el gating por entitlements en menos de 10 minutos, incluyendo evidencia mínima y verificación de consola limpia.

> Dependency statement (mandatory): **This PR can run now on origin/dev (doc), and only needs PR-03 merged to attach final UI evidence.**

## Alcance
- Validar diferencias visibles entre usuario FREE y usuario premium (PRO o GYM).
- Confirmar qué se bloquea/oculta en FREE y qué CTA aparece para upgrade.
- Confirmar que en premium se habilita la capacidad equivalente.
- Verificar **0 errores de consola** durante toda la ejecución.

## Pre-requisitos (2 min)
1. Web en `http://localhost:3000`.
2. API en `http://localhost:4000`.
3. Dos cuentas disponibles:
   - `FREE_USER` (sin módulos premium).
   - `PREMIUM_USER` (PRO/GYM o módulos AI habilitados).
4. Ejecutar en incógnito o limpiar sesión entre cuentas.
5. Abrir DevTools > Console (preservar logs activado).

## Script de smoke (<= 10 min)

### A) Sesión FREE
1. Login con `FREE_USER`.
2. Ir a `/app/hoy` y luego a una pantalla con feature premium (AI o equivalente).
3. Verificar estado de gating:
   - Feature bloqueada/oculta según diseño.
   - Se muestra CTA de upgrade (ej. "Unlock Pro", "Upgrade", "Get AI").
4. Navegar a `/app/perfil` (o donde se muestre plan) y confirmar plan FREE.
5. Revisar consola: **0 errors**.

### B) Sesión PREMIUM (PRO/GYM)
1. Cerrar sesión FREE y login con `PREMIUM_USER`.
2. Repetir navegación a la misma feature premium.
3. Verificar estado habilitado:
   - Feature accesible (sin lock/blocked state).
   - CTA de upgrade no interrumpe el flujo principal.
4. Revisar pantalla de perfil/plan y confirmar tier premium.
5. Revisar consola: **0 errors**.

## Resultados esperados por estado

| Check | FREE | PRO/GYM |
|---|---|---|
| Acceso a módulo premium | Bloqueado o limitado | Habilitado |
| CTA de upgrade | Visible | No bloqueante o no visible |
| Indicador de plan | FREE | PRO/GYM |
| Console errors | 0 | 0 |

## Checklist de ejecución

- [ ] FREE: login ok
- [ ] FREE: gating visible (lock/hidden) en feature premium
- [ ] FREE: CTA de upgrade visible
- [ ] FREE: 0 console errors
- [ ] PREMIUM: login ok
- [ ] PREMIUM: feature premium habilitada
- [ ] PREMIUM: indicador de plan correcto
- [ ] PREMIUM: 0 console errors

**Resultado final:** `PASS` solo si todos los checks están marcados.

## Evidencia mínima a adjuntar en PR
- 1 captura FREE mostrando lock/CTA.
- 1 captura PREMIUM mostrando feature habilitada.
- 1 captura de consola limpia (sin errores) durante ejecución.
- Este checklist marcado completo.

## Nota opcional de contrato `/auth/me`
Si existe infraestructura de tests, incluir una aserción mínima de contrato:
- El payload de `/auth/me` expone el campo `entitlements` (objeto, aunque no se valide la lógica de negocio aquí).
