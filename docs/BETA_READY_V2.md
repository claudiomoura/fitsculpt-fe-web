# Beta Ready V2 (criterio medible)

> Owner: QA + Equipo  
> PR: PR-34  
> Base: origin/dev  
> Dependencias: PR-30 a PR-33  
> Objetivo: declarar **Beta Ready** únicamente con evidencia objetiva y reproducible.

## Criterio oficial PASS/FAIL

Se declara **BETA READY** solo si se cumplen **todos** los puntos:

1. **Core loop PASS** en los journeys definidos:
   - Login
   - Header correcto
   - Generación IA (si entitlement)
   - Billing acceso
   - Gym smoke
2. **10 ejecuciones consecutivas PASS** del flujo E2E smoke definido para beta.
3. **0 errores de consola/runtime** en los journeys definidos (console error + pageerror).
4. **Gates activos** en CI para impedir merge con regresiones.

Si cualquier punto falla, estado final: **NO READY**.

---

## Core loop definido (alcance PR-34)

| # | Journey | Validación mínima | Resultado esperado |
|---|---------|-------------------|--------------------|
| 1 | Login | Usuario demo inicia sesión | Redirección a `/app` sin error |
| 2 | Header correcto | Header/nav visible tras login | Elementos principales presentes y navegables |
| 3 | Generación IA (si entitlement) | Ejecutar acción IA con cuenta habilitada | Respuesta generada sin error y flujo estable |
| 4 | Billing acceso | Abrir vista de billing | Carga correcta del estado de suscripción |
| 5 | Gym smoke | Join/approve/assign/verify plan | Plan asignado visible para miembro |

> Nota: “Generación IA (si entitlement)” aplica solo a cuentas con entitlement habilitado en entorno de prueba.

---

## Evidencia requerida (10x consecutivo)

Registrar cada corrida en CI (workflow `E2E Smoke`) y conservar artifact con log consolidado.

| Run | Workflow run URL | Resultado | Console/runtime errors | Observaciones |
|-----|------------------|-----------|------------------------|---------------|
| 1 | | PASS / FAIL | 0 / >0 | |
| 2 | | PASS / FAIL | 0 / >0 | |
| 3 | | PASS / FAIL | 0 / >0 | |
| 4 | | PASS / FAIL | 0 / >0 | |
| 5 | | PASS / FAIL | 0 / >0 | |
| 6 | | PASS / FAIL | 0 / >0 | |
| 7 | | PASS / FAIL | 0 / >0 | |
| 8 | | PASS / FAIL | 0 / >0 | |
| 9 | | PASS / FAIL | 0 / >0 | |
| 10 | | PASS / FAIL | 0 / >0 | |

### Regla de aceptación de evidencia

- Las 10 corridas deben ser **consecutivas y verdes**.
- El log consolidado debe reflejar explícitamente `=== E2E run n/10 ===` para `n=1..10`.
- Cualquier `console.error` o `pageerror` invalida la corrida.

---

## Reproducibilidad de build

Para considerar el resultado reproducible:

1. Ejecutar sobre `origin/dev` actualizado + PR-34.
2. Misma definición de workflow versionada en repo.
3. Dependencias instaladas con lockfiles (`npm ci`).
4. Artifact disponible con:
   - `apps/artifacts/e2e/e2e-10x-results.log`
   - `apps/web/playwright-report`
   - `apps/web/test-results`

---

## Decisión final

- [ ] **BETA READY** (10/10 PASS + 0 console/runtime errors + gates activos)
- [ ] **NO READY**

Responsable QA: __________________  
Responsable Equipo: _______________  
Fecha: ____-__-__
