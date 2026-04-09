# Weekly Adaptive Coach Implementation Map

## 1. Objetivo del documento

Este documento convierte la estrategia del `Weekly Adaptive Coach MVP` en un mapa de implementacion por modulos y tramos de entrega. Busca responder que construir primero, que depende de que, que puede ir en paralelo y donde conviene cortar scope si el tiempo aprieta.

Principio rector:

- priorizar el loop usable end-to-end antes que optimizaciones locales
- construir primero los contratos y estados que reducen ambiguedad entre equipos
- proteger auditabilidad, safety y rollout desde el inicio, pero sin sobreingenieria

## 2. Supuestos explicitos

1. No se confirma aun la estructura exacta del repo ni si ya existen modulos reutilizables de `profile`, `plan`, `tracking` o `check-in`.
2. La recomendacion asume un backend tipo `modular monolith` con boundaries claros, no microservicios.
3. La app ya tiene al menos autenticacion y alguna infraestructura base de persistencia y analytics.
4. El MVP prioriza reglas deterministicas y surfaces visibles; IA para copy o variantes queda secundaria.

## 3. Modulos / workstreams mayores

### Modulo 1: contratos y modelo del loop semanal

| Campo | Detalle |
| --- | --- |
| Objetivo | Congelar entidades, estados, contratos y versionado para que frontend, backend y decisioning construyan sobre el mismo sistema mental |
| Areas probables afectadas | docs de estrategia, schemas/contracts, modelos de dominio backend, definiciones de eventos, tipos compartidos si existen |
| Dependencias | ninguna dura; desbloquea casi todo lo demas |
| Riesgos | semantica inconsistente entre `plan`, `week`, `adaptation`; required fields inflados; versionado ambiguo |
| Estrategia de test | review cruzada de contratos, ejemplos de payload, validacion de estados y transiciones, casos borde de datos incompletos |
| Rollout notes | no requiere rollout a usuarios; si conviene freeze interno de nomenclatura y ownership |

### Modulo 2: onboarding coach-level y perfil persistido

| Campo | Detalle |
| --- | --- |
| Objetivo | Capturar contexto suficiente para generar una primera semana creible y persistir perfil + snapshot inicial |
| Areas probables afectadas | surfaces de onboarding frontend, validaciones, API/BFF de profile coach, persistencia de `user_profiles` y `onboarding_profile_snapshots` |
| Dependencias | modulo 1 |
| Riesgos | formularios demasiado largos, optionalidad mal definida, conflicto con perfil existente, abandono alto |
| Estrategia de test | pruebas de validacion por paso, resume draft, payload final completo, compatibilidad con usuarios sin peso exacto |
| Rollout notes | habilitar por feature flag de cohort; internal dogfood primero |

### Modulo 3: generacion de plan inicial y explicacion

| Campo | Detalle |
| --- | --- |
| Objetivo | Transformar el onboarding completado en `PlanWeek` inicial con explicacion y supuestos visibles |
| Areas probables afectadas | BFF de cierre de onboarding, modulo `planning`, modulo `decisioning` para `initial_plan`, surface de resumen de semana 1 |
| Dependencias | modulos 1 y 2 |
| Riesgos | plan poco creible, falta de trazabilidad, latencia alta si decisioning bloquea UX, outputs poco explicables |
| Estrategia de test | golden cases por segmento, snapshots de output, validacion de safety baseline, verificacion de audit record y fallback |
| Rollout notes | feature flag independiente de onboarding para permitir apagar solo la generacion automatica si falla |

### Modulo 4: estado semanal, home y logging minimo

| Campo | Detalle |
| --- | --- |
| Objetivo | Hacer visible la semana activa y capturar senales minimas sin introducir tracking excesivo |
| Areas probables afectadas | home semanal frontend, endpoints de `weekly-state`, tracking/logging backend, `weekly_log_summaries`, scheduler/gating |
| Dependencias | modulo 3 para tener semana activa |
| Riesgos | sobrecarga de logging, estado de semana ambiguo, home sin CTA claro hacia check-in |
| Estrategia de test | transiciones `active -> check_in_due`, logs minimos validos, render de home segun estado, datos faltantes tolerados |
| Rollout notes | se puede habilitar aunque decisioning semanal aun no este listo, si se quiere dogfood del estado semanal |

### Modulo 5: weekly check-in y validacion de captura

| Campo | Detalle |
| --- | --- |
| Objetivo | Implementar el formulario de 3-5 minutos, drafts y envio final con payload consistente para decisioning |
| Areas probables afectadas | flow de check-in frontend, contratos de API, persistencia de `weekly_check_ins`, validaciones de negocio, estados de draft/submitted |
| Dependencias | modulos 1 y 4 |
| Riesgos | formularios punitivos, abandono alto, inputs inconsistentes, falta de gating correcto |
| Estrategia de test | happy path, abandono parcial, reanudacion, validaciones condicionales `progress_mode`, `context_change_flag`, data completeness |
| Rollout notes | activar primero en cohort cerrada; bloquear surfaces incompletas por flag |

### Modulo 6: decisioning semanal, safety y explicabilidad estructurada

| Campo | Detalle |
| --- | --- |
| Objetivo | Emitir `mantener`, `ajustar`, `simplificar` o `redisenar` con reason codes, diff y fallback seguro |
| Areas probables afectadas | modulo `decisioning`, ruleset/config, mapeo de features derivadas, modulo `explanations`, taxonomia de reason codes |
| Dependencias | modulos 1, 3 y 5 |
| Riesgos | thresholds pobres, decisiones poco creibles, safety insuficiente, demasiada logica acoplada a frontend |
| Estrategia de test | matriz de casos deterministica, regression suite de rules, casos de safety/deferred, low confidence, entradas contradictorias |
| Rollout notes | mantener apagada cualquier capa AI opcional hasta que rules-first pase dogfood y alpha |

### Modulo 7: persistencia de adaptacion, nueva semana y decision surface

| Campo | Detalle |
| --- | --- |
| Objetivo | Persistir `AdaptationDecision`, crear la siguiente semana y mostrar al usuario la decision con diff claro |
| Areas probables afectadas | backend `adaptation` y `planning`, endpoints BFF de decision, pantalla de decision, diff de cambios, aceptacion de adaptacion |
| Dependencias | modulo 6 |
| Riesgos | duplicacion de semanas por retries, diff confuso, cambio de estado incorrecto, aceptacion mal modelada |
| Estrategia de test | idempotencia de submit/accept, consistencia entre adaptacion y `next_plan_week`, render de diff, one-decision-per-week |
| Rollout notes | debe salir junto con audit basico; sin esta pieza el valor del coach no es visible |

### Modulo 8: audit, analytics y observabilidad

| Campo | Detalle |
| --- | --- |
| Objetivo | Medir el loop y reconstruir decisiones sin mezclar observabilidad de producto con trazabilidad tecnica |
| Areas probables afectadas | publisher de eventos, dashboards, audit store, logs estructurados, feature flags, QA/ops |
| Dependencias | modulos 3, 5, 6 y 7 para eventos reales |
| Riesgos | datos mezclados, falta de contexto para debugging, dashboards tardios, rollout sin visibilidad |
| Estrategia de test | validacion de eventos emitidos por surface, audit completeness, dashboards minimos, alertas o queries para fallbacks y safety |
| Rollout notes | obligatorio antes de alpha ampliada; no hace falta consola compleja si logs y BI alcanzan |

### Modulo 9: rollout controlado y operacion alpha

| Campo | Detalle |
| --- | --- |
| Objetivo | Habilitar internal dogfood, alpha cerrada y rollback rapido por feature flags |
| Areas probables afectadas | feature flags, cohort gating, configuracion de entorno, runbooks de QA/ops, rituales de revision semanal |
| Dependencias | modulos 6, 7 y 8 |
| Riesgos | salir demasiado pronto, no detectar safety issues, imposibilidad de rollback fino |
| Estrategia de test | smoke tests por flag, pruebas de cohortes, simulacion de fallback y apagado del motor/copy AI |
| Rollout notes | empezar con equipo interno, luego alpha pequena y review manual semanal |

## 4. Orden sugerido de implementacion por tranche

### Tranche 0: foundations de contrato

Objetivo:

- cerrar lenguaje canonico, entidades, estados, contracts y event taxonomy

Incluye:

- modulo 1
- definicion inicial de flags y ownership cross-team

Resultado esperado:

- backend y frontend pueden empezar sin reinterpretar el modelo de dominio

### Tranche 1: primer flujo usable hasta semana 1

Objetivo:

- usuario completa onboarding y recibe plan inicial aceptable

Incluye:

- modulo 2
- modulo 3
- baseline de audit para plan inicial

Resultado esperado:

- existe promesa inicial visible de coach, aunque todavia no haya adaptacion semanal

### Tranche 2: semana activa y captura minima

Objetivo:

- usuario puede vivir una semana MVP con home clara, logging simple y gating a check-in

Incluye:

- modulo 4
- modulo 5

Resultado esperado:

- el sistema ya captura las senales necesarias para cerrar el loop

### Tranche 3: adaptacion visible end-to-end

Objetivo:

- cerrar el loop completo con decision, diff y nueva semana activa

Incluye:

- modulo 6
- modulo 7
- audit y analytics minimos del modulo 8

Resultado esperado:

- MVP funcional real del Weekly Adaptive Coach

### Tranche 4: alpha readiness y calidad

Objetivo:

- salir a cohorte cerrada con observabilidad, rollback y criterios de revision

Incluye:

- resto del modulo 8
- modulo 9
- tuning de thresholds, copy y dashboards

Resultado esperado:

- beta interna/alpha cerrada operable sin ceguera

## 5. Que puede construirse en paralelo vs secuencial

### Debe ir secuencial

1. Contratos del loop antes de implementar decisioning y surfaces finales.
2. Onboarding persistido antes de plan inicial automatico.
3. Check-in validado antes de decisioning semanal final.
4. Decisioning antes de la decision surface definitiva y aceptacion de adaptacion.
5. Audit minimo antes de abrir alpha a usuarios externos.

### Puede ir en paralelo con riesgo controlado

1. Diseño UX de onboarding, home, check-in y decision surface una vez congelados inputs y estados.
2. Backend de `weekly-state` y frontend de home semanal usando mocks una vez definido el contrato.
3. Ruleset v1 del motor y taxonomia de reason codes mientras el equipo app construye captura y persistencia.
4. Analytics taxonomy y wiring base mientras se desarrollan surfaces.
5. QA matrix y casos edge mientras se implementan tranches 2 y 3.

### Recomendacion de coordinacion

- producto/diseno cierran shape de surface y required fields
- backend fija contratos y ownership de estados
- intelligence/data construyen casos golden y matriz de reglas sobre esos contratos
- frontend implementa UI sobre payloads estables, no sobre suposiciones de negocio

## 6. MVP cut lines si hay restriccion de tiempo

### Mantener si o si

- onboarding coach-level con campos esenciales
- plan inicial de semana 1 con explicacion breve
- home semanal con CTA al check-in
- logging minimo realmente minimo
- weekly check-in obligatorio de 3-5 minutos
- decision semanal con una sola salida canonica
- diff visible basico entre semanas
- audit log para plan inicial y adaptacion
- analytics core del funnel

### Se puede simplificar

- historial de adaptaciones como lista muy corta o incluso fuera de MVP visible
- feedback/rechazo detallado de adaptacion como evento simple en lugar de flujo completo
- copy AI asistido, dejando explicacion totalmente deterministicamente ensamblada
- scheduler sofisticado, si al principio alcanza con gating simple por fecha/estado
- dashboard avanzado, si al menos existen queries o vistas operables de funnel y safety

### Cortar primero si falta tiempo

- CTA secundario de `hazlo mas facil` con logica extra
- consola interna dedicada para review manual
- variantes avanzadas de diff o visualizaciones ricas
- personalizacion profunda por cohortes
- cualquier integracion externa no esencial

## 7. First engineering milestone

### Definicion

`Un usuario interno puede completar onboarding y obtener una semana 1 persistida, aceptable y auditable.`

### Debe incluir

- contratos y estados base cerrados
- onboarding persistido con snapshot
- endpoint de cierre de onboarding
- generacion de plan inicial rules-first
- vista o payload suficiente para mostrar resumen de semana 1
- audit record del plan inicial

### No necesita aun

- check-in semanal completo
- adaptacion semanal
- historial de adaptaciones
- AI de copy

## 8. Beta-ready milestone

### Definicion

`Una cohorte cerrada puede vivir el loop completo onboarding -> semana activa -> check-in -> decision -> aceptacion de siguiente semana con observabilidad y rollback.`

### Debe incluir

- decisioning semanal v1 con safety y reason codes
- submit de check-in idempotente
- persistencia de `AdaptationDecision` y `next PlanWeek`
- decision surface clara con diff basico
- analytics core end-to-end
- audit trail completo por decision
- feature flags y cohorte controlada
- checklist QA y criterio de rollback

### No necesita aun

- optimizacion de thresholds por cohortes grandes
- experiencia avanzada de rechazo/edicion de plan
- BI sofisticado o consola ops dedicada

## 9. Riesgos principales de secuenciacion

1. Empezar por UI sin cerrar contratos produce retrabajo fuerte en check-in y decision surface.
2. Empezar por IA/copy antes del ruleset ensucia ownership y debugging.
3. Posponer audit hasta el final deja al equipo ciego en alpha.
4. Construir tracking granular demasiado pronto consume tiempo sin mejorar mucho la decision semanal MVP.
5. Mezclar aceptacion de plan y activacion de semana sin estado claro puede romper el loop historico.

## 10. Guia de handoff entre disciplinas

### Product -> Design

- entregar decisiones cerradas sobre campos obligatorios, estados canonicos y criterios de cut line
- no pasar discovery abierta mezclada con UI final para build

### Product -> Backend

- entregar contratos funcionales, reglas de estado y politicas de fallback
- explicitar que es `must-have` vs `phase 2`

### Design -> Frontend

- entregar jerarquia de contenido, estados vacios, errores, safety y loading
- incluir casos de `low confidence`, `deferred` y `check-in incompleto`

### Backend -> Frontend

- entregar payloads estables por surface, ejemplos de respuestas y `error_code` canonicos
- evitar que frontend reconstruya logica de negocio no garantizada por contrato

### Backend -> AI / Intelligence

- entregar payloads de dominio versionados, snapshots y boundaries claros
- ownership del motor sobre decision principal, no sobre experiencia completa de UI

### AI / Intelligence -> Backend

- devolver outputs deterministas y versionados con cases golden y reason codes
- documentar claramente que inputs son obligatorios y como responde ante datos incompletos

### Data / Analytics -> Product y Backend

- entregar taxonomy minima, naming canonico y criterio de dashboards/revision alpha
- asegurar separacion entre eventos de producto y audit trail

### QA / Ops -> Todo el equipo

- mantener matriz de casos felices, edge cases y safety
- revisar semanalmente fallbacks, decisiones raras y eventos faltantes durante alpha

## 11. Recomendacion final de secuencia

1. Cerrar contrato del loop y ownership por modulo.
2. Llegar rapido al milestone de semana 1 persistida y auditable.
3. Luego cerrar el loop semanal completo antes de invertir en extras de calidad de vida.
4. Abrir alpha solo cuando audit, analytics y rollback ya existan en forma minima pero real.

## 12. Preguntas abiertas

1. El producto actual ya dispone de una home semanal o plan flow reutilizable, o el wedge necesita surfaces nuevas casi completas?
2. Existe infraestructura actual de feature flags, jobs/scheduler e idempotencia reutilizable?
3. Quien sera owner primario del ruleset MVP: backend, intelligence o un ownership compartido con product?
4. El equipo quiere priorizar milestone `semana 1 usable` para demos internas, o prefiere esperar al loop completo antes de mostrar valor?
5. Hace falta una capacidad minima de review manual de decisiones desde alpha, o alcanza con audit + BI al principio?
