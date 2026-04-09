# Execution Backlog v1 para Linear

## 1. Objetivo del documento

Traducir la estrategia del `Weekly Adaptive Coach` en una carga inicial de ejecucion operativa para Linear, de forma que PM + tech lead puedan arrancar planificacion, asignacion y secuenciacion sin redefinir la estructura base.

## 2. Estructura recomendada de Linear

### Workspace

- Workspace principal: `FitSculpt`
- Fuente de verdad estrategica: `docs/strategy/`
- Fuente de verdad de ejecucion: `Linear`

### Teams

| Team | Mandato | Participantes sugeridos |
| --- | --- | --- |
| Product | Priorizacion, definicion, acceptance criteria, release readiness | PM, founder, design lead |
| App | Entrega frontend + backend del producto core | frontend, backend, tech lead |
| Intelligence | Decision engine, AI prompting, analytics, data quality | AI, data, backend |

### Projects recomendados

| Project | Horizonte | Objetivo |
| --- | --- | --- |
| `Phase 0 - Foundations` | Semanas 1-2 | Cerrar PRD, reglas, datos y guardrails del loop semanal |
| `Phase 1 - Weekly Adaptive Coach MVP` | Semanas 3-6 | Construir el loop completo usable: onboarding -> plan -> check-in -> decision |
| `Phase 2 - Decision Quality & Trust` | Semanas 7-8 | Mejorar explicabilidad, observabilidad y manejo de simplificacion/confianza |

### Cycles recomendados

- Cadencia: semanal si el equipo es pequeno y necesita alto control de dependencias.
- Alternativa: quincenal solo si ya existe disciplina de grooming y definicion.
- Recomendacion para este backlog v1: `8 ciclos semanales`.

### Labels recomendados

| Grupo | Labels |
| --- | --- |
| Area | `area/product`, `area/frontend`, `area/backend`, `area/ai`, `area/data`, `area/design`, `area/analytics`, `area/trust-safety` |
| Fase | `phase-0`, `phase-1`, `phase-2` |
| Tipo de trabajo | `type/epic`, `type/story`, `type/task`, `type/spike`, `type/bug` |
| Flujo | `surface/onboarding`, `surface/home`, `surface/check-in`, `surface/decision`, `surface/analytics` |
| Riesgo | `risk/safety`, `risk/dependency`, `risk/scope`, `risk/data-quality` |
| Segmento | `segment/initial` |

### Prioridades recomendadas

| Prioridad | Uso |
| --- | --- |
| P0 | Bloquea el loop core o la salida a usuarios |
| P1 | Necesario para MVP usable, pero no desbloquea todo el build |
| P2 | Mejora importante para calidad, confianza o operacion |
| P3 | Nice-to-have o preparacion futura |

## 3. Epics / initiatives sugeridos para las primeras 2 fases

### Phase 0 - Foundations

| Epic ID | Epic | Objetivo |
| --- | --- | --- |
| EP-01 | Product Definition & MVP Scope Freeze | Cerrar alcance real del MVP y criterios de release |
| EP-02 | Weekly Data Model & Event Taxonomy | Definir entidades, estados y eventos obligatorios |
| EP-03 | Decision Engine Rules & Reason Codes v1 | Congelar logica MVP de `mantener / ajustar / simplificar / redisenar` |
| EP-04 | Trust & Safety Foundations | Definir guardrails, deferencia y fallback conservador |

### Phase 1 - Weekly Adaptive Coach MVP

| Epic ID | Epic | Objetivo |
| --- | --- | --- |
| EP-05 | Coach-Level Onboarding | Capturar contexto suficiente para un plan inicial creible |
| EP-06 | Initial Plan Generation & Explanation | Generar semana 1 con explicacion y supuestos visibles |
| EP-07 | Weekly Home & Logging Minimum Viable | Dar contexto semanal, progreso y captura de senales minimas |
| EP-08 | Weekly Check-in Experience | Implementar check-in obligatorio de 3 a 5 minutos |
| EP-09 | Coach Decision Surface & Plan Diff | Mostrar decision del coach, razon y cambios para la siguiente semana |
| EP-10 | Analytics, QA & MVP Release Readiness | Medir, validar y preparar salida controlada |

## 4. Backlog detallado v1

### EP-01 Product Definition & MVP Scope Freeze

| ID | Titulo | Descripcion | Dependencias | Owner type | Prioridad |
| --- | --- | --- | --- | --- | --- |
| FS-001 | Congelar objetivo, segmento y promesa MVP | Documentar objetivo de producto, target user, non-target y promesa central del loop semanal para evitar scope creep | Ninguna | product | P0 |
| FS-002 | Cerrar alcance in/out del MVP | Listar explicitamente que entra y que no entra en launch wedge, con decisiones por surface | FS-001 | product | P0 |
| FS-003 | Definir exit criteria y release gates MVP | Acordar criterios funcionales, safety y analytics para go/no-go | FS-001, FS-002 | product | P0 |
| FS-004 | Alinear nomenclatura canonica del coach | Fijar uso consistente de onboarding, plan inicial, weekly check-in, decision, simplificar, redisenar, reason codes | FS-001 | product | P1 |

**Acceptance criteria**

- Existe un documento maestro aprobado para objetivo, segmento y scope MVP.
- Todo item P0 del backlog referencia el mismo vocabulario canonico.
- Se define un criterio de release con umbrales minimos de analytics y safety.

### EP-02 Weekly Data Model & Event Taxonomy

| ID | Titulo | Descripcion | Dependencias | Owner type | Prioridad |
| --- | --- | --- | --- | --- | --- |
| FS-005 | Definir entidades MVP del loop semanal | Modelar `user profile`, `initial plan`, `week`, `check-in`, `adaptation`, `decision reason` y estados minimos | FS-002 | backend | P0 |
| FS-006 | Definir contrato de datos entre app y decision engine | Establecer inputs requeridos, outputs esperados y versionado de payloads | FS-005 | backend | P0 |
| FS-007 | Definir taxonomia de eventos analytics | Especificar eventos, propiedades, actor, surface y momento de disparo | FS-005 | data | P0 |
| FS-008 | Diseñar score de adherencia semanal v1 | Traducir completitud de entreno, nutricion y confianza en una senal operativa simple | FS-005 | data | P1 |
| FS-009 | Definir esquema de observabilidad de decisiones | Asegurar que cada recomendacion tenga trazabilidad de decision, reason codes y version de regla | FS-006, FS-007 | data | P1 |

**Acceptance criteria**

- Existe un esquema MVP con entidades, campos requeridos y relaciones.
- El decision engine tiene un contrato versionado de entrada/salida.
- Cada surface core tiene al menos un evento principal y propiedades definidas.

### EP-03 Decision Engine Rules & Reason Codes v1

| ID | Titulo | Descripcion | Dependencias | Owner type | Prioridad |
| --- | --- | --- | --- | --- | --- |
| FS-010 | Definir reglas MVP de decision principal | Especificar umbrales y combinaciones para `mantener`, `ajustar`, `simplificar`, `redisenar` | FS-005, FS-006 | AI | P0 |
| FS-011 | Definir reason codes internos y user-facing | Crear taxonomia breve, legible y reusable para explicar por que se tomo una decision | FS-010 | AI | P0 |
| FS-012 | Definir reglas de cambio por dimension | Traducir cada decision en cambios permitidos sobre entreno, nutricion y carga semanal | FS-010 | AI | P0 |
| FS-013 | Definir manejo de baja confianza e inconsistencia de datos | Especificar fallback conservador cuando faltan datos o hay contradicciones | FS-010 | AI | P1 |

**Acceptance criteria**

- Hay una sola decision principal por check-in.
- Cada decision tiene reglas de activacion, outputs permitidos y limits claros.
- Cada adaptacion puede ser explicada con 1 a 3 reason codes consistentes.

### EP-04 Trust & Safety Foundations

| ID | Titulo | Descripcion | Dependencias | Owner type | Prioridad |
| --- | --- | --- | --- | --- | --- |
| FS-014 | Definir triggers de seguridad y deferencia | Enumerar casos que congelan ajustes agresivos y fuerzan mensaje conservador | FS-002, FS-010 | product | P0 |
| FS-015 | Definir UX de safety y fallback | Acordar copy, CTA y comportamiento cuando el sistema no debe adaptar normalmente | FS-014 | design | P0 |
| FS-016 | Definir politica de datos minimos para decidir | Acordar que informacion es obligatoria, opcional y que hacer cuando falta | FS-006, FS-014 | data | P1 |

**Acceptance criteria**

- Existe una lista aprobada de triggers de riesgo para MVP.
- El sistema tiene comportamiento por defecto seguro cuando faltan datos.
- Los mensajes de seguridad no suenan diagnosticos ni prometen criterio clinico.

### EP-05 Coach-Level Onboarding

| ID | Titulo | Descripcion | Dependencias | Owner type | Prioridad |
| --- | --- | --- | --- | --- | --- |
| FS-017 | Diseñar flujo de onboarding coach-level | Definir pasos, agrupacion de preguntas y progresion para completar contexto sin parecer formulario infinito | FS-001, FS-002 | design | P0 |
| FS-018 | Especificar campos obligatorios del onboarding | Bajar a nivel de campo los datos esenciales de objetivo, contexto, disponibilidad, preferencias y baseline | FS-017, FS-005 | product | P0 |
| FS-019 | Definir validaciones y estados incompletos | Acordar errores, optionalidad, reanudacion y comportamiento ante abandono parcial | FS-018 | frontend | P1 |
| FS-020 | Definir copy de credibilidad y expectativa | Redactar microcopy que explique por que se pregunta cada bloque y que valor recibira el usuario | FS-017 | design | P1 |

**Acceptance criteria**

- El onboarding captura todos los inputs esenciales definidos en estrategia.
- Cada paso tiene objetivo, campos, validaciones y CTA claros.
- El flujo puede terminar en un plan inicial sin requerir integraciones externas.

### EP-06 Initial Plan Generation & Explanation

| ID | Titulo | Descripcion | Dependencias | Owner type | Prioridad |
| --- | --- | --- | --- | --- | --- |
| FS-021 | Definir estructura canonica del plan inicial | Acordar bloques de entreno, nutricion, expectativa semanal y notas de contexto | FS-005, FS-018 | product | P0 |
| FS-022 | Definir logica de generacion de semana 1 | Traducir onboarding a una recomendacion inicial usable por reglas + IA controlada | FS-021, FS-010, FS-012 | AI | P0 |
| FS-023 | Definir pantalla de resumen del plan inicial | Especificar layout, modulos y narrativa de por que este plan encaja con el usuario | FS-021 | design | P1 |
| FS-024 | Definir supuestos y disclaimers visibles | Mostrar limites del plan inicial y cuando se refinara en el primer check-in | FS-023, FS-015 | product | P1 |

**Acceptance criteria**

- El plan inicial tiene componentes obligatorios y formato consistente.
- La explicacion vincula inputs del usuario con decisiones del plan.
- El usuario entiende que la primera semana es una base adaptativa, no un plan fijo cerrado.

### EP-07 Weekly Home & Logging Minimum Viable

| ID | Titulo | Descripcion | Dependencias | Owner type | Prioridad |
| --- | --- | --- | --- | --- | --- |
| FS-025 | Definir home semanal MVP | Especificar objetivo visible de la semana, progreso, CTA a logging y countdown/check-in | FS-021 | design | P0 |
| FS-026 | Definir logging minimo de entreno, nutricion y peso/bienestar | Bajar el minimo de captura necesario para alimentar check-in sin crear friccion excesiva | FS-005, FS-008 | product | P0 |
| FS-027 | Definir reglas de cierre de semana y gating al check-in | Acordar cuando se dispara el check-in obligatorio y como se maneja una semana incompleta | FS-026, FS-010 | backend | P1 |

**Acceptance criteria**

- La home semanal deja claro que el valor vive en cerrar el loop.
- Logging MVP cubre las senales minimas definidas por producto y decisioning.
- La transicion hacia check-in semanal esta especificada y no queda ambigua.

### EP-08 Weekly Check-in Experience

| ID | Titulo | Descripcion | Dependencias | Owner type | Prioridad |
| --- | --- | --- | --- | --- | --- |
| FS-028 | Diseñar cuestionario de weekly check-in | Especificar orden, tipo de input, escalas, opciones y branching minimo | FS-018, FS-026 | design | P0 |
| FS-029 | Definir especificacion de payload del check-in | Traducir preguntas a estructura persistible y compatible con el decision engine | FS-028, FS-006 | backend | P0 |
| FS-030 | Definir copy y friccion objetivo del check-in | Reducir culpa, reforzar accountability y prometer valor inmediato | FS-028 | design | P1 |
| FS-031 | Definir estados de no-respuesta y check-in atrasado | Especificar recordatorios, expiracion y que hacer cuando el usuario no completa a tiempo | FS-027 | product | P1 |

**Acceptance criteria**

- El check-in puede completarse en 3 a 5 minutos.
- Captura adherencia, progreso, energia, hambre, recuperacion, estres, dolor, friccion y confianza.
- Existe comportamiento definido para abandono parcial y atraso.

### EP-09 Coach Decision Surface & Plan Diff

| ID | Titulo | Descripcion | Dependencias | Owner type | Prioridad |
| --- | --- | --- | --- | --- | --- |
| FS-032 | Diseñar pantalla de decision del coach | Definir jerarquia visual para decision principal, explicacion, cambios y CTA de aceptacion | FS-011, FS-028 | design | P0 |
| FS-033 | Definir formato de diff entre semanas | Mostrar con claridad que se mantiene, que cambia y por que | FS-032, FS-012 | frontend | P0 |
| FS-034 | Definir CTA secundarios de aclaracion o simplificacion | Permitir pedir contexto adicional o una version mas facil sin romper el loop | FS-032 | product | P1 |
| FS-035 | Definir historial minimo de adaptaciones | Especificar vista simple de decisiones pasadas para accountability y trazabilidad | FS-032, FS-009 | design | P2 |

**Acceptance criteria**

- La decision principal es visible en menos de un scroll.
- El usuario puede entender que cambio sin comparar manualmente todo el plan.
- La explicacion evita lenguaje generico y se apoya en senales reales de la semana.

### EP-10 Analytics, QA & MVP Release Readiness

| ID | Titulo | Descripcion | Dependencias | Owner type | Prioridad |
| --- | --- | --- | --- | --- | --- |
| FS-036 | Definir dashboard MVP del loop semanal | Acordar funnel de onboarding, plan, check-in, decision y aceptacion | FS-007, FS-032 | data | P0 |
| FS-037 | Definir checklist QA por surface critica | Consolidar casos felices, edge cases, safety y analytics por flujo | FS-015, FS-031, FS-032 | product | P0 |
| FS-038 | Definir plan de alpha cerrada | Acordar cohorte, monitoreo, ritmo de review y criterios de rollback | FS-003, FS-036, FS-037 | product | P1 |
| FS-039 | Definir metricas de go/no-go para beta | Acordar umbrales minimos de completitud, check-in y aceptacion de adaptacion | FS-036, FS-038 | data | P1 |

**Acceptance criteria**

- El equipo puede medir el loop end-to-end en entorno real.
- Hay checklist de QA con coverage funcional, safety y analytics.
- Existe una salida controlada definida antes de ampliar distribucion.

## 5. Secuencia sugerida de ejecucion de 6-8 semanas

| Semana | Foco | Entregable esperado |
| --- | --- | --- |
| 1 | Scope freeze + criterios de release | EP-01 cerrado, prioridades y lenguaje canonico aprobados |
| 2 | Modelo de datos + eventos + reglas base | EP-02 y EP-03 listos para handoff a build |
| 3 | Guardrails + onboarding spec + plan inicial spec | EP-04 y EP-05 cerrados, EP-06 definido |
| 4 | Weekly home + logging + check-in spec | EP-07 y EP-08 cerrados para implementacion |
| 5 | Decision surface + diff + copy final | EP-09 definido con acceptance criteria completos |
| 6 | Analytics + QA + alpha readiness | EP-10 listo, dependencias de release visibles |
| 7 | Buffer de integracion / ajustes de dependencia | Cerrar huecos entre app, backend y decisioning |
| 8 | Validacion final de MVP scope | Repriorizar phase 2 y congelar carga inicial de ejecucion posterior |

## 6. Definition of Ready

Una historia o tarea entra a ciclo solo si:

- Tiene problema y resultado esperado claramente definidos.
- Tiene owner type primario.
- Tiene dependencias declaradas.
- Tiene acceptance criteria verificables.
- Tiene links a doc estrategico o PRD relevante.
- No mezcla discovery abierta con build comprometido en el mismo item.
- Si afecta decisioning o safety, incluye impacto esperado y fallback.

## 7. Definition of Done

Una historia o tarea se considera terminada solo si:

- El entregable documentado esta actualizado.
- Acceptance criteria cumplidos y verificables.
- Dependencias posteriores desbloqueadas o explicitamente anotadas.
- Eventos analytics requeridos definidos o validados si aplica.
- Casos edge y safety relevantes cubiertos si aplica.
- PM + tech lead pueden usar el output para planificar sin reinterpretar el objetivo.

## 8. Template recomendado de issue

```md
# [ID] Titulo

## Tipo
Story | Task | Spike | Bug

## Contexto
Que parte del Weekly Adaptive Coach habilita y por que importa ahora.

## Problema
Que problema operativo, de producto o de riesgo resuelve.

## Resultado esperado
Que debe quedar listo al cerrar este issue.

## Alcance
- Incluye:
- Excluye:

## Dependencias
-

## Owner type
product | frontend | backend | AI | data | design

## Prioridad
P0 | P1 | P2 | P3

## Acceptance criteria
- [ ]
- [ ]
- [ ]

## Riesgos / notas
-

## Links
- Doc fuente:
- Epic:
```

## 9. Registro inicial de blockers / unknowns

| ID | Bloqueo / unknown | Impacto | Owner sugerido | Mitigacion inicial |
| --- | --- | --- | --- | --- |
| BU-01 | Aun no esta cerrado el umbral exacto entre `ajustar` y `simplificar` | Riesgo de recomendaciones inconsistentes | AI + product | Arrancar con reglas conservadoras y revisar con datos de alpha |
| BU-02 | No esta definido el minimo logging obligatorio para que el motor sea util | Puede romper UX o dejar al motor ciego | product + data | Congelar logging MVP y tratar inputs avanzados como opcionales |
| BU-03 | Falta decidir cuanta autonomia tiene el usuario para rechazar una adaptacion | Impacta UX, plan state y analytics | product | Iniciar con aceptar + pedir simplificacion + pedir contexto |
| BU-04 | No esta definida la estrategia exacta de plan inicial reglas vs IA | Puede afectar velocidad, costo y consistencia | AI + backend | Empezar con estructura deterministicamente gobernada y texto asistido |
| BU-05 | Falta decision sobre pesaje obligatorio vs opcional | Afecta progres tracking y adherencia | product | Tratar peso como opcional con alternativa de progreso percibido |
| BU-06 | No esta cerrada la politica de recordatorios del check-in | Riesgo de baja completitud del loop | product + frontend | Definir un esquema basico antes de build de notificaciones |
| BU-07 | No existe aun definicion final de observabilidad para quality review de decisiones | Riesgo de baja capacidad de debugging | data | Exigir decision log minimo por adaptacion |

## 10. Carga inicial recomendada en Linear

### Checklist de creacion inicial

- [ ] Crear teams `Product`, `App` e `Intelligence`.
- [ ] Crear projects `Phase 0 - Foundations`, `Phase 1 - Weekly Adaptive Coach MVP` y `Phase 2 - Decision Quality & Trust`.
- [ ] Crear labels por area, fase, tipo, surface y riesgo.
- [ ] Crear los 10 epics `EP-01` a `EP-10`.
- [ ] Cargar stories `FS-001` a `FS-039` con sus dependencias.
- [ ] Configurar 8 ciclos semanales para el primer tramo de ejecucion.
- [ ] Marcar como P0 todos los items que bloquean loop core, safety o analytics.
- [ ] Linkear cada epic al doc estrategico correspondiente en `docs/strategy/`.
- [ ] Crear un dashboard de seguimiento con foco en `onboarding completion`, `weekly check-in completion` y `adaptation acceptance`.
- [ ] Agendar grooming semanal y review quincenal de dependencias cruzadas.
