# FitSculpt – Project Status (Atualizado Estratégico Exigente)

Data: 2026-02-21
Referência auditada: **zips (solo lectura)**, sin commit hash
Front zip SHA-256: `edbcba28aad6e0ff21924c9491540789359d5d49083858bda443ae2a2e7ed402`
Back zip SHA-256: `35d8725530faaa893b5d843ea2fcf4332c29c10c1f21b445c5375e451eae3f6e`
Owner: Founder/PM (FitSculpt)

> Nota crítica: Este documento separa claramente:
>
> * **Implementado en código**
> * **Validado end-to-end en entorno real**
> * **Vendible sin supervisión**
>
> Si no hay evidencia de `npm run build` PASS + flujo manual probado, se marca como **No Validado**.
> Esta actualización se basa en auditoría estática de zips, por tanto builds y flujos quedan como **No Ejecutado**.

---

# 1) Executive Snapshot Realista

## Release Readiness (B2C general)

**Estado real: NO Release-ready**

### Lo que está implementado (evidencia en código)

✔ Login + `/app` protegido (middleware)
✔ Tab bar mobile (layout + nav config)
✔ Biblioteca lista + detalle (rutas existen)
✔ Tracking persiste en backend (endpoint existe)
✔ i18n ES/EN base funcional

### Lo que está validado formalmente

⚠ **Build/Lint/Tests: No Ejecutado** (auditoría estática, sin instalación ni pipeline)
⚠ **No hay CI/gate** que bloquee merges si TypeScript/build falla (no se ve `.github/` en zip front)
⚠ Fragilidad por lógica defensiva en FE/BFF para tolerar respuestas variables

### Conclusión honesta

Demo potencialmente funcional si el repo está “verde” en tu máquina.
Pero el estado verificable con esta evidencia es: **implementado, no certificado** (sin build gate ni pruebas E2E reproducibles).

---

## Gym Pilot Readiness (B2B pequeño gym)

**Estado real: DEMO asistida: SÍ, autónomo: NO**

### Flujo teórico completo

1. Usuario solicita unirse a gym
2. Admin/trainer acepta o gestiona membership
3. Membership cambia a ACTIVE
4. Plan asignado manualmente
5. Usuario ve plan

### Evidencia de riesgos actuales (código)

⚠ **Duplicidad de rutas**: `/app/trainer` y `/app/treinador` coexisten, deuda y bugs potenciales
⚠ **Admin nav con items deshabilitados/coming soon** (riesgo de callejones sin salida)
⚠ **Mismatch de shape en gyms**: backend devuelve array, BFF lo envuelve como `{ gyms: ... }`, FE mantiene parsers defensivos
⚠ **Entitlements modulares no cerrados** (ver abajo), afecta venta de módulos a gym y upsell

### Conclusión

Vendible en demo controlada con soporte del founder.
No robusto todavía para “entregar a un gym y olvidarte”.

---

# 2) Estado por Dominio (Implementado vs Validado)

## 2.1 Autenticación y Sesión

Implementado:

* Cookie `fs_token`
* Middleware protege `/app`
* BFF `/api/*` como capa intermedia

Validado:

* Funciona en dev (histórico), **No Validado en build production** en esta auditoría (No Ejecutado)

Riesgo:

P0 absoluto. Regresión aquí rompe todo.

Estado: **Implementado, sensible, no certificado**.

---

## 2.2 Onboarding & Perfil

Implementado:

* Perfil básico y endpoint `/auth/me`
* Flags como `isTrainer` aparecen en respuesta (útil para gating)

Validado:

⚠ No hay evidencia de checklist formal de regresión.

Estado: **Funcional, no auditado E2E**.

---

## 2.3 Hoy (Core Loop B2C)

Implementado:

* Ruta presente en tabs (base para “1 acción rápida”)

Validado:

⚠ No hay evidencia de flujo cronometrado sin errores consola, ni smoke test.

Estado: **Demo-ready, no certificado**.

---

## 2.4 Tracking

Implementado:

* Persistencia backend para tracking
* Pantalla/cliente de tracking existe

Validado:

⚠ No documentado E2E reproducible (auditoría estática).

Estado: **Implementado, No Validado**.

---

## 2.5 Food Log / Macros

Implementado:

* Registro de ítems por gramos existe en UI de tracking (según código)
* Persistencia existe en backend

Validado:

⚠ “Macros/calorías completo” depende de UX y datos de alimentos, **No Validado**.

Estado: **PARTIAL (implementado base), No Validado**.

---

## 2.6 Biblioteca

Implementado:

* Lista y detalle (rutas existen)
* Viewer/media en frontend (según estructura detectada)

Pendiente:

* Consistencia de media en contexto trainer/gym
* Multi-add a planes (si es objetivo inmediato de trainer)

Estado: **Sólido en estructura, No Validado E2E**.

---

## 2.7 IA Nutrición y Fitness

Implementado (backend):

* Endpoints de IA para nutrition plan y training plan existen (generación y ajustes)

Validado:

⚠ No hay evidencia de validación E2E (build + flujo real).
⚠ Riesgo de “output no validado” si no hay validación estricta antes de persistir (revisar en implementación, no inferir).

Estado: **Implementado (endpoints), No Validado E2E**.

---

## 2.8 Entitlements / Billing / Planes

Implementado (backend):

* Planes modulares existen: `FREE`, `STRENGTH_AI`, `NUTRI_AI`, `PRO`

Problema crítico (frontend):

⚠ FE colapsa a `FREE/PRO/GYM`, pierde modularidad real
Impacto: upsell incorrecto, acceso inconsistente, difícil vender módulos separados.

Validado:

⚠ No Validado E2E. Mismatch conceptual confirmado por código.

Estado: **FAIL como “MVP modular”** (modelo BE ≠ UI gating real).

---

## 2.9 Gym Domain

Implementado:

* CRUD/admin gyms en backend (al menos list/create/delete)
* Señales de membership/join flow en el dominio
* BFF `/api/admin/gyms` existe

Frágil:

⚠ Shape mismatch BE↔BFF↔FE (array vs `{gyms:...}`)
⚠ Duplicidad de rutas trainer/treinador
⚠ Nav admin con secciones deshabilitadas

Estado real:

Dominio presente y utilizable en demo asistida.
No autónomo sin soporte.

---

# 3) Arquitectura – Estado Real

Frontend:

* Next.js App Router
* BFF obligatorio (`/api/*`)
* Tipado estricto con historial de fragilidad por cambios en marketing y rutas duplicadas

Backend:

* Fastify + Prisma
* Dominio Gym + Entitlements + IA concentrados
* Señal clara de “backend source of truth”, pero con riesgo de “god file” (index grande)

Riesgo estructural actual:

* No hay “build gate” verificable
* Contratos FE↔BFF↔BE no están formalizados como contrato único, se compensan con parsers

---

# 4) Calidad – Estado Real

Build/Lint/Tests:

* **No Ejecutado** en esta auditoría (solo evidencia de scripts)
* Hay unit tests en backend (entitlements), pero no hay pipeline que los ejecute automáticamente

Console errors:

⚠ No hay evidencia de “0 errores consola” en flujos Gym/Trainer.

Estado:

Calidad sigue dependiendo de intervención manual y disciplina del founder.

---

# 5) Riesgos Estratégicos Actuales (Top 5)

1. **Entitlements modulares no cerrados**: BE modular, FE colapsado, venta/upsell rota.
2. **Sin CI/gate**: regresiones de build/typecheck entran fácil.
3. **Rutas duplicadas trainer/treinador**: deuda alta, enlaces inconsistentes, bugs.
4. **Contratos con shapes divergentes**: BFF envuelve o transforma, FE normaliza defensivamente.
5. **Backend “index.ts” grande**: cambios arriesgados, testabilidad y modularidad peor.

---

# 6) Diagnóstico Honesto

FitSculpt ya tiene producto real en código, no es solo prototipo.
Pero el estado verificable hoy es:

✔ Mucho implementado (Gym, IA endpoints, tracking, app shell).
✖ Falta **certificación**: build reproducible, gates, contratos cerrados y modularidad real.

---

# 7) Qué significa esto estratégicamente

Hoy puedes:

✔ Hacer demo controlada, especialmente B2C y Gym Pilot asistido.

Hoy no puedes (sin riesgo):

✖ Entregar a un gym pequeño como autoservicio sin soporte.
✖ Vender módulos separados (Strength IA vs Nutri IA) si el FE no gatea por módulos reales.

---

# 8) Próximo Foco Estratégico Real (sin features nuevas)

Fase 1 – **Estabilidad Absoluta**

* CI mínimo (build + lint + typecheck) bloqueando merge
* Eliminar duplicidad `trainer` vs `treinador` (canonical route)
* Contrato gyms unificado (decidir array vs `{gyms}` y aplicarlo en BFF+FE)
* Smoke test manual documentado: login → hoy → tracking → biblioteca → gym (0 errores consola)

Fase 2 – **MVP Modular Real**

* FE debe reflejar módulos BE (`STRENGTH_AI`, `NUTRI_AI`) y CTAs correctos
* Backend-driven gating en UI, sin inventar tiers

Fase 3 – **Gym Rock Solid**

* Seed demo estable
* Flujos join/accept/assign plan sin callejones, y checklist E2E.

---

# 9) Conclusión Estratégica

FitSculpt está en el punto crítico donde el diferencial ya no es “más features”, es **coherencia y verificación**.

El producto es vendible en demo.
La estructura aún no es inquebrantable.
