# Linear Initial Load Plan

## 1. Objetivo del documento

Este documento define exactamente como cargar la primera capa operativa del `Weekly Adaptive Coach` en Linear para que un equipo pequeno pueda arrancar ejecucion real sin rediscutir estructura, prioridades ni workflow.

Regla base:

- `docs/strategy/` = fuente de verdad de estrategia y decisiones maestras.
- `Linear` = fuente de verdad de ejecucion, secuenciacion, ownership y estado.

## 2. Setup recomendado del workspace

### Workspace

- Nombre: `FitSculpt`
- Timezone operativa: una sola timezone para planning y ciclos
- Ciclos: semanales
- Estimaciones: opcionales en MVP; si se usan, solo `S`, `M`, `L`
- Roadmaps: habilitados para projects e initiatives
- Templates: habilitar template unico de issue para evitar historias vacias

### Teams iniciales exactos

Crear exactamente estos 3 teams:

| Team | Uso real | Scope |
| --- | --- | --- |
| `Product` | definicion, UX, scope, QA funcional, release readiness | PRD, specs, copy, acceptance criteria, QA/UAT |
| `App` | frontend + backend del producto | onboarding, home, logging, check-in, decision surface, persistencia |
| `Intelligence` | decisioning, analytics, data contracts, observabilidad | reglas, reason codes, taxonomia de eventos, decision quality |

Decision operativa:

- No crear un team separado de Design al inicio.
- Design vive dentro de `Product` para reducir handoffs y overhead.
- Si el volumen crece, se puede abrir luego `Design` como team propio; no ahora.

## 3. Projects, initiatives y ciclos iniciales

### Projects exactos a crear primero

Crear exactamente estos 3 projects:

| Project | Team owner | Horizonte | Objetivo |
| --- | --- | --- | --- |
| `Phase 0 - Foundations` | Product | semanas 1-2 | cerrar scope, datos, safety, reglas y taxonomia del MVP |
| `Phase 1 - Weekly Adaptive Coach MVP` | App | semanas 3-6 | construir el loop completo usable: onboarding -> plan -> check-in -> decision |
| `Phase 2 - Decision Quality & Trust` | Intelligence | semanas 7-8 | reforzar explicabilidad, observabilidad, confianza y recovery |

### Initiatives exactas a crear primero

Si el workspace usa initiatives, crear exactamente estas 3:

| Initiative | Objetivo | Projects asociados |
| --- | --- | --- |
| `Launch the Weekly Adaptive Coach MVP` | poner en produccion un loop semanal completo, visible y usable | Phase 0, Phase 1 |
| `Trustworthy Decisioning` | asegurar recomendaciones explicables, conservadoras y auditables | Phase 0, Phase 2 |
| `Weekly Loop Analytics Backbone` | medir activacion, check-in, decision y aceptacion end-to-end | Phase 0, Phase 1, Phase 2 |

### Cycles exactos para crear primero

Crear 3 ciclos semanales iniciales:

| Cycle | Nombre sugerido | Foco |
| --- | --- | --- |
| Cycle 1 | `C1 - Foundations Freeze` | scope, data model, analytics taxonomy, decision rules base |
| Cycle 2 | `C2 - UX + Contracts` | UX specs, payloads, safety UX, issue refinement lista para build |
| Cycle 3 | `C3 - MVP Build Start` | surfaces criticas y primer delivery vertical |

No crear 8 ciclos de entrada. Crear 3, ejecutar, aprender y luego abrir los siguientes para no congelar planning con falsa precision.

## 4. Labels y modelo de prioridad

### Labels exactos a crear

| Grupo | Labels |
| --- | --- |
| Area | `area/product`, `area/design`, `area/frontend`, `area/backend`, `area/ai`, `area/data`, `area/analytics`, `area/trust-safety` |
| Fase | `phase-0`, `phase-1`, `phase-2` |
| Tipo | `type/epic`, `type/story`, `type/task`, `type/spike`, `type/bug` |
| Surface | `surface/onboarding`, `surface/plan`, `surface/home`, `surface/logging`, `surface/check-in`, `surface/decision`, `surface/history`, `surface/trust` |
| Riesgo | `risk/safety`, `risk/dependency`, `risk/scope`, `risk/data-quality` |
| Estado de madurez | `ready/defined`, `ready/blocked`, `ready/needs-spec` |
| Segmento | `segment/initial` |

### Modelo de prioridad recomendado

| Prioridad | Criterio de uso | Regla |
| --- | --- | --- |
| `P0` | bloquea loop core, safety o salida a usuarios | no mas de 5 issues P0 abiertas al mismo tiempo |
| `P1` | necesario para MVP usable | default del backlog comprometido |
| `P2` | mejora calidad, confianza o operacion | entra solo si no rompe foco del ciclo |
| `P3` | exploracion o mejora futura | no entra a ciclo salvo hueco real |

Decision operativa:

- Para este primer tramo, casi todo debe ser `P0` o `P1`.
- Si un issue no afecta activacion, weekly loop, confianza o release readiness, probablemente no debe existir aun.

## 5. Statuses y workflow sugeridos

Usar workflow simple y estricto:

| Status | Uso |
| --- | --- |
| `Backlog` | idea aprobada pero aun no refinada |
| `Ready` | tiene contexto, owner, links y acceptance criteria; puede entrar a ciclo |
| `In Progress` | trabajo activo real |
| `In Review` | revision funcional, tecnica o de contenido |
| `Blocked` | dependencia externa o decision pendiente |
| `Done` | entregable cerrado y fuente de verdad actualizada |

Reglas:

- No usar mas de 6 estados en esta fase.
- No mover a `Ready` un issue sin doc fuente y acceptance criteria.
- `Done` exige actualizar doc del repo si el issue cambia definicion o criterio de producto.

## 6. Epics iniciales a crear primero

Crear primero estos epics en este orden:

| Epic | Project | Objetivo |
| --- | --- | --- |
| `EP-01 Product Definition & MVP Scope Freeze` | Phase 0 - Foundations | congelar promesa, scope y release criteria |
| `EP-02 Weekly Data Model & Event Taxonomy` | Phase 0 - Foundations | cerrar entidades, payloads y eventos obligatorios |
| `EP-03 Decision Engine Rules & Reason Codes v1` | Phase 0 - Foundations | fijar decision canonica y explicabilidad |
| `EP-04 Trust & Safety Foundations` | Phase 0 - Foundations | guardrails, fallback y mensajes de seguridad |
| `EP-05 Coach-Level Onboarding` | Phase 1 - Weekly Adaptive Coach MVP | definir y luego construir onboarding creible |
| `EP-06 Initial Plan Generation & Explanation` | Phase 1 - Weekly Adaptive Coach MVP | generar semana 1 y explicar por que encaja |
| `EP-07 Weekly Home & Logging Minimum Viable` | Phase 1 - Weekly Adaptive Coach MVP | hacer visible la semana y capturar senales minimas |
| `EP-08 Weekly Check-in Experience` | Phase 1 - Weekly Adaptive Coach MVP | implementar el loop obligatorio de 3 a 5 minutos |
| `EP-09 Coach Decision Surface & Plan Diff` | Phase 1 - Weekly Adaptive Coach MVP | entregar el valor visible del coach |
| `EP-10 Analytics, QA & MVP Release Readiness` | Phase 1 - Weekly Adaptive Coach MVP | asegurar medicion, QA y salida controlada |

## 7. Primer batch de issues a crear

Crear primero este batch. No cargar las 39 historias del backlog inicial de una sola vez. Cargar primero las que permiten arrancar, asignar y entrar en cycles sin ruido.

| Key sugerida | Titulo conciso | Proposito | Prioridad | Epic |
| --- | --- | --- | --- | --- |
| `FS-001` | Congelar objetivo y promesa MVP | cerrar que se lanza, para quien y que promesa exacta sostiene el wedge | P0 | EP-01 |
| `FS-002` | Cerrar scope in/out del MVP | eliminar ambiguedad sobre surfaces y features fuera de launch | P0 | EP-01 |
| `FS-003` | Definir release gates del MVP | fijar criterios funcionales, safety y analytics para go/no-go | P0 | EP-01 |
| `FS-004` | Alinear vocabulario canonico del coach | evitar lenguaje inconsistente entre docs, UX y backlog | P1 | EP-01 |
| `FS-005` | Definir entidades del loop semanal | cerrar modelo MVP de perfil, semana, check-in, decision y adaptacion | P0 | EP-02 |
| `FS-006` | Definir contrato app <-> decision engine | fijar payloads de entrada y salida versionados | P0 | EP-02 |
| `FS-007` | Definir taxonomia de eventos analytics | asegurar medicion end-to-end del loop | P0 | EP-02 |
| `FS-010` | Definir reglas MVP de decision | bajar a reglas operativas `mantener`, `ajustar`, `simplificar`, `redisenar` | P0 | EP-03 |
| `FS-011` | Definir reason codes internos y visibles | garantizar explicabilidad legible y consistente | P0 | EP-03 |
| `FS-012` | Definir cambios permitidos por decision | traducir decision a cambios concretos de plan | P0 | EP-03 |
| `FS-014` | Definir triggers de seguridad y deferencia | explicitar cuando el sistema no debe adaptar normalmente | P0 | EP-04 |
| `FS-015` | Definir UX de safety y fallback | cerrar mensaje, CTA y comportamiento en estados de riesgo | P0 | EP-04 |
| `FS-017` | Diseñar flujo de onboarding coach-level | estructurar el onboarding para capturar contexto sin fatiga | P0 | EP-05 |
| `FS-018` | Especificar campos obligatorios del onboarding | bajar inputs a nivel de campo y validacion basica | P0 | EP-05 |
| `FS-021` | Definir estructura del plan inicial | fijar modulos obligatorios de la semana 1 | P0 | EP-06 |
| `FS-025` | Definir home semanal MVP | hacer visible objetivo semanal, progreso y CTA al loop | P0 | EP-07 |
| `FS-026` | Definir logging minimo viable | fijar senales minimas sin sobrecargar al usuario | P0 | EP-07 |
| `FS-028` | Diseñar cuestionario de weekly check-in | especificar orden, inputs y tono del check-in | P0 | EP-08 |
| `FS-029` | Definir payload del weekly check-in | alinear UX y persistencia del check-in | P0 | EP-08 |
| `FS-032` | Diseñar pantalla de decision del coach | definir jerarquia visual de decision, razon y diff | P0 | EP-09 |
| `FS-033` | Definir formato de diff semanal | hacer legible que cambia respecto a la semana previa | P0 | EP-09 |
| `FS-036` | Definir dashboard MVP del loop semanal | hacer visible funnel y calidad del loop | P0 | EP-10 |
| `FS-037` | Definir checklist QA por surface critica | cerrar cobertura funcional, edge y safety antes de release | P0 | EP-10 |

## 8. Asignacion sugerida para los primeros 3 cycles

### Cycle 1: Foundations Freeze

Entrar solo con:

- FS-001
- FS-002
- FS-003
- FS-005
- FS-006
- FS-007
- FS-010
- FS-014

Salida esperada:

- scope MVP congelado
- release gates aprobados
- data model MVP listo
- payload contract listo
- analytics taxonomy lista
- reglas base de decision definidas
- safety triggers definidos

### Cycle 2: UX + Contracts

Entrar con:

- FS-004
- FS-011
- FS-012
- FS-015
- FS-017
- FS-018
- FS-021
- FS-025
- FS-026
- FS-028
- FS-029
- FS-032
- FS-033

Salida esperada:

- surfaces MVP definidas pantalla por pantalla
- copy y vocabulario coherentes
- UX de safety resuelta
- plan inicial especificado
- check-in y decision screen listos para build

### Cycle 3: MVP Build Start

Entrar con:

- FS-036
- FS-037
- las primeras historias de implementacion que nazcan de EP-05 a EP-09

Regla:

- no arrancar build completo si FS-006, FS-010, FS-014, FS-018, FS-021, FS-028 y FS-032 no estan en `Done`

Salida esperada:

- primer corte vertical implementable sin ambiguedad
- medicion core decidida antes de release
- QA/UAT ya especificado antes de codigo

## 9. Reglas para escribir issues bien

Cada issue debe responder 7 preguntas sin obligar a abrir Slack o reinterpretar strategy docs:

1. Que problema concreto resuelve.
2. Que resultado deja listo.
3. Que entra y que no entra.
4. Que dependencia tiene.
5. Que surface afecta.
6. Como se valida terminado.
7. Que doc del repo lo fundamenta.

### Template recomendado

```md
# Titulo

## Contexto
Que parte del Weekly Adaptive Coach habilita y por que importa ahora.

## Problema
Que ambiguedad, riesgo o hueco operativo elimina.

## Resultado esperado
Que debe quedar listo y utilizable al cerrar el issue.

## Alcance
- Incluye:
- Excluye:

## Dependencias
-

## Acceptance criteria
- [ ]
- [ ]
- [ ]

## Links
- Doc fuente:
- Epic:
```

### Reglas de redaccion

- Usar titulos concretos, no vagos: `Definir payload del weekly check-in` mejor que `Trabajar check-in`.
- Separar discovery de build. Si mezcla ambos, crear 2 issues.
- Si afecta safety o decisioning, incluir fallback esperado.
- No meter en un mismo issue copy, UX, backend y analytics si no comparten un entregable verificable unico.

## 10. Reglas para linkear docs y mantener repo + Linear sincronizados

### Linkeo minimo obligatorio

Cada epic debe linkear al menos uno de estos documentos:

- `docs/strategy/WEEKLY_ADAPTIVE_COACH_BLUEPRINT.md`
- `docs/strategy/WEEKLY_ADAPTIVE_COACH_MVP_PRD.md`
- `docs/strategy/EXECUTION_BACKLOG_V1_LINEAR.md`
- `docs/strategy/LINEAR_INITIAL_LOAD_PLAN.md`
- `docs/strategy/WEEKLY_ADAPTIVE_COACH_MVP_UX_CHECKLIST.md`

Cada issue debe linkear:

- 1 doc fuente principal
- 1 epic
- si aplica, issue bloqueante o dependency issue

### Regla repo -> Linear

- Si cambia scope, UX canonica, decision rules, safety o KPI, primero se actualiza markdown en repo y luego se ajusta Linear.

### Regla Linear -> repo

- Si un issue termina con una decision relevante que cambia fuente de verdad, no se cierra como `Done` hasta que el markdown correspondiente quede actualizado.

### Regla de sincronizacion semanal

- Cada viernes cerrar 15 minutos para revisar desalineaciones entre docs y backlog.
- Si un doc ya no refleja lo que se esta ejecutando, corregir el doc ese mismo dia.

## 11. Cadencia semanal usando Linear

### Lunes: commitment

- revisar cycle activo
- mover solo issues realmente listas a `In Progress`
- confirmar owners y bloqueos
- congelar cambios de prioridad salvo incidente real

### Miercoles: dependency review

- revisar issues en `Blocked`
- revisar si algun `P0` no deberia seguir abierto
- actualizar links y decision notes si hubo cambios de criterio

### Viernes: demo + backlog hygiene

- cerrar issues realmente terminadas
- revisar que `Done` tenga doc y acceptance criteria cerrados
- preparar siguientes issues para `Ready`
- detectar scope creep o surface creep

### Cadencia fija recomendada

| Reunion | Duracion | Participantes | Salida |
| --- | --- | --- | --- |
| Weekly planning | 30 min | Product + App + Intelligence | cycle realista y owners claros |
| Mid-week unblock | 20 min | leads | dependencias removidas |
| Weekly product review | 30 min | founder/PM + leads | decisiones y cambios de foco |
| Weekly backlog grooming | 30 min | PM + tech lead | siguiente batch en `Ready` |

## 12. First hour in Linear checklist

Usar esta secuencia exacta:

- [ ] Crear workspace `FitSculpt` si aun no existe.
- [ ] Crear teams `Product`, `App`, `Intelligence`.
- [ ] Crear projects `Phase 0 - Foundations`, `Phase 1 - Weekly Adaptive Coach MVP`, `Phase 2 - Decision Quality & Trust`.
- [ ] Crear initiatives `Launch the Weekly Adaptive Coach MVP`, `Trustworthy Decisioning`, `Weekly Loop Analytics Backbone`.
- [ ] Crear workflow con `Backlog`, `Ready`, `In Progress`, `In Review`, `Blocked`, `Done`.
- [ ] Crear labels de area, fase, tipo, surface, riesgo y madurez.
- [ ] Crear cycles `C1 - Foundations Freeze`, `C2 - UX + Contracts`, `C3 - MVP Build Start`.
- [ ] Crear epics `EP-01` a `EP-10`.
- [ ] Cargar el primer batch de issues `FS-001` a `FS-037` segun la tabla de este documento, no el backlog completo.
- [ ] Linkear cada epic a su doc fuente en `docs/strategy/`.
- [ ] Asignar `Cycle 1` solo a los 8 issues fundacionales definidos arriba.
- [ ] Dejar `Cycle 2` solo con issues de UX, contracts y decision explanation.
- [ ] No meter implementacion en `Cycle 1`.
- [ ] Crear vista guardada `P0 Active`, `Blocked`, `Ready Next`, `This Cycle`.
- [ ] Crear primer dashboard o view para seguir `onboarding completion`, `check-in completion` y `adaptation acceptance` aunque el tracking tecnico aun no este implementado.

## 13. Criterio final de exito

La carga inicial en Linear esta bien hecha si al terminar:

- cualquier miembro del equipo entiende el orden real de ejecucion
- no hay que reinterpretar el MVP para entrar a cycle
- los riesgos de safety y data ya son visibles en backlog
- producto, diseno y tech comparten el mismo lenguaje
- el equipo puede empezar implementacion sin abrir una fase nueva de definicion caotica
