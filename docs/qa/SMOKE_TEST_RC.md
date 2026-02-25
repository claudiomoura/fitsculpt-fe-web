# Manual Smoke Test RC (Official)

Owner: Equipo C  
Dependency statement: **This PR can run now on origin/dev**.

Objetivo: ejecutar un smoke manual oficial en **<10 minutos**, por cualquier persona del equipo, con resultado claro **PASS/FAIL** por flujo.

## Alcance
- 6 flujos manuales obligatorios.
- Validación funcional mínima FE + compatibilidad con sesión (`fs_token`), rutas `/app/*` y BFF `/api/*`.
- Evidencia mínima por ejecución: screenshot + consola + network (si aplica).

## Pre-requisitos (1 min)
1. FE ejecutando en `http://localhost:3000`.
2. API ejecutando en `http://localhost:4000`.
3. Abrir navegador en incógnito.
4. Abrir DevTools con pestañas **Console** y **Network** visibles.

## Regla global de aprobación
- Si aparece **cualquier error en Console** durante un flujo, ese flujo queda en **FAIL**.
- Si una request crítica `/api/*` devuelve 4xx/5xx inesperado, el flujo queda en **FAIL**.
- El smoke completo es **PASS** solo si todos los flujos quedan en PASS.

---

## Flujos oficiales (6)

### Flow 1 — Login y sesión
**Pasos**
1. Ir a `/login`.
2. Autenticar con credenciales válidas.
3. Confirmar redirección a `/app`.

**Expected result (PASS)**
- Login exitoso.
- Se establece sesión (`fs_token` o cookie/sesión equivalente).
- No hay errores en consola.

**FAIL si**
- No redirige a `/app`.
- Error visible de auth con credenciales válidas.
- Hay console errors.

---

### Flow 2 — Ruta protegida sin sesión
**Pasos**
1. Abrir nueva ventana incógnito (sin sesión).
2. Navegar directamente a `/app`.

**Expected result (PASS)**
- Redirección a login (`/login` o `/login?next=%2Fapp`).
- No renderiza contenido protegido sin auth.
- No hay errores en consola.

**FAIL si**
- Deja entrar a `/app` sin sesión.
- Loop infinito de redirección.
- Hay console errors.

---

### Flow 3 — Home app + navegación básica
**Pasos**
1. Con sesión iniciada, abrir `/app`.
2. Navegar a 2 secciones principales (ejemplo: `/app/hoy` y `/app/biblioteca`).
3. Volver a `/app`.

**Expected result (PASS)**
- Navegación estable entre rutas existentes.
- No hay pantallas en blanco ni crashes.
- No hay errores en consola.

**FAIL si**
- Ruta existente rompe o devuelve pantalla vacía.
- Error de render/hydration.
- Hay console errors.

---

### Flow 4 — Escritura mínima (tracking) y persistencia
**Pasos**
1. Ir a una sección de tracking (ej: peso/comida/hábito).
2. Crear 1 registro válido.
3. Refrescar la página (`Cmd/Ctrl + R`).
4. Confirmar que el registro sigue visible.

**Expected result (PASS)**
- Escritura exitosa en `/api/*` asociada al tracking.
- El dato persiste tras refresh.
- No hay errores en consola.

**FAIL si**
- Fallo al guardar.
- Dato desaparece tras refresh sin motivo.
- Request crítica `/api/*` falla (4xx/5xx inesperado).
- Hay console errors.

---

### Flow 5 — Biblioteca: lista y detalle
**Pasos**
1. Abrir `/app/biblioteca`.
2. Abrir el detalle de 1 elemento.
3. Volver a la lista.

**Expected result (PASS)**
- Lista carga correctamente.
- Detalle abre sin romper navegación.
- No hay errores en consola.

**FAIL si**
- Lista no carga.
- Detalle rompe o queda inconsistente.
- Hay console errors.

---

### Flow 6 — Sanity de red y consola final
**Pasos**
1. Con DevTools abierto, repetir navegación rápida `/app` → `/app/hoy` → `/app/biblioteca`.
2. Revisar **Console** y **Network**.

**Expected result (PASS)**
- **0 console errors** en todo el smoke.
- Requests críticas terminan en 2xx/3xx esperados.
- Sin fallos de assets/rutas principales.

**FAIL si**
- Existe al menos 1 console error.
- Hay fallo de red crítico no esperado.

---

## Checklist de ejecución (marcar en cada corrida)

- [ ] Flow 1 — Login y sesión: PASS
- [ ] Flow 2 — Ruta protegida sin sesión: PASS
- [ ] Flow 3 — Home app + navegación básica: PASS
- [ ] Flow 4 — Escritura mínima y persistencia: PASS
- [ ] Flow 5 — Biblioteca lista/detalle: PASS
- [ ] Flow 6 — Sanity red + consola final: PASS
- [ ] **0 console errors** en todos los flujos

**Resultado final:** `PASS` / `FAIL`

## Evidencia mínima requerida
Adjuntar en PR (mínimo 1 flujo documentado con evidencia completa):
1. **Screenshot** del estado PASS del flujo.
2. **Captura de Console** sin errores.
3. **Captura de Network** (cuando aplica al flujo, especialmente en escrituras `/api/*`).
4. Link a este documento: `docs/qa/SMOKE_TEST_RC.md`.

## Tiempo objetivo
- Preparación: ~1 minuto.
- Ejecución flujos: 7–8 minutos.
- Total: **<= 10 minutos**.
