# Beta Ready Checklist (10-min PASS/FAIL)

> Owner: PM + Equipo  
> PR: PR-23  
> Dependencias: PR-19, PR-20, PR-21 (core fixes merged)  
> Objetivo: validar en menos de 10 minutos que la beta está lista para demo interna / validación rápida.

## Instrucciones rápidas

1. Ejecutar los 8 pasos en orden.
2. Marcar **PASS** o **FAIL** en cada paso.
3. Si hay FAIL, anotar evidencia mínima (pantalla / error / bloqueador).
4. Criterio global: **Beta Ready = todos los pasos en PASS**.

## Gates obligatorios (dev branch)

Los siguientes checks de GitHub Actions deben quedar en verde para mergear a `dev` (configurarlos como **required** en branch protection):

- `Web gates`
- `API gates`
- `E2E smoke`

Comandos locales equivalentes antes de abrir PR:

```bash
# API (desde repo root)
npm --prefix apps/api run build
npm --prefix apps/api run typecheck
npm --prefix apps/api run test

# Web (desde repo root)
npm --prefix apps/web run build
npm --prefix apps/web run typecheck
npm --prefix apps/web run test

# E2E smoke (requiere API y web levantadas + DB disponible)
npm --prefix apps/web run e2e
```

---

## Checklist ejecutable (PASS/FAIL)

| # | Área | Acción (qué hacer) | Resultado esperado (qué debe pasar) | PASS | FAIL | Evidencia/Notas |
|---|------|---------------------|--------------------------------------|:----:|:----:|-----------------|
| 1 | Login | Iniciar sesión con usuario válido desde pantalla de acceso. | Login exitoso y redirección al home/dashboard sin error visible. | [ ] | [ ] | |
| 2 | Navegación principal | Recorrer menú principal (Home, Biblioteca, Tracking, Perfil/Billing si aplica) y volver al punto inicial. | Todas las rutas principales cargan sin pantalla en blanco, sin bloqueos y con navegación consistente. | [ ] | [ ] | |
| 3 | Gym estado (NONE / PENDING / ACTIVE) | Validar comportamiento para los 3 estados de gym (cuentas/fixtures distintas o simulación acordada por equipo). | Para cada estado se muestra UI/estado correcto, sin mensajes contradictorios ni acciones rotas. | [ ] | [ ] | NONE: / PENDING: / ACTIVE: |
| 4 | Biblioteca | Abrir Biblioteca, listar contenido y entrar al detalle de al menos un item. | Lista visible, contenido carga y detalle abre correctamente sin errores de render/API visibles. | [ ] | [ ] | |
| 5 | Tracking | Registrar una acción de tracking (ej: progreso/entrada) y validar persistencia básica tras refrescar o volver a la vista. | Registro guardado y visible luego de refresco/navegación básica. | [ ] | [ ] | |
| 6 | IA bloqueada con 0 tokens | Configurar usuario con `aiTokenBalance=0` y pulsar "Generar con IA" en Entrenamiento o Nutrición. | Se muestra modal de tokens agotados y **no se ejecuta** request a `/api/ai/*/generate`. | [ ] | [ ] | Endpoint verificado: /api/ai/... |
| 7 | Lifecycle tokens (pago/cancelación) | Simular pago exitoso (grant) y cancelación (reset), luego consultar `/api/auth/me` y generar IA una vez. | Pago: balance sube (>0). Cancelación: balance vuelve a 0. Con >0 IA genera; con 0 IA queda bloqueada. | [ ] | [ ] | Balance grant/reset: __ / __ |
| 8 | Billing status básico | Consultar estado de billing/suscripción en la vista correspondiente. | Estado visible y coherente (ej: active/trial/past_due) sin error de carga. | [ ] | [ ] | |

---

## Cierre de ejecución

- Tiempo total de ejecución: ____ min (objetivo: < 10 min)
- Resultado final:
  - [ ] **BETA READY (todos PASS)**
  - [ ] **NO READY (existe al menos un FAIL)**

## Registro obligatorio de evidencias (2 ejecuciones PASS)

> Requisito de DoD: dos personas distintas deben ejecutar este checklist sin ayuda y registrar PASS.

| Ejecución | Fecha | Responsable | Resultado | Observaciones |
|----------|-------|-------------|-----------|---------------|
| 1 | ____-__-__ | __________________ | PASS / FAIL | |
| 2 | ____-__-__ | __________________ | PASS / FAIL | |

---

## Notas

- Este documento **no** sustituye un runbook técnico profundo ni QA extendido.
- Si hay FAIL, abrir ticket/regresión y re-ejecutar checklist completo tras fix.
