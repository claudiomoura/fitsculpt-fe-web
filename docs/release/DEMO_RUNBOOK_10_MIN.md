# Demo Runbook (10 min) — Sprint 15 RC

**Owner:** Equipo C  
**Dependency statement:** This PR depends on PR-02 being merged

## Objetivo
Ejecutar una demo funcional de máximo 10 minutos cubriendo los flujos de valor y validar que no existen errores de consola en el recorrido.

## Precondiciones (antes de iniciar)
- Build RC desplegada y accesible.
- Usuario demo válido (FREE) y usuario premium (o método de override autorizado).
- DevTools abierto en **Console** y **Network**.
- Consola limpiada antes de comenzar (`Clear console`).

## Agenda cronometrada (10 min)

### 1) Login y acceso inicial (1 min)
**Pasos**
1. Ir a la pantalla de login.
2. Iniciar sesión con usuario demo.
3. Verificar redirección a home (`/app`, `/home` o ruta equivalente).

**Resultado esperado**
- Sesión iniciada correctamente.
- UI inicial visible sin errores de carga.
- **0 console errors**.

**Evidencia recomendada**
- Screenshot de home tras login.
- Captura/export breve de consola limpia.

---

### 2) Home / Hoy (2 min)
**Pasos**
1. Navegar a la vista principal “Hoy” (o equivalente).
2. Confirmar carga de módulos/cards del día.
3. Interactuar con 1 módulo (abrir/cerrar/expandir).

**Resultado esperado**
- Datos del día renderizados.
- Interacción fluida sin roturas visuales.
- **0 console errors**.

**Evidencia recomendada**
- Screenshot de pantalla “Hoy”.

---

### 3) Biblioteca (2 min)
**Pasos**
1. Ir a Biblioteca.
2. Verificar lista de ejercicios/contenido.
3. Abrir detalle de un elemento.

**Resultado esperado**
- Lista y detalle renderizan correctamente.
- Imágenes/metadata cargan según disponibilidad.
- **0 console errors**.

**Evidencia recomendada**
- Screenshot de lista + screenshot de detalle.

---

### 4) Tracking o Nutrición (2 min)
**Pasos**
1. Entrar al flujo de tracking o nutrición.
2. Crear/editar un registro de prueba.
3. Refrescar la pantalla y verificar persistencia.

**Resultado esperado**
- Registro guardado correctamente.
- Estado persiste luego de refresh.
- **0 console errors**.

**Evidencia recomendada**
- Screenshot antes/después de guardar o tras refresh.

---

### 5) Billing / Gating (2 min)
**Pasos**
1. Con usuario FREE, abrir una feature premium.
2. Validar bloqueo, mensaje y CTA esperados.
3. Con usuario premium/override, reintentar acceso.

**Resultado esperado**
- FREE: bloqueo correcto y CTA visible.
- Premium: acceso habilitado sin bypass incorrecto.
- **0 console errors**.

**Evidencia recomendada**
- Screenshot de estado bloqueado + habilitado.

---

### 6) Gym (si aplica) + cierre (1 min)
**Pasos**
1. Navegar al módulo Gym (si está habilitado en el entorno).
2. Validar carga básica de la vista.
3. Hacer sanity de rutas core (2 rutas rápidas).

**Resultado esperado**
- Módulo responde sin fallos (si aplica).
- Navegación estable.
- **0 console errors**.

## Criterio PASS/FAIL de la demo
- **PASS**: recorrido completo en ≤10 min con evidencias mínimas y 0 errores de consola.
- **FAIL**: flujo bloqueado, inconsistencia crítica, o cualquier error de consola no justificado.

## Registro sugerido de tiempos
| Paso | Inicio | Fin | Duración | Estado |
|---|---:|---:|---:|---|
| Login |  |  |  | PASS/FAIL |
| Home/Hoy |  |  |  | PASS/FAIL |
| Biblioteca |  |  |  | PASS/FAIL |
| Tracking/Nutrición |  |  |  | PASS/FAIL |
| Billing/Gating |  |  |  | PASS/FAIL |
| Gym (si aplica) + cierre |  |  |  | PASS/FAIL |

## Notas
- Si Gym no aplica en el entorno, marcar “N/A” con justificación.
- Adjuntar links de evidencia en `docs/release/RC_STATUS.md` y `docs/release/GO_NO_GO_CHECKLIST.md`.
