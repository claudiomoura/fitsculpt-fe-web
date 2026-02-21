# Auditoría de producto y arquitectura (2026-02)

## 1) Executive summary

FitSculpt tiene una base técnica sólida para escalar: frontend App Router en Next.js, patrón BFF para cookies HTTP-only, backend Fastify + Prisma, y documentación de arquitectura suficientemente madura para operar por sprints.

En esta revisión (con validación técnica en entorno local) los mayores riesgos reales para demo/release no son de compilación, sino de **alineación de contratos frontend-backend**, **calidad no gateada** y **consistencia UX móvil**:

- **Build de web sí pasa** (`npm run build --prefix apps/web`) con generación de rutas completa.
- **Lint de web ya no rompe**: no hay errores bloqueantes, pero persisten 48 warnings (hooks, `no-img-element`, variables no usadas).
- **Tests de web siguen rotos** por setup de Vitest/Jest-DOM (`ReferenceError: expect is not defined`).
- El sistema de roles en frontend sigue dependiendo de `/api/profile`, pero backend `/profile` devuelve solo JSON de perfil (no `role`).
- El módulo trainer/coach sigue desalineado: frontend prueba `/api/trainer/clients` y `/api/coach/clients`, pero backend no expone esos contratos.
- La barra de navegación móvil está implementada como `position: fixed`, pero hay factores de viewport/layout que explican por qué en algunos dispositivos “aparece tras scroll” o no se percibe permanentemente fija.

## 2) Evidencia técnica validada en esta auditoría

### Comandos ejecutados
- `npm run build --prefix apps/web` → **PASS**.
- `npm run lint --prefix apps/web` → **PASS con warnings**.
- `npm test --prefix apps/web` → **FAIL** (`expect is not defined`).
- `npm test --prefix apps/api` → **PASS** (tests actuales).

### Hallazgos de contrato y arquitectura
- `useUserRole` consume `/api/profile` para resolver acceso/rol.
- `GET /profile` en API devuelve `profile.profile ?? null` (no metadata de usuario/rol).
- `probeTrainerClientsCapability` intenta endpoints `/api/trainer/clients` y `/api/coach/clients`.
- En backend no hay endpoints trainer/coach equivalentes (búsqueda en `apps/api/src/index.ts`).

---

## 3) Top hallazgos priorizados (actualizados)

1. **[Critical] Seguridad documental: posibles secretos en docs/READMEs históricos.**
2. **[High] Contrato de roles incompleto (`/api/profile` sin `role`) con impacto en navegación y capacidades.**
3. **[High] Brecha trainer/coach: frontend espera endpoints no implementados.**
4. **[High] Test suite web bloqueada por configuración Vitest/Jest-DOM.**
5. **[Med-High] Calidad parcial: lint sin errores pero con warning backlog elevado.**
6. **[Medium] UX routing/i18n fragmentado (`trainer` vs `treinador`, ES/PT/EN mixto).**
7. **[Medium] Mobile nav bar: implementación correcta a nivel CSS base, pero comportamiento inconsistente en dispositivos reales por factores de viewport/composición de layout.**
8. **[Medium] Backend monolítico en `index.ts` (costo de cambio alto).**
9. **[Medium] Falta pipeline CI visible con quality gates obligatorios.**
10. **[Low-Med] Settings/Billing con UX insuficiente para conversión y confianza premium.**

---

## 4) Deep dive: Mobile nav bar (análisis exhaustivo solicitado)

## 4.1 Qué hay implementado hoy (estado real)

La barra móvil está implementada en `MobileTabBar.tsx` y se renderiza en el layout autenticado (`/(app)/app/layout.tsx`) al final de `app-frame`, no dentro de overlays temporales. A nivel CSS, usa `position: fixed`, `bottom: 0`, `inset-inline: 0`, `z-index: 45`, y `display: block` bajo `@media (max-width: 900px)`. Además, existe compensación de espacio inferior en contenedores (`page-with-tabbar-safe-area`, `app-shell`, `app-content`) usando variables `--mobile-tab-bar-offset` y safe-area.

**Conclusión parcial:** en escritorio responsive y escenarios ideales, la implementación está diseñada para quedar fija abajo.

## 4.2 Por qué puede “no verse fija” en móvil real aunque el CSS diga fixed

### Causa A — Dependencia de breakpoint sin garantía de viewport móvil correcto
La barra solo se muestra en `max-width: 900px`. Si en algunos entornos móviles no se aplica viewport esperado (o hay webview/in-app browser con viewport no estándar), la media query puede no activar consistentemente.

### Causa B — Dinámica de browser chrome (iOS/Android)
En navegadores móviles, barras del navegador (URL/bottom controls) alteran el **visual viewport** al hacer scroll. Un elemento `fixed` con `bottom: 0` puede quedar tapado/parcialmente fuera de área visible hasta que el browser chrome colapsa al scrollear.

### Causa C — Z-index competition contextual
Aunque `z-index: 45` es alto, existen capas por encima (`toast` 70, `modal` 60). En estados con overlays, la tab bar puede parecer “desaparecida” o no interactiva.

### Causa D — Combinación de alturas y paddings en múltiples contenedores
Hay varios ajustes de padding inferior (`app-shell`, `app-content`, `.page`, `.page-with-tabbar-safe-area`). Si una pantalla específica redefine layout o no hereda la clase esperada, se produce percepción de salto/solape y la barra se percibe tardía o “pegada al contenido” en vez de verdaderamente anclada.

### Causa E — Cobertura de layout parcial por segmentación App Router
La barra se monta en `/(app)/app/layout.tsx`; cualquier pantalla fuera de ese árbol no la tendrá. Para usuarios esto se siente inconsistente (“a veces está, a veces no”).

## 4.3 Qué se debe pasar al arquitecto fullstack para corrección definitiva

### Checklist de diagnóstico técnico (paso a paso)
1. Verificar `visualViewport.height` y `window.innerHeight` antes/después de scroll en iOS Safari y Chrome Android.
2. Inspeccionar en runtime si `.mobile-tab-bar` está `display: block` y cuál media query está activa.
3. Auditar páginas de `/app/*` para asegurar clase homogénea `page-with-tabbar-safe-area` o equivalente único.
4. Revisar overlays activos cuando “desaparece” (modal/toast/drawer).
5. Confirmar que no hay pantallas críticas fuera de `/(app)/app/layout.tsx` que el usuario perciba como parte del app shell.

### Solución recomendada (arquitectura UI robusta)
- Mantener `position: fixed`, pero migrar `bottom: 0` a estrategia con safe area explícita (`bottom: env(safe-area-inset-bottom)` + ajuste de altura)
- Unificar en **una sola utilidad de safe area** aplicada por layout, no por pantalla.
- Introducir `viewport-fit=cover` y validar comportamiento por navegador móvil.
- Subir tab bar a un portal dedicado en `body` cuando se detecten casos de stacking complejos.
- Agregar test E2E visual para asegurar persistencia de tab bar en rutas críticas y al cambiar estado de scroll.

## 4.4 Severidad e impacto de negocio
- **Severidad UX:** Alta en demo móvil.
- **Impacto negocio:** Alto (reduce percepción premium, genera desorientación de navegación y caída de activación en primeras sesiones).
- **Tipo de deuda:** Mixta (CSS/viewport + consistencia de layout + QA cross-device).

---

## 5) UI/UX y comentario específico para Marketing

### Diagnóstico UX global
- El sistema visual tiene base correcta (tokens + componentes), pero hay fricción en consistencia entre módulos críticos (settings/billing/trainer).
- La mezcla de rutas/idiomas y la inestabilidad percibida de navegación móvil dañan la sensación de “producto confiable”.

### Comentario concreto para jefe de marketing
**Hoy el mayor freno de conversión no es la falta de features, sino la falta de “claridad y control percibido” en la experiencia móvil.** Cuando la navegación inferior no se siente estable, el usuario interpreta que el producto es inacabado, y eso reduce confianza para:
1) completar onboarding,
2) volver al día siguiente,
3) considerar plan premium.

**Recomendación de marketing-producto (rápida):**
- Definir mensaje único de valor por pantalla principal (Hoy, Entrenamiento, Nutrición, Seguimiento).
- Alinear copy e idioma en todo el embudo.
- Tratar la tab bar como elemento de marca/retención, no solo componente técnico.

---

## 6) Plan de acción recomendado

### P0 (1-3 días)
1. Arreglar setup Vitest (`expect` global + `@testing-library/jest-dom/vitest`).
2. Corregir contrato de roles: resolver acceso con `/api/auth/me` o extender `/profile` con `role`.
3. Definir estado explícito del módulo trainer (feature flag o endpoint mínimo real).
4. Hardening de mobile tab bar en iOS/Android con pruebas en dispositivos reales.

### P1 (4-10 días)
1. Pipeline CI obligatorio: web lint + web test + web build + api test.
2. Reducir warnings críticos de hooks y componentes de navegación.
3. Unificar rutas/idioma canónico y mapa de navegación.

### P2 (2-4 semanas)
1. Modularización backend por dominios.
2. Rediseño Settings/Billing orientado a conversión y confianza.
3. Observabilidad mínima (errores FE, métricas clave funnel, alertas backend).

---

## 7) Regla de oro de release (obligatoria)

No se hace merge a main si falla cualquiera:
1. `npm run build --prefix apps/web`
2. `npm run lint --prefix apps/web`
3. `npm test --prefix apps/web`
4. `npm test --prefix apps/api`

Con el estado actual, build/lint/api-test están verdes; **web-test está rojo**, por lo que el release debería permanecer bloqueado hasta cerrar ese punto.
