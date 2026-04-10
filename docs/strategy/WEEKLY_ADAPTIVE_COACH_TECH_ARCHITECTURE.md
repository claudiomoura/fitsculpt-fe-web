# Weekly Adaptive Coach Tech Architecture

## 1. Objetivo del documento

Este documento baja el `Weekly Adaptive Coach MVP` a una arquitectura tecnica implementable para que producto, app, backend, data e intelligence puedan construir el loop core con el menor nivel posible de ambiguedad.

Scope del documento:

- onboarding tipo coach
- generacion de plan inicial de semana 1
- ejecucion semanal minima viable
- weekly check-in obligatorio
- decision visible y explicable de `mantener`, `ajustar`, `simplificar` o `redisenar`
- trazabilidad, safety, analytics y rollout controlado

Regla base:

- MVP primero, sofisticacion despues
- reglas deterministicas antes que automatizacion opaca
- una arquitectura que permita auditar cada decision antes de intentar optimizarla con IA o modelos mas avanzados

## 2. Scope y objetivos arquitectonicos

### Scope MVP

Entra en esta arquitectura:

- captura de perfil inicial suficiente para decidir una primera semana creible
- persistencia de plan, semana, check-in y adaptacion por usuario
- motor de decision rules-first con reason codes visibles
- capa de explicacion legible para producto y usuario
- observabilidad, auditabilidad y feature flags del loop completo

No entra en esta arquitectura MVP:

- wearables o health integrations
- decisioning diario o intra-semana
- modelos predictivos entrenados sobre cohortes historicas
- chat abierto tipo coach 24/7
- automatizacion clinica o medica

### Objetivos arquitectonicos

1. `Credibilidad inicial.` El sistema debe generar un plan inicial consistente con inputs reales del usuario y con supuestos visibles.
2. `Determinismo auditable.` Cada adaptacion debe poder reconstruirse a partir de inputs, reglas, version de motor y reason codes.
3. `Explicabilidad nativa.` La explicacion no es post-procesado cosmetico; debe nacer del mismo pipeline de decision.
4. `Safety primero.` El sistema debe poder frenar, simplificar o derivar antes de optimizar rendimiento.
5. `MVP desacoplado.` Frontend, backend app, decision engine y analytics deben integrarse con contratos simples y versionados.
6. `Preparado para evolucion.` La arquitectura debe permitir agregar IA asistida y score de confianza sin reescribir entidades core.

## 3. Contexto de sistema de alto nivel

### Vista general

| Capa | Responsabilidad MVP | Resultado esperado |
| --- | --- | --- |
| Frontend app | onboarding, home semanal, logging, check-in, decision surface, history minima | capturar datos y hacer visible el valor del coach |
| Backend app/API | autenticacion, persistencia, estado del loop semanal, orquestacion de requests | fuente operacional del estado del usuario |
| Decisioning service | generar plan inicial, evaluar check-in, emitir adaptacion y explicacion estructurada | recomendacion deterministica y trazable |
| Data store operacional | guardar perfil, planes, semanas, check-ins, adaptaciones, audit logs | integridad de datos del loop |
| Analytics pipeline | eventos de producto, calidad del loop, aceptacion de decisiones, embudo | medicion end-to-end y release controlado |
| Admin/ops visibility | inspeccion de decisiones, fallbacks, safety triggers y rule versions | soporte de alpha cerrada y QA |

### Diagrama conceptual

```text
Usuario
  -> Frontend App
    -> Backend App/API
      -> Operational DB
      -> Decisioning Service
        -> Rules Engine
        -> Explanation Builder
        -> Safety Guardrails
        -> Optional AI Assist Layer
      -> Event Publisher
        -> Analytics Store / BI
        -> Audit Log Store
```

### Responsabilidades por macro-componente

#### Frontend

- captura inputs con validaciones UX
- muestra estado de semana actual y CTA al siguiente paso
- renderiza diff de cambios y explicacion corta
- no decide reglas ni calcula reason codes de negocio

#### Backend app

- consolida identidad, estado y permisos
- expone endpoints canonicos del loop semanal
- materializa semanas y transitions de estado
- aplica feature flags y gating de rollout
- registra eventos y logs estructurados

#### Decisioning

- recibe payload versionado
- normaliza inputs y calcula features derivadas MVP
- evalua safety antes que performance
- emite una sola decision principal
- devuelve plan adaptado, reason codes, confidence band y diff estructurado

#### Data y analytics

- almacenan el source of truth operacional del loop
- separan eventos analytics de audit logs para no mezclar objetivos
- permiten mirar tanto conversion como calidad de decision

## 4. Limites recomendados de servicios y modulos

### Recomendacion MVP

Para el MVP, conviene un `modular monolith` o backend unico con modulos claramente separados, no microservicios independientes. El unico boundary que vale la pena mantener desde el dia 1 es el `decisioning module/service` como contrato explicito, aunque tecnicamente viva dentro del mismo deploy.

### Boundaries sugeridos

| Modulo / servicio | Responsabilidad | No debe hacer |
| --- | --- | --- |
| `profile` | onboarding profile, preferencias, baseline, versionado de perfil | decidir adaptaciones |
| `planning` | crear y persistir plan inicial y snapshots semanales | evaluar safety complejo por si solo |
| `weekly-cycle` | semana activa, logging, estado del check-in, transiciones | generar copy final de decision |
| `decisioning` | reglas, safety, adaptation result, reason codes, diff | renderizar UI o depender del frontend |
| `explanations` | transformar resultado estructurado en mensajes visibles por surface | cambiar la decision principal |
| `analytics` | publicacion de eventos de producto y decision quality | ser sistema transaccional |
| `audit` | almacenar inputs, versiones, outputs y trazas de decision | mezclar datos anonimos y PII sin control |
| `feature-flags` | habilitar surfaces, cohorts y engine versions | contener logica de negocio |

### API / contratos entre modulos

1. `Frontend <-> Backend`: contratos orientados a producto y estado de pantalla.
2. `Backend <-> Decisioning`: contratos versionados orientados a dominio, no a UI.
3. `Backend <-> Analytics`: eventos append-only.
4. `Backend/Decisioning <-> Audit`: writes estructurados por decision.

## 5. Modelo de dominio propuesto

### Entidades core

| Entidad | Rol en el sistema | Notas MVP |
| --- | --- | --- |
| `UserProfile` | perfil base del usuario para coaching | snapshot vivo + versionado ligero |
| `OnboardingProfileSnapshot` | foto exacta de inputs usados para crear el plan inicial | evita reescritura historica |
| `PlanTemplate` | estructura del plan recomendado para una semana | entreno, nutricion, notas y supuestos |
| `PlanWeek` | instancia de una semana concreta asociada a un usuario | contiene estado y relation a adaptacion previa |
| `WeeklyLogSummary` | resumen ligero de ejecucion durante la semana | no requiere logging granular complejo |
| `WeeklyCheckIn` | input estructurado del cierre semanal | fuente principal de decisioning |
| `AdaptationDecision` | output canonico del motor para una semana | decision, reasons, confidence, diff |
| `DecisionReason` | reason code estructurado interno/user-facing | 1 a 3 reasons visibles |
| `SafetySignal` | senales de riesgo declaradas o inferidas | dispara fallback o deferencia |
| `EngineVersion` | version de reglas/prompts/config usada | clave para auditabilidad |
| `AnalyticsEvent` | evento de embudo o comportamiento | no sustituye audit log |
| `DecisionAuditRecord` | traza completa de entrada, reglas y salida | soporte de QA, debugging y confianza |

### Relaciones principales

1. Un `UserProfile` puede tener multiples `PlanWeek`.
2. Cada `PlanWeek` puede tener cero o un `WeeklyCheckIn`.
3. Cada `WeeklyCheckIn` puede producir cero o una `AdaptationDecision`.
4. Cada `AdaptationDecision` referencia una `EngineVersion`, una lista de `DecisionReason` y opcionalmente `SafetySignal`.
5. Cada nueva semana debe poder referenciar la adaptacion que la origino.

### Principio de modelado

Nunca mutar silenciosamente el pasado. El usuario puede cambiar su perfil, pero cada decision relevante debe guardar el snapshot exacto del contexto usado en ese momento.

## 6. Flujo de datos sugerido

### 6.1 Onboarding -> perfil -> plan inicial

1. Frontend captura onboarding por pasos.
2. Backend valida y guarda borrador parcial.
3. Al completar minimos requeridos, backend construye `OnboardingProfileSnapshot v1`.
4. Backend invoca decisioning con payload `initial_plan_request`.
5. Decisioning aplica safety baseline y reglas de generacion de semana 1.
6. Si aplica, capa AI asistida ayuda a redactar explicacion o seleccionar variantes dentro de limites permitidos.
7. Backend persiste `PlanWeek` inicial + `DecisionAuditRecord`.
8. Frontend muestra plan inicial, supuestos y expectativa de refinamiento en el primer check-in.

### 6.2 Semana activa -> logging minimo -> cierre

1. Usuario ejecuta semana y registra senales minimas.
2. Backend agrega esos datos en `WeeklyLogSummary`.
3. Scheduler o backend habilita estado `check_in_due` al cierre de la semana.
4. Frontend bloquea la narrativa de adaptacion completa hasta completar check-in.

### 6.3 Weekly check-in -> adaptacion

1. Usuario envia `WeeklyCheckIn`.
2. Backend valida completitud y consistencia minima.
3. Backend arma `adaptation_decision_request` con:
   - snapshot del perfil relevante
   - semana previa y plan actual
   - resumen de logging
   - check-in actual
   - contexto extraordinario declarado
4. Decisioning normaliza inputs y calcula features derivadas.
5. Safety guardrails corren primero.
6. Rules engine selecciona una sola decision principal.
7. Rules engine determina cambios permitidos de entreno y nutricion.
8. Explanation builder arma reason codes, confidence band, resumen y diff estructurado.
9. Backend persiste `AdaptationDecision`, nueva `PlanWeek` y `DecisionAuditRecord`.
10. Frontend muestra la decision y el usuario acepta o pide ajuste secundario.

### 6.4 Analytics

1. Cada paso relevante del funnel emite `analytics events`.
2. Cada decision emite tambien `decision quality events` con rule version, reason codes y confidence band.
3. Audit records se almacenan aparte para trazabilidad profunda.

## 7. Arquitectura del decision engine

## 7.1 Principio MVP

`Rules-first, AI-assisted, never AI-unbounded.`

El MVP no debe depender de un LLM para elegir la decision principal. La decision principal y los cambios permitidos deben salir de reglas deterministicas versionadas. La IA entra solo en espacios controlados donde agrega valor sin romper auditabilidad.

### Pipeline recomendado

| Etapa | Tipo | Salida |
| --- | --- | --- |
| Input normalization | deterministic | payload limpio y consistente |
| Derived features | deterministic | adherence ratios, stress band, recovery band, data completeness |
| Safety screening | deterministic | allow / constrain / defer |
| Decision classification | deterministic | mantener / ajustar / simplificar / redisenar |
| Change selection | deterministic with bounded templates | cambios permitidos por dimension |
| Explanation assembly | deterministic + optional AI rewrite | reason codes, human summary, expected impact |

### Policy v1 de clasificacion

El clasificador MVP debe seguir este orden exacto y detenerse en la primera salida valida:

1. evaluar `safety_outcome`
2. evaluar `structural_mismatch`
3. evaluar `simplify_threshold_met`
4. evaluar `maintain_threshold_met`
5. caer en `adjust`

Derived features minimas recomendadas:

- `training_adherence_ratio`
- `nutrition_adherence_score`
- `energy_score`
- `recovery_score`
- `stress_score`
- `next_week_confidence_score`
- `strain_signal_count`
- `structural_mismatch`
- `data_completeness_band`
- `signals_conflict_flag`

Definiciones v1:

- `simplify_threshold_met = true` si `training_adherence_ratio < 0.60` o `next_week_confidence_score <= 2` o `strain_signal_count >= 2` con friccion principal de tiempo, estres, fatiga o saturacion.
- `maintain_threshold_met = true` si `training_adherence_ratio >= 0.80`, `nutrition_adherence_score >= 4`, `energy_score >= 3`, `recovery_score >= 3`, `stress_score <= 3`, `next_week_confidence_score >= 3` y no existe `structural_mismatch`.
- `adjust` es el bucket residual conservador para semanas con ejecucion razonable (`training_adherence_ratio >= 0.60`, `next_week_confidence_score >= 3`) que no califican para `maintain` y tampoco necesitan `simplify` o `redesign`.

Guardrails de implementacion:

- `adjust` nunca debe implicar mas agresividad neta que la evidencia semanal permite.
- `simplify` gana sobre `adjust` cuando ambos candidatos aparecen y la semana siguiente se ve fragil para ejecutar.
- `redesign` solo debe disparar por mismatch estructural, no por una mala semana aislada.
- `safety_outcome = deferred` nunca puede terminar en `maintain` y debe limitar cambios a versiones prudentes de `simplify` o `redesign`.

### Donde entra IA en MVP

IA puede entrar en tres puntos, siempre bajo guardrails:

1. `Redaccion controlada.` Convertir reason codes estructurados en copy mas natural.
2. `Variantes de plan dentro de limites.` Elegir entre plantillas permitidas por el rules engine.
3. `Resumen interno para ops.` Sintetizar explicacion mas larga para dashboard interno.

IA no debe:

- inventar decisiones fuera de las cuatro salidas canonicas
- saltarse safety triggers
- modificar thresholds sin versionado explicito
- producir recomendaciones clinicas

### Modelo de explicabilidad

Cada `AdaptationDecision` debe incluir:

- `primary_decision`
- `reason_codes_internal`
- `reason_codes_user_facing`
- `evidence_summary`
- `changes_applied`
- `changes_not_applied_due_to_safety_or_scope`
- `confidence_band` (`high`, `medium`, `low`)
- `engine_version`

### Taxonomia minima de reasons

| Categoria | Ejemplos |
| --- | --- |
| adherence | `low_training_adherence`, `strong_nutrition_adherence` |
| recovery | `high_fatigue`, `poor_sleep_recovery` |
| context | `time_constraint`, `travel_or_disruption` |
| progress | `progress_on_track`, `progress_unclear` |
| safety | `pain_flag`, `new_limitation_declared` |
| confidence | `low_next_week_confidence`, `data_incomplete` |

### Reason codes v1 por decision

| Decision principal | Reason codes internos tipicos | Traduccion visible sugerida |
| --- | --- | --- |
| `maintain` | `progress_on_track`, `strong_nutrition_adherence`, `stable_recovery` | `Tu semana fue suficientemente sostenible para repetir la estructura actual.` |
| `adjust` | `progress_unclear`, `adherence_friction`, `high_hunger`, `poor_sleep_recovery` | `Hay una senal concreta para corregir, sin cambiar todo el plan.` |
| `simplify` | `low_training_adherence`, `time_constraint`, `high_stress`, `low_next_week_confidence` | `La prioridad es recuperar cumplimiento con una semana mas facil de ejecutar.` |
| `redesign` | `new_limitation_declared`, `travel_or_disruption`, `schedule_mismatch`, `pain_flag` | `Tu contexto actual cambio lo suficiente como para replantear la semana.` |

Reglas de uso:

- cada decision debe persistir `1` reason code principal y hasta `3` reason codes de soporte
- los `reason_codes_internal` deben ser estables y aptos para audit y analytics
- los `reason_codes_user_facing` deben derivarse del set interno y nunca contradecirlo
- si hay `safety_outcome = deferred`, al menos un reason code debe ser de categoria `safety` o `confidence`

## 8. Arquitectura de trust y safety

### Capas de safety

1. `Input safety.` Validar que el usuario no esta reportando algo incompatible con adaptacion normal.
2. `Decision safety.` Frenar progresiones o agresividad cuando hay riesgo o incertidumbre alta.
3. `Output safety.` Mensajes claros de limite, no diagnostico y sugerencia de buscar soporte profesional si corresponde.
4. `Operational safety.` Flags, rollout gradual y observabilidad de cohortes iniciales.

### Triggers MVP de seguridad

- dolor `problematico`
- lesion nueva declarada
- enfermedad o malestar fuerte declarado
- mareo, desmayo o sintomas de alarma si se incorporan como opcion de formulario
- combinacion de fatiga alta + recuperacion muy baja + confianza muy baja
- datos severamente incompletos o contradictorios para decidir con criterio

### Respuestas de safety

| Trigger | Respuesta MVP |
| --- | --- |
| dolor problematico | congelar progresiones, reducir demanda, mostrar nota de seguridad |
| nueva limitacion | redisenar conservador o derivar a revisitar contexto |
| datos incompletos | mantener o ajustar minimo con `low confidence` visible internamente |
| senales contradictorias | salida conservadora y flag de revision |

Regla de precedencia de safety:

- Safety no crea una quinta decision, pero si restringe el espacio de salida.
- Si hay riesgo fisico, el motor no puede elegir `maintain` ni `adjust` aunque la adherencia previa haya sido buena.
- Si solo hay baja confianza o datos incompletos sin riesgo fisico, el motor debe caer a `maintain` o `adjust` minimo; no a `simplify` o `redesign` por incertidumbre sola.

### Politica de deferencia

Cuando el motor no puede adaptar normalmente sin elevar riesgo, debe marcar `safety_outcome = deferred` y ejecutar una sola de estas salidas:

| Caso | Accion del sistema | Efecto sobre el plan |
| --- | --- | --- |
| riesgo fisico declarado o inferido | frenar progresiones y pedir revisar contexto o buscar soporte profesional | no aumentar carga ni complejidad |
| inconsistencia fuerte de datos | devolver guidance conservadora y pedir completar datos faltantes | mantener estructura base o ajuste minimo |
| baja confianza extrema para la semana siguiente | priorizar simplificacion o mantener con nota de prudencia | evitar cambios agresivos |

Reglas de implementacion:

- `deferred` no significa error tecnico; significa decision conservadora deliberada
- el backend debe persistir `triggered_signals`, `fallback_used` y la razon textual de deferencia para QA
- ninguna salida `deferred` puede introducir progresiones, volumen extra o recomendaciones que parezcan diagnostico
- cuando haya empate entre salidas validas, persistir tambien la `decision_rule_path` aplicada para poder reconstruir por que gano la opcion mas conservadora

### Regla de producto

El motor puede ser menos agresivo de lo ideal, pero nunca mas agresivo de lo que la evidencia semanal permite.

## 9. Auditabilidad y trazabilidad

### Requisitos obligatorios

Cada plan inicial y cada adaptacion semanal deben dejar una traza completa con:

- `user_id`
- `plan_week_id`
- `request_payload_version`
- `engine_version`
- `ruleset_version`
- `feature_flag_snapshot`
- `input_snapshot_reference`
- `derived_features_snapshot`
- `safety_evaluation_result`
- `decision_output`
- `reason_codes`
- `diff_summary`
- `created_at`

### Por que importa

- debugging de recomendaciones raras
- QA de alpha cerrada
- comparacion de versiones del motor
- soporte a reclamaciones de usuarios
- analisis futuro de calidad de decision

### Politica recomendada

- el audit log debe ser append-only
- no sobreescribir decision outputs historicos
- si una decision se recalcula por bugfix, guardar nueva revision, no reemplazar silenciosamente la anterior

## 10. Estrategia de feature flags y rollout

### Flags recomendadas

| Flag | Uso |
| --- | --- |
| `weekly_coach_onboarding_v1` | habilitar onboarding coach-level |
| `initial_plan_generation_v1` | habilitar generacion inicial integrada |
| `weekly_check_in_v1` | habilitar check-in obligatorio |
| `decision_surface_v1` | habilitar pantalla visible de decision |
| `decision_engine_ruleset_v1` | seleccionar version de reglas |
| `decision_engine_ai_copy_v1` | habilitar IA solo para copy controlado |
| `adaptation_history_v1` | habilitar historial minimo de adaptaciones |

### Rollout recomendado

1. `Internal dogfood`: equipo interno con inspeccion manual de outputs.
2. `Alpha cerrada`: cohorte pequena y monitoreada, con review semanal de decisiones.
3. `Limited beta`: ampliar usuarios solo si metrics de completitud, aceptacion y safety pasan umbral.
4. `Broader rollout`: cuando existan dashboards de decision quality y rollback simple por flags.

### Reglas de rollback

- cualquier spike de safety flags debe permitir volver a `ruleset` previo
- la capa AI de copy debe poder apagarse sin romper el loop
- si falla decisioning, backend debe caer a fallback conservador y no bloquear completamente el journey

## 11. Dependencias clave e integraciones

### Dependencias internas

- autenticacion y perfil de usuario existente
- infraestructura de persistencia y API del producto
- sistema de feature flags
- pipeline de analytics/event tracking
- capacidad de scheduler o job para cierre semanal y recordatorios

### Integraciones externas opcionales para MVP

- proveedor LLM para copy asistido o variantes de plan controladas
- proveedor de analytics/product analytics
- sistema de observabilidad/logging centralizado

### Integraciones que deben esperar

- Apple Health / Google Fit / wearables
- nutricion avanzada con bases externas complejas
- CRM/lifecycle automation sofisticado mas alla de recordatorios esenciales

## 12. Riesgos tecnicos mayores y mitigaciones

| Riesgo | Impacto | Mitigacion MVP |
| --- | --- | --- |
| reglas mal calibradas generan recomendaciones poco creibles | baja aceptacion y perdida de confianza | lanzar con thresholds conservadores, QA manual de casos y alpha cerrada |
| mezcla difusa entre datos de producto y audit logs | debugging pobre y baja trazabilidad | separar `analytics events` de `decision audit records` desde el inicio |
| dependencia excesiva en IA para decisiones | opacidad y riesgo de outputs inconsistentes | mantener `decision classification` deterministic-only |
| entidades historicas mutan sin snapshot | imposibilidad de reconstruir decisiones | guardar snapshots de perfil, plan y features por decision |
| check-in con datos incompletos rompe decisioning | errores de runtime o recomendaciones malas | validacion minima + fallback conservador + `confidence_band` |
| frontend acopla demasiada logica de negocio | inconsistencias y deuda de mantenimiento | centralizar reglas y reason codes en backend/decisioning |
| rollout demasiado amplio antes de observabilidad | incidentes de confianza no detectados | alpha cerrada, dashboards y rollback por flags |

## 13. Secuencia sugerida de implementacion

### Fase 0: contratos y foundations

1. cerrar entidades core y estados del loop semanal
2. versionar contratos `app <-> decisioning`
3. congelar ruleset MVP y taxonomia de reason codes
4. definir safety triggers y audit record schema
5. definir taxonomy de analytics

### Fase 1: flujo inicial usable

1. onboarding coach-level
2. persistencia de perfil y snapshot de onboarding
3. generacion de plan inicial + explicacion estructurada
4. home semanal + logging minimo
5. scheduler/check-in gating

### Fase 2: decision visible de adaptacion

1. payload de weekly check-in
2. pipeline de decisioning MVP
3. persistence de adaptacion y creacion de nueva semana
4. decision surface + diff semanal
5. audit logs y dashboards minimos

### Fase 3: rollout controlado y calidad

1. feature flags por cohort
2. alpha cerrada con inspeccion manual
3. ajuste de thresholds y copy
4. activar opcionalmente IA solo para explicacion controlada

## 14. Decisiones tecnicas recomendadas

1. Usar `rules-first decisioning` en MVP; IA solo como capa asistida y acotada.
2. Mantener backend modular con un boundary claro de `decisioning`, sin microservicios prematuros.
3. Persistir snapshots historicos para perfil, plan y features de decision.
4. Tratar explicabilidad como output estructurado del motor, no solo como copy.
5. Separar `analytics`, `operational data` y `audit trails` aunque compartan infraestructura.
6. Desplegar por feature flags y cohorts pequenas antes de abrir distribucion.

## 15. Preguntas abiertas de arquitectura

1. El producto actual ya tiene conceptos de `plan`, `week` o `check-in` reutilizables, o conviene crear entidades aisladas para este wedge?
2. La generacion de plan inicial debe vivir en el mismo modulo exacto que la adaptacion semanal, o conviene separarla como dos pipelines sobre el mismo ruleset?
3. Se necesita una consola interna minima para revisar decisiones en alpha, o alcanza con logs estructurados y BI al inicio?
4. Que mecanismo de feature flags existe hoy y que granularidad permite por cohort/version?
5. Que proveedor de analytics y observabilidad ya esta disponible para no introducir complejidad extra en MVP?
