FitSculpt – Project Status (Atualizado Estratégico Exigente)

Data: 2026-02-22
Referência auditada: zips (solo lectura), sin commit hash
Front zip SHA-256: edbcba28aad6e0ff21924c9491540789359d5d49083858bda443ae2a2e7ed402
Back zip SHA-256: 35d8725530faaa893b5d843ea2fcf4332c29c10c1f21b445c5375e451eae3f6e
Owner: Founder/PM (FitSculpt)

Nota crítica: Este documento separa claramente:

Implementado en código

Validado end-to-end en entorno real

Vendible sin supervisión

Si no hay evidencia de npm run build PASS + flujo manual probado, se marca como No Validado.
Esta actualización se basa en auditoría estática de zips, por tanto builds y flujos quedan como No Ejecutado.

1) Executive Snapshot Realista
Release Readiness (B2C general)

Estado real: NO Release-ready

Lo que está implementado (evidencia en código)

✔ Login + /app protegido (middleware)
✔ Tab bar mobile (layout + nav config)
✔ Biblioteca lista + detalle (rutas existen)
✔ Tracking persiste en backend (endpoint existe)
✔ i18n ES/EN base funcional

Lo que está roto o degradado (nuevo, P0)

🧨 P0 Biblioteca: imágenes no aparecen aunque existan
Causa probable por código: normalizeExercisePayload en backend ignora exercise.imageUrl y solo deriva imageUrl desde imageUrls[]. Resultado: imageUrl puede quedar null aunque haya dato real, y el front cae en placeholder.
Impacto: la “Exercise Library” se percibe pobre, baja confianza del producto, afecta demo y conversión.

Lo que está validado formalmente

⚠ Build/Lint/Tests: No Ejecutado (auditoría estática, sin instalación ni pipeline)
⚠ No hay CI/gate verificable que bloquee merges si TypeScript/build falla (no se ve .github/ en zip front)
⚠ Fragilidad por lógica defensiva en FE/BFF para tolerar respuestas variables

Conclusión honesta

Demo potencialmente funcional si el repo está “verde” en tu máquina.
Pero el estado verificable con esta evidencia es: implementado, no certificado, y con un P0 visible en biblioteca.

Gym Pilot Readiness (B2B pequeño gym)

Estado real: DEMO asistida: SÍ, autónomo: NO

Flujo teórico completo

Usuario solicita unirse a gym

Admin/trainer acepta o gestiona membership

Membership cambia a ACTIVE

Plan asignado manualmente

Usuario ve plan

Evidencia de riesgos actuales (código)

⚠ Duplicidad de rutas: /app/trainer y /app/treinador coexisten, deuda y bugs potenciales
⚠ Admin nav con items deshabilitados/coming soon, riesgo de callejones sin salida
⚠ Mismatch de shape en gyms: backend devuelve array, BFF lo envuelve como { gyms: ... }, FE mantiene parsers defensivos
⚠ Entitlements modulares no cerrados en UI, afecta venta por módulos y upsell

Conclusión

Vendible en demo controlada con soporte del founder.
No robusto todavía para “entregar a un gym y olvidarte”.

2) Estado por Dominio (Implementado vs Validado)
2.1 Autenticación y Sesión

Implementado:

Cookie fs_token

Middleware protege /app

BFF /api/* como capa intermedia

Validado:

Funciona en dev (histórico), No Validado en build production en esta auditoría (No Ejecutado)

Riesgo:

P0 absoluto. Regresión aquí rompe todo.

Estado: Implementado, sensible, no certificado.

2.2 Onboarding & Perfil

Implementado:

Perfil básico y endpoint /auth/me

Flags como isTrainer aparecen en respuesta (útil para gating)

Validado:

⚠ No hay evidencia de checklist formal de regresión.

Estado: Funcional, no auditado E2E.

2.3 Hoy (Core Loop B2C)

Implementado:

Ruta presente en tabs (base para “1 acción rápida”)

Validado:

⚠ No hay evidencia de flujo cronometrado sin errores consola, ni smoke test.

Estado: Demo-ready, no certificado.

2.4 Tracking

Implementado:

Persistencia backend para tracking

Pantalla/cliente de tracking existe

Validado:

⚠ No documentado E2E reproducible (auditoría estática).

Estado: Implementado, No Validado.

2.5 Food Log / Macros

Implementado:

Registro de ítems por gramos existe en UI de tracking (según código)

Persistencia existe en backend

Validado:

⚠ “Macros/calorías completo” depende de UX y datos de alimentos, No Validado.

Estado: PARTIAL (implementado base), No Validado.

2.6 Biblioteca

Implementado:

Lista y detalle (rutas existen)

P0 nuevo:

🧨 Media rota por normalización en backend: exercise.imageUrl no fluye correctamente, se prioriza imageUrls[], puede producir null y placeholder.

Pendiente:

Consistencia de media en contexto trainer/gym

Estrategia media real (GIF/video) y uploader admin, si el objetivo es premium

Estado: Estructura sólida, experiencia degradada por P0, No Validado E2E.

2.7 IA Nutrición y Fitness

Implementado (backend):

Endpoints de IA para nutrition plan y training plan existen (generación y ajustes)

Validado:

⚠ No hay evidencia de validación E2E (build + flujo real).
⚠ Riesgo de “output no validado” si no hay validación estricta antes de persistir (revisar en implementación, no inferir).

Estado: Implementado (endpoints), No Validado E2E.

2.8 Entitlements / Billing / Planes

Implementado (backend):

Planes modulares existen: FREE, STRENGTH_AI, NUTRI_AI, PRO

Entitlements definidos en back/src/entitlements.ts (versionado 2026-02-01, según auditoría)

Problema crítico (frontend):

⚠ FE colapsa a FREE/PRO/GYM, pierde modularidad real.
Impacto: upsell incorrecto, acceso inconsistente, difícil vender módulos separados.

Validado:

⚠ No Validado E2E. Mismatch conceptual confirmado por código.

Estado: FAIL como “MVP modular” (modelo BE ≠ UI gating real).

2.9 Gym Domain

Implementado:

Dominio presente y utilizable en demo asistida

BFF /api/admin/* existe (señales claras de panel admin)

Frágil:

⚠ Shape mismatch BE↔BFF↔FE (array vs {gyms:...})
⚠ Duplicidad de rutas trainer/treinador
⚠ Nav admin con secciones deshabilitadas

Estado real:

Dominio presente y utilizable en demo asistida.
No autónomo sin soporte.

3) Arquitectura – Estado Real

Frontend:

Next.js App Router

BFF obligatorio (/api/*)

Señales de fragilidad por rutas duplicadas y parsers defensivos

Backend:

Fastify + Prisma

Entitlements en fuente (back/src/entitlements.ts), backend compilado muestra concentración de endpoints (señal de “god file”)

Señal de ~99 endpoints en dist/index.js (indicativo de superficie grande y acoplamiento)

Riesgo estructural actual:

No hay “build gate” verificable

Contratos FE↔BFF↔BE no formalizados, se compensan con normalización defensiva

4) Calidad – Estado Real

Build/Lint/Tests:

No Ejecutado en esta auditoría (solo evidencia de scripts)

Hay señales de tests en backend (entitlements), pero no hay pipeline verificable que los ejecute automáticamente

Console errors:

⚠ No hay evidencia de “0 errores consola” en flujos Gym/Trainer.

Estado:

Calidad sigue dependiendo de intervención manual y disciplina del founder.

5) Riesgos Estratégicos Actuales (Top 6)

P0 Biblioteca media: imágenes no aparecen por normalización backend, demo se percibe “barata”.

Entitlements modulares no cerrados: BE modular, FE colapsado, venta/upsell rota.

Sin CI/gate: regresiones de build/typecheck entran fácil.

Rutas duplicadas trainer/treinador: deuda alta, enlaces inconsistentes, bugs.

Contratos con shapes divergentes: BFF envuelve o transforma, FE normaliza defensivamente.

Backend “god file”: cambios arriesgados, testabilidad y modularidad peor.

6) Diagnóstico Honesto

FitSculpt ya tiene producto real en código, no es solo prototipo.
Pero el estado verificable hoy es:

✔ Mucho implementado (Gym, IA endpoints, tracking, app shell).
✖ Falta certificación: build reproducible, gates, contratos cerrados y modularidad real.
🧨 Hay un P0 visible que degrada “premium feel” en biblioteca.

7) Qué significa esto estratégicamente

Hoy puedes:

✔ Hacer demo controlada, especialmente B2C y Gym Pilot asistido.

Hoy no puedes (sin riesgo):

✖ Entregar a un gym pequeño como autoservicio sin soporte.
✖ Vender módulos separados (Strength IA vs Nutri IA) si el FE no gatea por módulos reales.
✖ Sostener percepción premium si la biblioteca sigue con placeholders.

8) Próximo Foco Estratégico Real (sin features nuevas)

Fase 0 (hotfix) – Biblioteca premium visible

Arreglar normalización imageUrl (respetar exercise.imageUrl y fallback a imageUrls[])

Smoke test visual: lista y detalle muestran media real, cero placeholders cuando hay dato

Fase 1 – Estabilidad Absoluta

CI mínimo (build + lint + typecheck) bloqueando merge

Eliminar duplicidad trainer vs treinador (canonical route)

Contrato gyms unificado (decidir array vs {gyms} y aplicarlo en BFF+FE)

Smoke test manual documentado: login → hoy → tracking → biblioteca → gym (0 errores consola)

Fase 2 – MVP Modular Real

FE debe reflejar módulos BE (STRENGTH_AI, NUTRI_AI) y CTAs correctos

Backend-driven gating en UI, sin inventar tiers

Fase 3 – Gym Rock Solid

Seed demo estable

Flujos join/accept/assign plan sin callejones, y checklist E2E

9) Conclusión Estratégica

FitSculpt está en el punto crítico donde el diferencial ya no es “más features”, es coherencia y verificación.

El producto es vendible en demo.
La estructura aún no es inquebrantable, y el P0 de biblioteca afecta directamente la percepción premium.