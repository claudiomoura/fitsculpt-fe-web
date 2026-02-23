# RC Checklist Mobile (PASS/FAIL)

**Dependency statement:** This PR depends on PR-03 being merged.

Objetivo: validar en mobile el RC con una lista corta, repetible y ejecutable en **10–12 min**.

> Final RC execution guide: `docs/rc-runbook.md` (usar este checklist como evidencia PASS/FAIL).

## Alcance

- Flujos core: login, `/app` protegido, hoy → acción → persistencia, biblioteca, entitlements/gating, gym pilot (si aplica al RC).
- Criterio global obligatorio: **0 errores en consola** durante toda la corrida.
- Criterio perf (sanity): navegación/scroll sin jank perceptible; header blur/gradients sutiles con fallback correcto cuando `backdrop-filter` no está disponible.
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

| ID | Flujo | Criterio PASS (incluye loading/empty/error) | Qué hacer si FAIL (acción mínima / owner sugerido) | 375x812 | 390x844 |
|---|---|---|---|---|---|
| M-01 | Login | Login completo, CTA usable sin solaparse; loading visible; credenciales inválidas muestran error controlado; navega a `/app` al autenticar | Capturar screenshot + error visible; abrir bug **FE/Auth** con reproducible y device | PASS | PASS |
| M-02 | Ruta protegida | Sin sesión en `/app`, redirige a `/login` (con `next` si aplica) sin loop ni pantalla en blanco | Abrir bug **FE/Routing** con video corto del loop/blank y URL exacta | PASS | PASS |
| M-03 | Hoy → acción | Contenido carga sin layout roto; empty-state útil si aplica; acción confirma éxito; errores de red controlados | Abrir bug **FE/AppShell** o **FE/Hoy** según zona; adjuntar request fallida si existe | PASS | PASS |
| M-04 | Persistencia | Tras refresh, estado previo persiste según diseño y sesión sigue activa | Abrir bug **FE/State** + **BE/API** si persistencia depende backend; incluir user id y timestamp | PASS | PASS |
| M-05 | Biblioteca list + detail | Lista usable en mobile, detalle abre sin overflow crítico; loading/empty/error sin crash; scroll fluido sin salto evidente | Abrir bug **FE/Library** con item afectado y viewport | PASS | PASS |
| M-05a | Biblioteca hover/focus QA | En desktop hover de cards es sutil (sin glow excesivo) y foco visible en links/acciones (tab) | Abrir bug **FE/Library** + adjuntar screenshot con estado hover/focus | PASS | PASS |
| M-05b | Dashboard QA polish | `/app/dashboard` renderiza KPIs y CTAs sin desbordes; foco visible al tabular; sin errores en consola | Abrir bug **FE/Dashboard** con screenshot + locale + viewport | PASS | PASS |
| M-05c | Nutrition V2 sanity | `/app/nutricion` muestra macro ring + toggle semana/lista/mes usable por click/teclado con foco visible; cambio ES/EN/PT sin fallback roto en labels del toggle; 0 console errors | Abrir bug **FE/Nutrition** con locale + screenshot + stacktrace si aplica | PASS | PASS |
| M-05d | Training calendar V2 sanity | `/app/entrenamiento` muestra toggle semana/mes/lista usable por click/teclado con foco visible y labels accesibles (`aria-label`/`aria-pressed`); cambio ES/EN/PT sin fallback roto en etiquetas de estado del plan; 0 console errors | Abrir bug **FE/Training** con locale + screenshot + stacktrace si aplica | PASS | PASS |
| M-06 | Gating FREE | Usuario FREE en contenido premium: gating/paywall visible y accionable, sin crash | Abrir bug **FE/Entitlements** + **Growth/Paywall** con contenido exacto | PASS | PASS |
| M-07 | Gating Premium | Usuario premium (o override) accede al mismo contenido premium sin bloqueo | Abrir bug **FE/Entitlements** + **BE/Plans** (verificar claim/plan) | PASS | PASS |
| M-08* | Gym pilot (si aplica) | Flujo abre y responde en mobile; con flag OFF muestra “no disponible” controlado | Si era parte del RC y falla: bug **FE/GymPilot**. Si no aplica: marcar N/A y justificar | N/A | N/A |
| M-09 | Consola | **0 console errors** durante toda la corrida (warnings permitidos si no rompen UX) | Bloquea GO. Abrir bug al owner del flujo donde aparece el error + stacktrace | PASS | PASS |
| M-10 | Perf sanity (header blur + gradients) | Header sticky mantiene blur sutil sin artifacts; en browsers sin soporte de blur mantiene fondo legible (fallback), scroll continuo sin tirones visibles | Abrir bug **FE/Performance** con browser/version + captura + tramo afectado | PASS | PASS |

\* Si gym pilot no está incluido en este RC, marcar **N/A** y justificar en notas.

---

## Resultado de corrida (evidencia de esta versión)

- Fecha: 2026-02-22
- Entorno: `origin/dev` local
- Viewports ejecutados: **375x812** y **390x844**
- Resultado global: **PASS RC Mobile**
- Consola: **0 console errors** en flows demo recorridos
- Gym pilot: **N/A** (feature no incluida en esta corrida RC)

## Regla de decisión

- **PASS RC Mobile:** todos los checks aplicables en PASS + M-09 y M-10 en PASS en ambos viewports.
- **FAIL RC Mobile:** cualquier check aplicable en FAIL en cualquier viewport.

## Referencias

- Smoke test demo (sin duplicar pasos): `docs/demo-smoke-test.md`
- Límites conocidos del RC: `docs/known-limitations.md`
