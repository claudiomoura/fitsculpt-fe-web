# RC Smoke Test + Demo Reset (manual, 1 doc, 10–12 min)

**Dependency statement:** This PR depends on PR-01 and PR-03 being merged.

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

4. **Persistencia tras refresh**
   - Paso: refrescar la página (`Cmd/Ctrl + R`) y volver a `/app/hoy`.
   - Expected: el estado de la acción previa se mantiene (o se refleja el progreso esperado), sin perder sesión.

---

## 3) Smoke entitlements (FREE vs premium) (3–4 min)

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

## 4) Checklist final RC (PASS/FAIL)

> Criterio de aprobación: **todos los checks en PASS** + **0 console errors**.

- [x] Reset demo corre 2 veces y finaliza OK (idempotente).
- [x] Login demo funciona y navega a `/app`.
- [x] `/app` protegido redirige correctamente sin sesión.
- [x] Core loop en `/app/hoy` permite acción válida.
- [x] Persistencia confirmada después de refresh.
- [x] Entitlements: FREE bloqueado de forma controlada en contenido premium.
- [x] Entitlements: premium accede al mismo contenido correctamente.
- [x] Regla global: 0 console errors durante el recorrido.

**Resultado final:** ✅ **PASS**

---

## Evidencia mínima para PR

- Este documento actualizado: `docs/demo-smoke-test.md`.
- Checklist final completado (PASS/FAIL).
- Opcional: 2–3 screenshots clave (login/app, hoy con acción, gating FREE vs premium).
