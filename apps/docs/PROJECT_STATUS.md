# FitSculpt – Project Status (Atualizado Estratégico Exigente)

Data: 2026-02-19
Branch de referência: `work` (última referencia conocida)
Owner: Founder/PM (FitSculpt)

> Nota crítica: Este documento separa claramente:
>
> * **Implementado en código**
> * **Validado end-to-end en entorno real**
> * **Vendible sin supervisión**
>
> Si no hay evidencia de `npm run build` PASS + flujo manual probado, se marca como **No Validado**.

---

# 1) Executive Snapshot Realista

## Release Readiness (B2C general)

**Estado real: NO Release-ready**

### Lo que está implementado

✔ Login + `/app` protegido
✔ Tab bar mobile
✔ Biblioteca lista + detalle
✔ Tracking persiste en backend
✔ i18n ES/EN base funcional

### Lo que está validado formalmente

⚠ Build PASS solo tras hotfix manual
⚠ TypeScript ha fallado múltiples veces en producción build
⚠ Componentes marketing rompieron tipado

### Conclusión honesta

Demo funcional si todo está verde.
Pero hoy el estado es: **estable sólo tras intervención manual y triage de build.**

No es todavía production-grade.

---

## Gym Pilot Readiness (B2B pequeño gym)

**Estado real: MVP demostrable con supervisión. No autónomo.**

### Flujo teórico completo

1. Usuario solicita unirse
2. Admin/trainer acepta
3. Membership cambia a ACTIVE
4. Plan asignado manualmente
5. Usuario ve plan

### Validación real

⚠ Hubo mismatch FE↔BE en creación de gym (`code` obligatorio)
⚠ Hubo crash runtime en AdminGyms
⚠ BFF devolvió shape inesperado
⚠ Entitlements inconsistentes

### Conclusión

Vendible en demo asistida.
No robusto para uso real sin soporte.

---

# 2) Estado por Dominio (Implementado vs Validado)

---

## 2.1 Autenticación y Sesión

Implementado:

* Cookie `fs_token`
* Middleware protege `/app`
* BFF obligatorio

Validado:

* Funciona en dev
* No se ha validado formalmente en build production

Riesgo:
P0 absoluto. Cualquier regresión aquí rompe todo.

Estado: Estable pero sensible.

---

## 2.2 Onboarding & Perfil

Implementado:

* Perfil básico
* i18n interpolaciones corregidas

Validado:
⚠ No hay checklist formal de regresión tras cambios recientes.

Estado: Funcional, no auditado formalmente.

---

## 2.3 Hoy (Core Loop B2C)

Implementado:

* Quick actions
* Integración tracking

Validado:
⚠ No hay evidencia documentada de flujo cronometrado limpio
⚠ No hay smoke test automatizado

Estado: Demo-ready, no certificado.

---

## 2.4 Tracking

Implementado:

* BFF `/api/tracking`
* Persistencia backend

Validado:
⚠ No documentado E2E con evidencia reproducible

Estado: Probablemente funcional, no formalizado.

---

## 2.5 Biblioteca

Implementado:

* Lista
* Detalle
* Media viewer

Pendiente:

* Imágenes consistentes en vista trainer
* Multi-add a planes

Estado: Sólido en B2C, incompleto en Gym contexto.

---

## 2.6 Gym Domain

Implementado:
✔ Modelo Gym backend
✔ Membership states
✔ Join request
✔ Accept/reject
✔ Asignación manual de plan

Frágil:
⚠ Contratos FE↔BFF↔BE cambiaron varias veces
⚠ Admin create tuvo mismatch obligatorio
⚠ Runtime crash en AdminGyms
⚠ Build TypeScript roto recientemente

Estado real:
Dominio implementado.
Infraestructura aún inestable.

---

## 2.7 Trainer (Comercializable)

Implementado:

* Listado base de planes
* Asignación manual básica
* Editor por día ahora permite editar y persistir `sets/reps/rest/notes/tempo` únicamente cuando esos campos existen en el payload del backend.
* Estados de no-soporte limpios para `PATCH` no disponible (404/405/501), sin romper la página.
* Ajustes de UX en modal de creación: scroll interno + barra de acciones sticky para evitar que "Add set" saque controles fuera de pantalla.

No validado:
⚠ Plantilla dinámica por nº días no cerrada
⚠ Search biblioteca no validada formalmente
⚠ Remove client no auditado en BE

Estado:
Base funcional con edición granular de ejercicios en día.
Pendiente validación E2E en entorno gym real.

---

# 3) Arquitectura – Estado Real

Frontend:

* Next.js App Router
* BFF obligatorio
* Tipado estricto
* Varios errores TS recientes
* Componentes marketing rompieron build

Backend:

* Fastify + Prisma
* Dominio Gym integrado
* Backend como source of truth

Riesgo estructural actual:

* Falta de “build gate” obligatorio antes de merge
* No hay pipeline que bloquee PR si TypeScript falla
* Entitlements no alineados completamente

---

# 4) Calidad – Estado Real

Build:

* Ha fallado varias veces en los últimos cambios
* TypeScript estrictamente activo

Console errors:
⚠ No hay validación formal de “0 errores consola” en flujos Gym

Testing:

* No hay smoke tests automatizados
* No hay checklist formal obligatorio por PR

Estado:
Calidad dependiente del Founder.

---

# 5) Riesgos Estratégicos Actuales

1. Entitlements inconsistentes pueden permitir accesos indebidos.
2. Build no blindado con gate automático.
3. Contratos FE↔BE no están formalmente versionados.
4. Múltiples hotfix manuales indican fragilidad.
5. MVP depende demasiado de tu intervención directa.

---

# 6) Diagnóstico Honesto

FitSculpt ya no es un prototipo.
Pero todavía no es un sistema robusto y autónomo.

Está en una fase crítica:

✔ Dominio fuerte
✔ Arquitectura clara
✔ MVP comercialmente atractivo

Pero necesita:

* Estabilidad de build
* Contratos cerrados
* Flujo Gym cronometrado sin errores
* Entitlements coherentes

---

# 7) Qué significa esto estratégicamente

Hoy puedes:
✔ Hacer demo controlada
✔ Mostrar flujo completo asistido

Hoy no puedes:
✖ Dejarlo en manos del gym sin supervisión
✖ Considerarlo production-grade
✖ Escalar sin riesgo de regresión

---

# 8) Próximo Foco Estratégico Real (no features nuevas)

Fase 1 – Estabilidad Absoluta (1 semana)

* Build PASS obligatorio en cada commit
* Script CI local mínimo
* Validar flujo Gym con cronómetro
* 0 errores consola

Fase 2 – Gym Rock Solid (1–2 semanas)

* Seed demo estable
* Remove client validado BE
* Plantilla planes cerrada
* Multi-add ejercicios validado

Fase 3 – Entitlements reales

* Backend-driven gating
* Eliminar tiers inventados
* Modelo comercial limpio

---

# 9) Conclusión Estratégica

FitSculpt está en el punto exacto donde muchos proyectos mueren o escalan.

No necesita más features.
Necesita coherencia, validación formal y disciplina de build.

El producto es vendible.
La estructura aún no es inquebrantable.

