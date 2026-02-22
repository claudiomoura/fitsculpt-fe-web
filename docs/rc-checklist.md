# RC Checklist Mobile (PASS/FAIL)

**Dependency statement:** This PR can run now on origin/dev.

Objetivo: validar en mobile el RC con una lista corta, repetible y ejecutable en **10–12 min**.

## Alcance

- Flujos core: login, `/app` protegido, hoy → acción → persistencia, biblioteca, entitlements/gating, gym pilot (si aplica al RC).
- Criterio global obligatorio: **0 errores en consola** durante toda la corrida.
- Viewports obligatorios:
  - **375 x 812** (iPhone X/11 Pro)
  - **390 x 844** (iPhone 12/13/14)

## Preparación (1–2 min)

1. Abrir `http://localhost:3000` (o URL RC) en ventana incógnito.
2. Abrir DevTools con consola visible.
3. Ejecutar la corrida completa en ambos viewports.

---

## Checklist RC Mobile (PASS/FAIL)

> Marca PASS/FAIL por cada viewport. Si falla una condición, el punto es FAIL.

| ID | Flujo | Paso corto | Criterio PASS (incluye loading/empty/error) | 375x812 | 390x844 |
|---|---|---|---|---|---|
| M-01 | Login | Ir a `/login` y autenticar usuario válido | Login completo, CTA usable sin solaparse; estado loading visible; en credenciales inválidas se muestra error controlado; navega a `/app` al autenticar | ⬜ PASS ⬜ FAIL | ⬜ PASS ⬜ FAIL |
| M-02 | Ruta protegida | Sin sesión, abrir `/app` directo | Redirección a `/login` (con `next` si aplica) sin loop ni pantalla en blanco; si tarda red aparece loading legible | ⬜ PASS ⬜ FAIL | ⬜ PASS ⬜ FAIL |
| M-03 | Hoy → acción | En `/app/hoy`, ejecutar 1 acción principal | Contenido carga sin layout roto; si no hay datos muestra empty-state útil; acción confirma éxito; errores de red se muestran con mensaje controlado | ⬜ PASS ⬜ FAIL | ⬜ PASS ⬜ FAIL |
| M-04 | Persistencia | Refresh y volver a `/app/hoy` | La acción/estado previo persiste según diseño; sesión continúa activa; no regresión visual post-refresh | ⬜ PASS ⬜ FAIL | ⬜ PASS ⬜ FAIL |
| M-05 | Biblioteca | Abrir biblioteca y entrar a un item | Lista usable en mobile, cards/filas sin overflow crítico; loading/empty/error se manejan sin crash | ⬜ PASS ⬜ FAIL | ⬜ PASS ⬜ FAIL |
| M-06 | Entitlements FREE | Con usuario FREE ir a contenido premium | Gating/paywall visible y accionable; sin bloqueo total de app ni crash; mensaje de límite claro | ⬜ PASS ⬜ FAIL | ⬜ PASS ⬜ FAIL |
| M-07 | Entitlements Premium | Con premium (o override) abrir mismo contenido | Acceso permitido al contenido premium; diferencia FREE vs premium consistente | ⬜ PASS ⬜ FAIL | ⬜ PASS ⬜ FAIL |
| M-08* | Gym pilot (si aplica) | Entrar a flujo/entrypoint del gym pilot | Flujo abre y responde en mobile; si feature-flag OFF, estado “no disponible” controlado y explícito | ⬜ PASS ⬜ FAIL | ⬜ PASS ⬜ FAIL |
| M-09 | Consola | Revisar consola durante toda la corrida | **0 console errors** (warnings permitidos si no rompen UX) | ⬜ PASS ⬜ FAIL | ⬜ PASS ⬜ FAIL |

\* Si gym pilot no está incluido en este RC, marcar **N/A** y justificar en notas.

---

## Regla de decisión

- **PASS RC Mobile:** todos los checks aplicables en PASS + M-09 en PASS en ambos viewports.
- **FAIL RC Mobile:** cualquier check aplicable en FAIL en cualquier viewport.

## Evidencia mínima (adjuntar al PR)

1. 2 screenshots por viewport (mínimo):
   - estado autenticado en `/app` o `/app/hoy`
   - ejemplo de gating FREE/premium o biblioteca
2. Captura de consola al final de la corrida (sin errores).
3. Tabla de resultados completada (o copia en PR description).

## Referencias

- Smoke test demo (sin duplicar pasos): `docs/demo-smoke-test.md`
- Límites conocidos del RC: `docs/known-limitations.md`
