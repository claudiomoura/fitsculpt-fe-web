# FitSculpt – Project Status (Atualizado Estratégico Exigente)

Data: 2026-02-27
Branch de referência: estado contenido en zips entregados
Owner: Founder/PM (FitSculpt)

> Nota crítica: Este documento separa claramente:
>
> - **Implementado en código**
> - **Validado end-to-end en entorno real**
> - **Vendible sin supervisión**
>
> Si no hay evidencia explícita de `npm run build` PASS + flujo manual probado en entorno production-like, se marca como **No Validado**.

---

# 1) Executive Snapshot Realista

## Release Readiness (B2C general)

**Estado real: Beta técnica avanzada, no production-grade aún**

### Evidencia nueva relevante encontrada en código

✔ E2E tests con Playwright (`e2e/core-loop.spec.ts`, `library-smoke.spec.ts`)
✔ AI layer estructurada con normalización, retry y pricing
✔ Sistema de charge AI usage (`chargeAiUsage.ts`)
✔ Módulo de entitlements separado
✔ Scripts de DB doctor, repair, bootstrap
✔ Contratos documentados en `/docs/contracts`
✔ Quality gates documentados en `/docs/ci/quality-gates.md`

Esto cambia el diagnóstico respecto a versiones anteriores:
Ya no es solo MVP con deuda, es un sistema con intención de robustez.

### Lo que sigue sin estar formalmente probado

⚠ No hay evidencia de pipeline CI obligatorio bloqueando merge
⚠ No hay evidencia de cobertura real de tests en build production
⚠ No hay prueba documentada de 0 errores consola en core loop
⚠ No hay evidencia de carga concurrente probada

### Conclusión honesta

Arquitectura madura en intención.
Producto aún no validado como sistema robusto autónomo.

Es un beta serio, pero todavía dependiente del founder.

---

## Gym Pilot Readiness (B2B pequeño gym)

**Estado real: MVP funcional con estructura correcta, aún no endurecido**

### Lo que sí está estructuralmente sólido

✔ Modelo Gym en backend
✔ Membership states
✔ Entitlements separados
✔ Billing layer separada
✔ AI pricing modular
✔ Scripts de seed y demo

### Riesgos actuales

⚠ Contratos FE↔BFF↔BE no versionados formalmente
⚠ No hay contract testing automático obligatorio
⚠ No hay test E2E específico del flujo Gym completo
⚠ Remove client no validado formalmente en backend

### Conclusión

El dominio está bien modelado.
La estabilidad operacional todavía depende de validación manual.

---

# 2) Estado por Dominio

---

## 2.1 Autenticación y Sesión

Implementado:

- Schemas formales en `auth/schemas.ts`
- Middleware BFF
- Cookie fs_token
- Utilidades de autenticación separadas

Validado:
⚠ No hay evidencia de test automatizado de expiración de sesión
⚠ No hay test de escenarios edge (refresh, logout race)

Estado:
Estable estructuralmente. No formalmente blindado.

---

## 2.2 AI Engine (Entrenamiento y Nutrición)

Implementado:
✔ Normalización explícita de planes
✔ Retry controlado (`nutritionRetry.ts`)
✔ Error classification
✔ Pricing separado
✔ Charge AI usage modular
✔ Fallback builder para training plan

Esto es arquitectura madura.

Validado:
⚠ No hay evidencia en los zips de test unitarios del normalizador
⚠ No hay evidencia de test de consistencia matemática formal en CI

Estado:
Arquitectura sólida. Validación formal incompleta.

---

## 2.3 Core Loop B2C

Implementado:
✔ E2E core-loop.spec.ts
✔ Persistencia tracking backend
✔ Biblioteca con media física real
✔ Resolución determinística de ejercicios

Validado:
⚠ No hay evidencia de ejecución automatizada en pipeline
⚠ No hay evidencia de pruebas de regresión tras cambios recientes

Estado:
Beta funcional técnicamente preparada para endurecer.

---

## 2.4 Biblioteca y Dataset

Implementado:
✔ Estructura consistente `/public/exercise-db/exercises/*`
✔ JSON + imágenes
✔ Script backfill

Estado:
Dominio de ejercicios robusto y consistente.

Este bloque está maduro.

---

## 2.5 Entitlements

Implementado:
✔ `src/entitlements.ts`
✔ Separación clara de planes
✔ Integración con AI pricing

Riesgo:
⚠ No hay contract test que garantice coherencia FE↔BE
⚠ No hay test automático que bloquee acceso indebido

Estado:
Modelo correcto. Enforcement necesita validación formal.

---

## 2.6 Billing

Implementado:
✔ Módulo billing separado
✔ Manejo de errores Stripe

Validado:
⚠ No hay evidencia de flujo end-to-end Stripe sandbox probado

Estado:
Arquitectura correcta, validación comercial pendiente.

---

# 3) Arquitectura – Evaluación Real

Frontend:

- Next.js App Router
- Tipado estricto
- E2E presente
- Estructura modular avanzada

Backend:

- Fastify
- Prisma
- Separación por dominios
- AI modularizada
- Scripts de mantenimiento DB

Conclusión arquitectónica:

Ya no es un prototipo desordenado.
Es un sistema bien pensado, pero aún sin blindaje operacional.

El problema actual no es arquitectura.
Es disciplina de validación y automatización de calidad.

---

# 4) Calidad y Disciplina Técnica

Positivos:
✔ Quality gates documentados
✔ E2E presentes
✔ Contratos documentados
✔ AI normalization formal

Débil:
⚠ No hay evidencia de CI obligatorio
⚠ No hay enforcement automático de tests antes de merge
⚠ No hay coverage report visible

Estado real:
Calidad diseñada, no completamente aplicada.

---

# 5) Riesgos Estratégicos Actuales

1. Falta de enforcement automático en CI.
2. Entitlements podrían divergir sin contract tests.
3. Dependencia del Founder para validar flows.
4. No hay pruebas de estrés o concurrencia.
5. AI cost control no validado en escenarios reales.

---

# 6) Diagnóstico Estratégico Honesto

FitSculpt ya es:

✔ Arquitectura bien diseñada
✔ Dominio fuerte
✔ AI integrada correctamente
✔ Dataset estructurado
✔ Visión estratégica clara

Pero aún no es:

✖ Sistema autónomo
✖ Production-grade validado
✖ Comercializable sin soporte cercano

Está en fase:

**Beta técnica avanzada con arquitectura sólida, validación incompleta.**

---

# 7) Qué Significa Esto Estratégicamente

No necesitas más features.

Necesitas:

1. CI obligatorio que bloquee merges si:
   - Build falla
   - Tests fallan
   - Tipado falla

2. Contract testing FE↔BE automático.

3. Checklist formal por PR.

4. Test E2E específico para:
   - Gym flow completo
   - Token deduction
   - AI retry controlado

---

# 8) Fase Recomendada Inmediata

## Fase 1 – Blindaje Técnico (7 días)

- Pipeline CI obligatorio
- Ejecutar Playwright en CI
- Test automático de chargeAiUsage
- Validación matemática nutrición como test unitario
- Contract tests básicos

## Fase 2 – Validación Comercial Real (7–10 días)

- Simulación gym real 3 usuarios concurrentes
- Prueba Stripe sandbox completa
- Auditoría entitlements
- Prueba AI límite consumo

## Fase 3 – Beta Facturable

Cuando:

- 0 errores consola en core loop
- Build reproducible
- 10 ejecuciones E2E consecutivas PASS
- Token deduction validado
- No hotfix manual requerido

---

# 9) Conclusión Estratégica Final

FitSculpt no está frágil.
Está incompletamente blindado.

La arquitectura ya está al nivel correcto para escalar.
La disciplina operativa aún no.

Estás en el punto donde muchos proyectos fracasan por querer añadir más features en lugar de consolidar.

No necesitas más producto.
Necesitas convertir lo que ya tienes en sistema inquebrantable.

---
