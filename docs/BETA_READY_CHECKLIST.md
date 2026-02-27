# Beta Ready Checklist (10-min PASS/FAIL)

> Owner: PM + Equipo  
> PR: PR-23  
> Dependencias: PR-19, PR-20, PR-21 (core fixes merged)  
> Objetivo: validar en menos de 10 minutos que la beta está lista para demo interna / validación rápida.

## Instrucciones rápidas

1. Ejecutar los 7 pasos en orden.
2. Marcar **PASS** o **FAIL** en cada paso.
3. Si hay FAIL, anotar evidencia mínima (pantalla / error / bloqueador).
4. Criterio global: **Beta Ready = todos los pasos en PASS**.

---

## Checklist ejecutable (PASS/FAIL)

| # | Área | Acción (qué hacer) | Resultado esperado (qué debe pasar) | PASS | FAIL | Evidencia/Notas |
|---|------|---------------------|--------------------------------------|:----:|:----:|-----------------|
| 1 | Login | Iniciar sesión con usuario válido desde pantalla de acceso. | Login exitoso y redirección al home/dashboard sin error visible. | [ ] | [ ] | |
| 2 | Navegación principal | Recorrer menú principal (Home, Biblioteca, Tracking, Perfil/Billing si aplica) y volver al punto inicial. | Todas las rutas principales cargan sin pantalla en blanco, sin bloqueos y con navegación consistente. | [ ] | [ ] | |
| 3 | Gym estado (NONE / PENDING / ACTIVE) | Validar comportamiento para los 3 estados de gym (cuentas/fixtures distintas o simulación acordada por equipo). | Para cada estado se muestra UI/estado correcto, sin mensajes contradictorios ni acciones rotas. | [ ] | [ ] | NONE: / PENDING: / ACTIVE: |
| 4 | Biblioteca | Abrir Biblioteca, listar contenido y entrar al detalle de al menos un item. | Lista visible, contenido carga y detalle abre correctamente sin errores de render/API visibles. | [ ] | [ ] | |
| 5 | Tracking | Registrar una acción de tracking (ej: progreso/entrada) y validar persistencia básica tras refrescar o volver a la vista. | Registro guardado y visible luego de refresco/navegación básica. | [ ] | [ ] | |
| 6 | Generación IA (con tokens) | Ejecutar una generación IA real consumiendo tokens (prompt simple controlado). | Respuesta generada correctamente y consumo de tokens reflejado según reglas actuales. | [ ] | [ ] | Tokens antes/después: |
| 7 | Billing status básico | Consultar estado de billing/suscripción en la vista correspondiente. | Estado visible y coherente (ej: active/trial/past_due) sin error de carga. | [ ] | [ ] | |

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
