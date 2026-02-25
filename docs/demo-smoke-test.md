# RC Smoke Test + Demo Reset (manual, 1 doc, 10–12 min)

**Dependency statement:** This PR depends on PR-03 and PR-04 being merged.

Objetivo: ejecutar un recorrido único y repetible para Release Candidate con:
1) reset demo,
2) core loop con persistencia,
3) entitlements (FREE vs premium),
4) criterio de calidad: **0 console errors**.

---

## Related quick checks

- For mobile RC PASS/FAIL execution (2 viewports), use `docs/rc-checklist.md`.
- For accepted RC limits/no-go criteria, see `docs/known-limitations.md`.

---

## 0) Pre-requisitos (2 min)

- API en `http://localhost:4000` y Web en `http://localhost:3000`.
- Variables mínimas:
  - Web: `BACKEND_URL`, `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`
  - API: `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `CORS_ORIGIN=http://localhost:3000`, `APP_BASE_URL=http://localhost:3000`, `ALLOW_SEED=1`
- Credenciales demo:
  - `demo.user@fitsculpt.local` / `DemoUser123!`
- Ejecutar en incógnito y abrir DevTools (Console visible durante todo el flujo).

## Regla global obligatoria

- Si aparece **1 error en consola**, el smoke completo queda en **FAIL**.

---

## 1) Reset demo (2 min)

Desde `apps/api`:

```bash
npm run demo:reset
npm run demo:reset
```

Expected result:
- Ambos comandos terminan en OK (idempotente).
- Queda disponible el usuario demo y datos mínimos de demo (hoy/biblioteca/planes).

---

## 2) Smoke core loop con persistencia (4–5 min)

1. **Login y acceso protegido**
   - Paso: abrir `/login`, autenticar con usuario demo.
   - Expected: navega a `/app` (o `next` correcto).

2. **Validar guard de `/app` sin sesión**
   - Paso: nueva ventana incógnito sin login, abrir `/app` directo.
   - Expected: redirección a `/login?next=%2Fapp` (o equivalente).

3. **Hoy → acción**
   - Paso: en sesión autenticada abrir `/app/hoy` y ejecutar 1 acción concreta (ejemplo: iniciar/abrir sesión y volver).
   - Expected: acción exitosa, feedback visible y sin pantalla rota.

4. **Nutrición premium (macro ring + toggle week/list/month + CTA)**
   - Paso: abrir `/app/nutricion` con usuario demo que tenga plan nutricional.
   - Expected: se renderiza macro ring + lista de comidas del día + CTA principal de generación sin errores de consola.
   - Paso adicional: cambiar el toggle entre `Semana` → `Lista` → `Mes` y volver a `Semana`.
   - Expected adicional: el toggle responde por click/teclado, mantiene foco visible y no produce console errors.

4. **Training calendar (week/month/list toggle + a11y)**
   - Paso: abrir `/app/entrenamiento` con sesión autenticada y plan activo.
   - Expected: se renderiza calendario de entrenamiento con vista `Semana` por defecto y detalles del día sin errores de consola.
   - Paso adicional: cambiar el toggle entre `Mes` → `Lista` → `Semana` usando mouse y teclado (`Tab` + `Enter`/`Space`).
   - Expected adicional: el toggle responde, expone labels accesibles (`aria-label` / `aria-pressed`), mantiene foco visible y no produce console errors.


5. **Desktop wrappers (1440x1024)**
   - Paso: abrir `/app/entrenamiento` y `/app/nutricion` en viewport desktop `1440x1024`.
   - Expected: layout con sidebar `240px`, main centrado máx `1200px`, right panel `320px`, sin duplicar lógica de negocio y sin errores en consola.

6. **Persistencia tras refresh**
   - Paso: refrescar la página (`Cmd/Ctrl + R`) y volver a `/app/hoy`.
   - Expected: el estado de la acción previa se mantiene (o se refleja el progreso esperado), sin perder sesión.

---

## 3) Dashboard quick polish check (2 min)

1. **Navegación + consistencia visual de KPIs**
   - Paso: abrir `/app/dashboard` y revisar la sección de KPIs semanales.
   - Expected: cards y barras se ven consistentes en spacing/altura, sin saltos visuales y con estados legibles en dark/light mode.

2. **Accesibilidad básica (teclado + foco visible)**
   - Paso: usar `Tab` sobre CTAs del dashboard (`/app/dashboard`).
   - Expected: foco visible en botones/links y navegación por teclado sin bloqueos.

3. **ES/EN/PT sanity**
   - Paso: cambiar idioma entre ES/EN/PT en dashboard.
   - Expected: la vista mantiene estructura estable, sin errores de render ni console errors.

4. **Consola limpia**
   - Paso: mantener DevTools abierta mientras se recorre dashboard.
   - Expected: **0 console errors** durante todo el flujo.

## 3.5) Biblioteca QA/perf quick check (1–2 min)

1. **Scroll y estabilidad visual**
   - Paso: abrir `/app/biblioteca` y hacer scroll continuo en listado.
   - Expected: scroll fluido, sin layout shift evidente al cargar más tarjetas.

2. **Hover/focus disciplinado + accesibilidad básica**
   - Paso: en desktop pasar mouse por cards y luego tabular acciones (favorito/agregar).
   - Expected: hover sutil (sin glow excesivo), foco visible en links y botones, labels accesibles en acciones.

3. **Consola limpia en biblioteca**
   - Paso: mantener DevTools Console abierta durante interacción en biblioteca.
   - Expected: **0 console errors**.

## 3.7) Header blur + gradient perf sanity (1 min)

1. **Sticky header behavior**
   - Paso: navegar entre `/app`, `/app/dashboard`, `/app/biblioteca` y hacer scroll arriba/abajo.
   - Expected: header permanece legible y estable, con blur/gradiente sutil sin glitches ni halos agresivos.

2. **Fallback cross-browser (si aplica)**
   - Paso: validar en browser sin soporte completo de `backdrop-filter` (o simulación equivalente).
   - Expected: se mantiene fondo translúcido legible sin blur (fallback controlado), sin degradar contraste de contenido.

3. **No-jank quick check**
   - Paso: repetir scroll rápido 2-3 veces en mobile viewport y desktop.
   - Expected: sin stutter perceptible, sin layout shift visible en nav/drawer, y consola limpia.

## 4) Weekly Review smoke (1–2 min)

1. **Carga Weekly Review**
   - Paso: en sesión autenticada abrir `/app/weekly-review`.
   - Expected: renderiza título y resumen/recomendaciones (o estado vacío controlado), sin crash.

2. **Acciones de recomendación (si disponibles)**
   - Paso: pulsar `Accept` o `Not now` en una recomendación visible.
   - Expected: la UI responde sin errores; navegación general se mantiene estable.

3. **No-regresión core loop**
   - Paso: volver a `/app/hoy` tras revisar Weekly Review.
   - Expected: `/app/hoy` sigue operativo y con persistencia normal.

---

## 5) Smoke entitlements (FREE vs premium) (3–4 min)


> Si el entorno no tiene usuario premium semillado, usar override/admin o el mecanismo equivalente disponible en el entorno.

1. **Usuario FREE**
   - Paso: iniciar con usuario FREE y abrir una sección premium/gated.
   - Expected: se muestra paywall/CTA de upgrade o bloqueo controlado; no hay crash.

2. **Usuario premium (o override premium)**
   - Paso: iniciar con usuario premium y abrir la misma sección.
   - Expected: acceso concedido al contenido premium (sin gating inesperado).

3. **Comparación de comportamiento**
   - Paso: volver a FREE y repetir acceso.
   - Expected: diferencia FREE vs premium es consistente y reproducible.

---

## 6) Checklist final RC (PASS/FAIL)

> Criterio de aprobación: **todos los checks en PASS** + **0 console errors**.

- [x] Reset demo corre 2 veces y finaliza OK (idempotente).
- [x] Login demo funciona y navega a `/app`.
- [x] `/app` protegido redirige correctamente sin sesión.
- [x] Core loop en `/app/hoy` permite acción válida.
- [x] Nutrición premium renderiza macro ring + toggle week/list/month + lista de comidas + CTA principal sin errores de consola.
- [x] Training calendar (`/app/entrenamiento`) renderiza correctamente y el toggle week/month/list funciona con click/teclado + foco visible.
- [x] Desktop wrappers en `/app/entrenamiento` y `/app/nutricion` cumplen 240/1200/320 en viewport 1440x1024.
- [x] Persistencia confirmada después de refresh.
- [x] Dashboard (`/app/dashboard`) consistente y usable con foco visible en acciones.
- [x] Weekly Review carga correctamente y no rompe el retorno a `/app/hoy`.
- [x] Entitlements: FREE bloqueado de forma controlada en contenido premium.
- [x] Entitlements: premium accede al mismo contenido correctamente.
- [x] Regla global: 0 console errors durante el recorrido.

**Resultado final:** ✅ **PASS**

---

## Evidencia mínima para PR

- Este documento actualizado: `docs/demo-smoke-test.md`.
- Checklist final completado (PASS/FAIL).
- Opcional: 2–3 screenshots clave (login/app, hoy con acción, gating FREE vs premium).
