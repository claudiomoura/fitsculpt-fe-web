# Project Plan FitSculpt Category Leader

## 1. North Star vision

FitSculpt debe convertirse en un producto de coaching de transformacion y salud de clase mundial: una plataforma que no solo prescribe entreno y nutricion, sino que ayuda a las personas a sostener el cambio en el tiempo con decisioning adaptativo, explicable y confiable.

### North Star operacional

"Cada usuario debe sentir que tiene un coach que entiende su semana real, adapta su plan con criterio y le ayuda a cumplir mejor la siguiente semana."

## 2. Principios estrategicos

### Lo que si haremos

- Ganar primero en un wedge estrecho y profundamente valioso.
- Optimizar para adherencia y outcomes, no para cantidad de features.
- Priorizar decisiones explicables sobre automatizacion opaca.
- Construir un sistema de datos orientado al loop semanal.
- Diseñar con seguridad, limites y trazabilidad desde el inicio.
- Convertir cada adaptacion en una experiencia visible de valor.

### Lo que no haremos

- No intentaremos ser una app horizontal para todos los perfiles fitness desde el dia 1.
- No lanzaremos funciones multimodales "vistosas" antes de dominar el loop semanal.
- No sustituiremos criterio de seguridad por prompts genericos.
- No mediremos exito solo por DAU o tiempo en app.
- No agregaremos complejidad de roadmap que no mejore activacion, adherencia o retencion.

## 3. Por que este wedge es la entrada correcta al mercado

El weekly adaptive coach es la mejor entrada porque une tres cosas que el mercado raramente entrega juntas:

1. Credibilidad inicial: el usuario recibe un plan que parece hecho por alguien competente.
2. Adaptacion visible: la app cambia el plan cuando la realidad cambia.
3. Accountability razonable: obliga a revisar, decidir y continuar.

Este wedge ataca la causa real del abandono: no la falta de informacion, sino la incapacidad de sostener ejecucion cuando la vida real rompe el plan. Es suficientemente estrecho para lanzar y suficientemente profundo para construir ventaja defensible en datos, UX, decisioning y confianza.

## 4. Segmento inicial recomendado y expansion

### Segmento inicial

Adultos de 25 a 45 anos que buscan transformacion fisica sostenible y ya intentaron multiples veces sin lograr consistencia.

### Por que este segmento

- Tiene dolor real y recurrente.
- Entiende el valor de un coach, aunque no pueda pagar uno 1:1.
- Genera senal semanal suficiente para el motor adaptativo.
- Tiene mayor disposicion a pagar por resultados visibles y sostenibles.

### Ruta de expansion

| Etapa | Segmento | Motivo de expansion |
| --- | --- | --- |
| Inicial | Transformacion general / perdida de grasa / recomposicion | Mayor TAM util con problema claro y datos manejables |
| Siguiente | Usuarios de vuelta a rutina post abandono | Alta necesidad de simplificacion y coaching de reenganche |
| Luego | Mujeres con necesidad de adaptacion por ciclo y energia | Diferenciacion fuerte si se hace con rigor |
| Luego | Usuarios intermedios orientados a fuerza e hipertrofia | Mayor LTV y profundidad de coaching |
| Futuro | B2B coaches / gyms / employer wellness | Escala via distribucion y capa de coaching asistido |

## 5. Roadmap por fases

### Resumen de fases

| Fase | Enfoque | Resultado esperado |
| --- | --- | --- |
| Phase 0 | Definicion, datos y seguridad | Fundaciones claras del loop semanal |
| Phase 1 | MVP del weekly adaptive coach | Primer loop completo usable por usuarios reales |
| Phase 2 | Personalizacion y confianza | Motor mas preciso, explicable y robusto |
| Phase 3 | Escala, outcomes y expansion | Sistema defensible con mejores resultados y nuevos segmentos |

### Phase 0: Foundations

**Objetivo**

Definir con precision el producto, el esquema de datos, las reglas del motor y los guardrails para que el MVP no sea una demo bonita sino un sistema operable.

**User-visible deliverables**

- narrativa clara de producto
- onboarding definido
- diseño del check-in y decision surfaces

**Backend / data / AI needs**

- modelo de datos del perfil, plan, semana, check-in y adaptacion
- taxonomia de decision reasons
- reglas iniciales de safety y deferencia
- eventos analytics del loop

**Dependencies**

- alineacion fundadores/producto
- definicion del segmento inicial
- criterios de copy y tono del coach

**Exit criteria**

- PRD/blueprint aprobado
- esquema de datos cerrado para MVP
- definicion de KPI baseline
- release criteria de seguridad definidos

### Phase 1: MVP del Weekly Adaptive Coach

**Objetivo**

Lanzar el primer loop cerrado: onboarding profundo -> plan inicial -> ejecucion semanal -> check-in obligatorio -> decision visible -> siguiente semana.

**User-visible deliverables**

- onboarding coach-level
- plan inicial creible con explicacion
- check-in semanal de 3-5 minutos
- decision mantener/ajustar/simplificar/redisenar
- diff simple de cambios

**Backend / data / AI needs**

- generacion de plan inicial por reglas + IA controlada
- score de adherencia semanal
- reglas deterministicas de decision
- reason codes visibles
- trazabilidad de cambios

**Dependencies**

- analitica de eventos end-to-end
- soporte minimo de logging de entreno y nutricion
- estado persistente por semana/usuario

**Exit criteria**

- 70%+ de usuarios activados reciben plan dentro del mismo onboarding
- 50%+ completan primer check-in semanal
- 60%+ aceptan la adaptacion recomendada
- no incidentes relevantes de safety en cohortes iniciales

### Phase 2: Personalizacion y confianza

**Objetivo**

Subir precision, aceptacion y retencion mejorando el motor con mas contexto, reason codes y manejo de incertidumbre.

**User-visible deliverables**

- historial de adaptaciones
- explicaciones mejores y mas especificas
- simplificacion automatica mejorada
- mejor soporte de estres, recuperacion y ciclo

**Backend / data / AI needs**

- feature store semanal
- confidence score / recommendation confidence
- versionado de reglas y experimentos
- soporte de week context events

**Dependencies**

- volumen minimo de datos etiquetados
- panel de observabilidad de decisiones
- taxonomia consistente de rechazo/aceptacion

**Exit criteria**

- mejora material en W4 y W8 retention
- aumento de adaptation acceptance rate
- disminucion de churn despues de malas semanas
- dashboards de decision quality operativos

### Phase 3: Escala y expansion

**Objetivo**

Convertir el producto en una plataforma de coaching defensible con mejores outcomes, integraciones y segmentacion mas profunda.

**User-visible deliverables**

- integraciones de actividad/sueno
- experiencias de progreso y accountability mas ricas
- variantes de coaching por segmento
- loops de reenganche y prevention of relapse

**Backend / data / AI needs**

- integraciones con wearables y health platforms
- experimentacion por cohortes
- modelos mas avanzados de riesgo de abandono y ajuste
- evaluacion continua de outcomes y safety

**Dependencies**

- Phase 1 y 2 estables
- analitica y costo de IA bajo control
- equipo con capacidad de data/ML mas madura

**Exit criteria**

- retencion y adherence superiores a baseline competitivo interno
- cohortes segmentadas con tratamiento diferenciado
- unidad economica inicial razonable
- narrativa fuerte de categoria y evidencia de resultados

## 6. Roadmap de 12 meses por quarter

| Quarter | Meta principal | Entregables clave |
| --- | --- | --- |
| Q1 | Cerrar wedge y lanzar MVP del loop | onboarding coach-level, plan inicial, weekly check-in, decision surface, analytics basicos |
| Q2 | Mejorar precision y confianza | score de adherencia, simplificacion automatica, history of adaptations, observabilidad de decisioning |
| Q3 | Enriquecer contexto y segmentacion | integraciones basicas de actividad/sueno, context events, mejores cohortes y experimentos |
| Q4 | Demostrar outcomes y preparar expansion | panel de impacto, optimizacion de monetizacion, segmentos nuevos, narrativa de categoria sustentada en datos |

## 7. Workstreams priorizados

| Workstream | Prioridad | Mandato |
| --- | --- | --- |
| Product | P0 | Diseñar el loop, decidir UX, controlar foco y criterio de valor |
| AI / Decisioning | P0 | Implementar reglas, explicabilidad y evolucion a mayor precision |
| Data | P0 | Asegurar esquema de datos, eventos y modelos de calidad del loop |
| UX | P0 | Reducir friccion y hacer visible el valor del coach |
| Trust / Safety | P0 | Definir guardrails, deferencia y auditabilidad |
| Analytics | P0 | Medir activacion, adherencia, retencion y calidad de decisiones |
| Integrations | P1 | Traer sueno/actividad cuando el loop core ya funcione |
| Growth | P1 | Posicionar el wedge, mensajes, activacion y monetizacion temprana |

## 8. PM operating system recomendado

### Herramienta recomendada: Linear

Para esta etapa recomiendo **Linear**.

### Por que Linear y no Jira / ClickUp / Notion como sistema principal

| Herramienta | Evaluacion para esta etapa |
| --- | --- |
| Linear | Mejor opcion. Rapida, opinionada, liviana y excelente para un equipo pequeno/medio que necesita foco, velocidad y claridad operativa. |
| Jira | Potente, pero demasiado pesado para esta fase. Riesgo alto de burocracia antes de tener suficiente complejidad organizacional. |
| ClickUp | Flexible, pero suele derivar en exceso de configuracion y procesos inconsistentes. |
| Notion | Buena para docs, mala como sistema operativo principal de delivery. Sirve como conocimiento, no como tracker de ejecucion. |

### Regla operativa recomendada

- `Repo docs` = fuente de verdad para estrategia, arquitectura, decisiones y checklists maestras.
- `Linear` = fuente de verdad para ejecucion semanal, epics, stories, bugs y progreso.

### Estructura sugerida en Linear

**Projects / Epics**

- Weekly Adaptive Coach MVP
- Decision Engine v1
- Onboarding Coach-Level
- Trust & Safety Foundations
- Analytics & KPI Instrumentation
- Adherence and Retention Experiments

**Issue types**

- Epic
- Story
- Task
- Bug
- Spike

**Labels**

- area/product
- area/ai
- area/data
- area/frontend
- area/backend
- area/analytics
- area/trust-safety
- stage/discovery
- stage/build
- stage/qa
- segment/initial

### Decision logs y checklists

- Decision logs: mantenerlos en `docs/decisions/` o `docs/strategy/` con fecha y contexto.
- Checklists maestras: mantenerlas en markdown en el repo.
- Historias de implementacion: vivir en Linear, enlazando el doc relevante del repo.
- Cada epic debe linkear: objetivo, KPI, dependencias, riesgos, exit criteria.

## 9. Cadencia de governance

| Cadencia | Participantes | Objetivo | Salida |
| --- | --- | --- | --- |
| Weekly product review | CEO/PM, design, tech lead | revisar progreso del wedge, decisiones y bloqueos | prioridades de la semana |
| Weekly KPI review | PM, data, growth, tech lead | revisar activacion, adherence, retention y calidad del loop | acciones correctivas |
| Architecture review quincenal | tech lead, backend, frontend, AI/data | validar deuda, interfaces, escalabilidad y safety | decisiones tecnicas y riesgos |
| Backlog grooming semanal | PM + engineering | preparar sprint realista y dependencias | backlog listo para ejecutar |
| Release review | PM + QA + tech lead | verificar release criteria funcionales y de safety | go / no-go |

### Release criteria minimos para features del coach

- tracking analytics completo
- estados vacios y edge cases cubiertos
- reason codes visibles y coherentes
- guardrails de seguridad validados
- rollback o feature flag definido

## 10. KPI framework

| Area | KPI |
| --- | --- |
| Acquisition | CAC, trial starts, source mix, landing-to-signup conversion |
| Activation | onboarding completion, first plan acceptance, time to first value |
| Retention | W1, W4, W8, W12 retention |
| Adherence | workouts completed vs planned, nutrition adherence self-report, consistency score |
| Weekly loop | weekly check-in completion rate, time-to-check-in, recovery of missed check-ins |
| Adaptation quality | adaptation acceptance rate, reject rate, simplify-to-recover rate |
| Outcomes | weight/composition trend vs objective, self-reported energy, confidence improvement |
| Trust | AI trust score, support tickets about bad recommendations, safety escalations |
| Monetization | free-to-paid conversion, ARPU, retention by plan, AI cost as % of revenue |

### KPI principal sugerido

**WCAA: Weekly Check-in Adaptation Acceptance**

Definicion: porcentaje de usuarios activos que completan el check-in semanal y aceptan la recomendacion del coach.

Si WCAA sube de forma saludable junto con retencion, FitSculpt esta entregando valor en su wedge principal.

## 11. Risk register

| Riesgo | Impacto | Probabilidad | Mitigacion |
| --- | --- | --- | --- |
| Sobreconstruir IA antes de validar loop | Alto | Alto | Empezar con reglas + explicabilidad antes de modelos complejos |
| Onboarding demasiado largo | Alto | Medio | Diseñar version esencial y medir drop-off por paso |
| Check-in percibido como friccion | Alto | Medio | Hacerlo corto y devolver valor inmediato tras completarlo |
| Recomendaciones inseguras o absurdas | Muy alto | Medio | Guardrails, deferencia, observabilidad y QA de reason codes |
| Datos insuficientes para personalizar | Medio | Alto | Empezar con minima senal util y ampliar despues |
| Equipo se dispersa en features secundarias | Alto | Alto | Gobernanza estricta basada en wedge y KPI principal |
| Analytics incompletos | Alto | Medio | Instrumentacion como criterio de release, no como extra |
| Coste de IA no sostenible | Medio | Medio | Mezcla de reglas, batching y uso de IA solo donde agregue valor |

## 12. Checklist concreta de las proximas 6 semanas

### Semana 1-2: Definicion ejecutiva y de producto

- [ ] Cerrar definicion exacta del segmento inicial.
- [ ] Aprobar blueprint del Weekly Adaptive Coach.
- [ ] Elegir KPI north star y KPIs de soporte.
- [ ] Cerrar decision de operating system: Linear + docs repo.
- [ ] Nombrar owners por workstream.

### Semana 2-3: Producto y decisioning

- [ ] Definir onboarding esencial campo por campo.
- [ ] Definir check-in semanal pregunta por pregunta.
- [ ] Congelar las 4 decisiones canonicas del motor.
- [ ] Definir reason codes internos y user-facing.
- [ ] Definir estados de safety y deferencia.

### Semana 3-4: Data y arquitectura

- [ ] Diseñar esquema de datos para perfil, plan, semana, check-in y adaptacion.
- [ ] Definir eventos analytics obligatorios.
- [ ] Definir versionado de reglas del motor.
- [ ] Definir surfaces y contratos entre frontend, backend y decisioning.

### Semana 4-5: UX y delivery

- [ ] Diseñar los flujos de onboarding, home semanal, check-in y decision screen.
- [ ] Validar microcopy del coach para claridad y accountability.
- [ ] Crear epics y stories iniciales en Linear.
- [ ] Definir release criteria de MVP.

### Semana 5-6: Preparacion de build

- [ ] Priorizar backlog MVP en orden de dependencia real.
- [ ] Identificar quick wins vs riesgos estructurales.
- [ ] Definir plan de cohortes alpha y beta.
- [ ] Definir dashboards operativos de activacion y weekly loop.
- [ ] Preparar inicio de implementacion con milestones quincenales.

## 13. Appendix: first epics recomendados

| Epic | Objetivo | Salida principal |
| --- | --- | --- |
| Coach-Level Onboarding | Obtener contexto suficiente para un plan creible | perfil estructurado y completo |
| Initial Plan Generation | Generar primera semana util y explicable | plan inicial + rationale |
| Weekly Check-in Engine | Capturar la semana y disparar adaptacion | check-in operativo + score base |
| Decision Surface | Mostrar la recomendacion de forma clara y accionable | pantalla mantener/ajustar/simplificar/redisenar |
| Adaptive Rules v1 | Ejecutar decisiones consistentes y trazables | motor de reglas versionado |
| Trust & Safety Layer | Proteger al usuario y limitar el sistema | guardrails, mensajes y deferencia |
| Analytics & KPI Backbone | Medir la calidad del loop | eventos, dashboards, funnels |
| Adherence Recovery Flows | Recuperar usuarios despues de una mala semana | experiencias de simplificacion y reenganche |

## 14. Decision ejecutiva final

La prioridad de FitSculpt durante los proximos 12 meses no debe ser "hacer mas AI", sino dominar una sola promesa de categoria: **cada semana, el producto entiende tu realidad y mejora tu siguiente semana mejor que un plan estatico**.

Si este loop se vuelve confiable, visible y medible, entonces FitSculpt tendra una base real para convertirse en un producto lider de transformacion y salud. Si este loop no funciona, cualquier capa adicional de AI, vision o integraciones solo aumentara complejidad sin crear una ventaja real.
