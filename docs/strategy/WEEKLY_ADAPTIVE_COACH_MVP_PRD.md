# Weekly Adaptive Coach MVP PRD

## 1. Objetivo de producto

Lanzar un MVP del `Weekly Adaptive Coach` que entregue una promesa clara y visible: `onboarding tipo coach -> plan inicial creible -> weekly check-in obligatorio -> decision explicable de mantener, ajustar, simplificar o redisenar -> siguiente semana mas cumplible`.

## 2. Problem statement

La mayoria de productos fitness fallan cuando la semana real del usuario se desvia del plan. El usuario no necesita solo una rutina o una dieta: necesita un sistema que interprete adherencia, fatiga, estres, friccion y progreso, y adapte el plan con criterio sin castigarlo cuando tuvo una mala semana.

El problema que este MVP debe resolver es: `como hacer que un usuario sienta que el producto realmente entendio su semana y le devolvio una recomendacion mas cumplible para la siguiente`.

## 3. Usuario objetivo y no objetivo

### Usuario objetivo

Adulto de 25 a 45 anos que busca transformacion fisica sostenible, ya intento multiples veces entrenar o comer mejor, y necesita estructura adaptable mas que informacion generica.

### Perfil ideal de lanzamiento

- Quiere perder grasa, recomponer o volver a rutina.
- Puede dedicar 3 a 5 minutos por semana a un check-in.
- Tolera estructura si percibe personalizacion real.
- Entrena en gimnasio, casa o formato hibrido.
- Busca resultados visibles con sostenibilidad.

### Usuario no objetivo

- Atleta avanzado con necesidades de periodizacion compleja.
- Usuario clinico que requiere supervision medica activa.
- Persona que quiere tracking pasivo sin compromiso semanal.
- Usuario que espera diagnostico medico o soporte terapeutico.

## 4. Scope MVP

### In

- Onboarding coach-level con inputs esenciales.
- Generacion de plan inicial de semana 1.
- Home semanal con contexto y CTA al loop.
- Logging minimo viable para entreno, nutricion y progreso/bienestar.
- Weekly check-in obligatorio de 3 a 5 minutos.
- Decision engine MVP con cuatro salidas canonicas.
- Pantalla de decision del coach con explicacion y diff de cambios.
- Guardrails de safety y fallback conservador.
- Analytics del loop end-to-end.

### Out

- Integraciones con wearables o health platforms.
- Adaptacion diaria o intra-semana.
- Planificacion avanzada por bloques o periodizacion compleja.
- Chat abierto estilo coach 24/7.
- Recomendaciones clinicas, medicas o terapeuticas.
- Personalizacion profunda por ciclo menstrual mas alla de inputs basicos.
- Optimizacion automatica por modelos entrenados con cohortes historicas.

## 5. Flujo end-to-end del usuario

1. El usuario inicia onboarding y entrega contexto real de objetivo, disponibilidad, limitaciones y preferencias.
2. El sistema genera un plan inicial creible con explicacion de por que esa primera semana encaja con su realidad actual.
3. Durante la semana, el usuario ve su home semanal y registra senales minimas.
4. Al cierre de la semana, el sistema empuja el weekly check-in como paso obligatorio para adaptar el plan.
5. El usuario completa el check-in con adherencia, progreso, energia, hambre, recuperacion, estres, dolor, friccion y confianza.
6. El decision engine evalua safety primero y luego decide `mantener`, `ajustar`, `simplificar` o `redisenar`.
7. La app muestra la decision, el por que, que cambia y que se espera de la siguiente semana.
8. El usuario acepta la recomendacion o usa un CTA secundario para pedir contexto o una version mas facil.
9. Comienza la nueva semana con plan actualizado y registro de la adaptacion anterior.

## 6. Breakdown pantalla por pantalla

| Pantalla | Objetivo | Contenido obligatorio | CTA principal |
| --- | --- | --- | --- |
| Onboarding - Objetivo y contexto | Entender que quiere lograr y en que horizonte | objetivo principal, objetivo secundario, horizonte, compromiso | `Continuar` |
| Onboarding - Contexto fisico | Capturar base para plan seguro y creible | edad, sexo, altura, peso, experiencia, lesiones/limitaciones | `Continuar` |
| Onboarding - Disponibilidad y entorno | Ajustar el plan a la semana real | dias disponibles, duracion por sesion, equipamiento, horario, tipo de trabajo | `Continuar` |
| Onboarding - Preferencias y adherencia | Reducir friccion futura | ejercicios que le gustan o evita, restricciones alimentarias, estilo preferido, causa historica de abandono | `Generar mi plan` |
| Resumen del plan inicial | Dar primera sensacion de coaching competente | resumen de semana 1, razonamiento, supuestos, expectativa | `Aceptar plan` |
| Home semanal | Mantener foco y mostrar progreso hacia el siguiente check-in | objetivo semanal, sesiones previstas, estado de logging, countdown al check-in | `Registrar progreso` / `Hacer check-in` |
| Logging minimo | Capturar senales sin friccion | entreno completado, cercania nutricional, peso o progreso percibido, nota breve opcional | `Guardar` |
| Weekly check-in | Capturar la semana de forma guiada | preguntas estructuradas de adherencia, bienestar, friccion y confianza | `Ver decision del coach` |
| Decision del coach | Entregar valor visible de la adaptacion | decision principal, explicacion, reason codes, diff del plan, expectativa siguiente semana | `Aceptar adaptacion` |
| Historial minimo de adaptaciones | Reforzar accountability y narrativa de progreso | lista de semanas, decision tomada, resumen de cambios | `Ver detalle` |

## 7. Inputs de datos requeridos

### Inputs de onboarding requeridos

| Categoria | Campo |
| --- | --- |
| Objetivo | objetivo principal, objetivo secundario, horizonte temporal, nivel de compromiso |
| Perfil | edad, sexo, altura, peso actual, experiencia entrenando, experiencia nutricional |
| Seguridad | lesiones relevantes, limitaciones declaradas |
| Semana real | dias disponibles, duracion realista por sesion, acceso a equipamiento, horario preferido, tipo de trabajo |
| Preferencias | ejercicios preferidos/evitados, restricciones alimentarias, estilo de plan preferido |
| Riesgo de adherencia | principal causa historica de abandono, confianza actual |
| Baseline | pasos estimados, sueno promedio, estres autodeclarado, comidas habituales |

### Inputs semanales requeridos

| Categoria | Campo |
| --- | --- |
| Adherencia entreno | sesiones completadas vs planificadas |
| Adherencia nutricion | escala de cercania al plan |
| Progreso | peso actual o percepcion de progreso |
| Bienestar | energia, hambre/saciedad, recuperacion, estres |
| Riesgo | dolor/molestias, enfermedad o cambio fuerte de contexto |
| Friccion | principal razon de incumplimiento |
| Proyeccion | confianza para la siguiente semana |

## 8. Especificacion del weekly check-in

### Objetivo

Convertir una semana imperfecta en una decision simple, accionable y explicable.

### Duracion objetivo

3 a 5 minutos.

### Formulario MVP

| Orden | Campo | Tipo | Requerido | Notas |
| --- | --- | --- | --- | --- |
| 1 | Sesiones completadas vs planificadas | selector numerico | Si | Base para adherencia de entreno |
| 2 | Que tan cerca estuviste del plan nutricional | escala 1-5 | Si | 1 muy lejos, 5 muy cerca |
| 3 | Peso actual o progreso percibido | numero o selector | Si | Si no se pesa, puede elegir progreso visual/sensacion |
| 4 | Energia de la semana | escala 1-5 | Si | |
| 5 | Hambre/saciedad general | escala 1-5 | Si | |
| 6 | Sueno y recuperacion | escala 1-5 | Si | |
| 7 | Estres percibido | escala 1-5 | Si | |
| 8 | Dolor o molestias | selector | Si | `ninguno`, `esperable`, `problematico` |
| 9 | Que fue lo mas dificil de cumplir | selector + texto opcional | Si | tiempo, energia, hambre, aburrimiento, dolor, viajes, social, otro |
| 10 | Que tan capaz te ves de cumplir la proxima semana | escala 1-5 | Si | |

### Reglas UX del check-in

- Debe sentirse como reflexion guiada, no como auditoria punitiva.
- Debe mostrar progreso paso a paso.
- No debe pedir mas de un input abierto obligatorio.
- Debe devolver valor inmediato al finalizar.

## 9. Reglas MVP del decision engine

### Principios

- Evaluar safety antes que performance.
- Priorizar adherencia sostenible antes que agresividad del plan.
- Emitir una sola decision principal por semana.
- Explicar la decision con reason codes legibles.

### Estados de decision

| Decision | Uso esperado |
| --- | --- |
| Mantener | Cumplimiento suficiente, carga sostenible, progreso aceptable o neutro |
| Ajustar | Hay cumplimiento razonable, pero alguna variable requiere precision o correccion menor |
| Simplificar | La semana fue demasiado dificil de ejecutar y hay que recuperar cumplimiento/confianza |
| Redisenar | El plan base ya no encaja por cambio estructural o nueva limitacion |

### Salidas permitidas en MVP

- El MVP solo puede emitir una `primary_decision`: `mantener`, `ajustar`, `simplificar` o `redisenar`.
- `safety_outcome` (`clear`, `constrained`, `deferred`) no es una quinta decision; es un guardrail que limita como se llega a una de las cuatro salidas.
- No se permiten decisiones compuestas como `mantener y ajustar`, `simplificar parcial` o `redisenar con progresion`.
- Si hay duda entre dos salidas, gana la menos agresiva que siga siendo honesta con la evidencia semanal.

### Guardrails y thresholds MVP v1

Definiciones operativas para el MVP:

- `adherencia razonable`: entreno completado `>= 60%` de lo planificado.
- `adherencia fuerte`: entreno completado `>= 80%` de lo planificado.
- `semana tensionada`: al menos `2` de estas senales: energia `<= 2/5`, recuperacion `<= 2/5`, estres `>= 4/5`, hambre `>= 4/5`, confianza siguiente semana `<= 2/5`.
- `mismatch estructural`: nueva limitacion, cambio de equipamiento/entorno, o cambio de disponibilidad que vuelve poco creible repetir la estructura base de la semana siguiente.

### Reglas MVP cerradas

| Regla | Resultado |
| --- | --- |
| Si hay dolor `problematico`, mareo, lesion nueva, enfermedad fuerte o senal de alarma | No aplicar adaptacion normal; activar fallback de safety y limitar salida a `simplificar` o `redisenar` conservador |
| Si hay `mismatch estructural` para la proxima semana | `Redisenar` |
| Si adherencia entreno `< 60%` o confianza siguiente semana `<= 2/5` | `Simplificar` |
| Si la semana fue `tensionada` y la friccion principal es tiempo, estres, fatiga o saturacion | `Simplificar` |
| Si adherencia entreno `>= 80%`, nutricion `>= 4/5`, energia `>= 3/5`, recuperacion `>= 3/5`, estres `<= 3/5` y confianza `>= 3/5` | `Mantener` |
| Si adherencia es `>= 60%`, confianza `>= 3/5`, no hay semana tensionada y existe una friccion localizada o progreso insuficiente | `Ajustar` |
| Si faltan datos clave o hay senales contradictorias sin riesgo fisico | Fallback conservador: `mantener` con `low confidence`, o `ajustar` minimo si la friccion localizada es clara |

### Precedencia cuando las senales se pisan

Orden canonico del MVP:

1. `Safety / deferencia`
2. `Redisenar`
3. `Simplificar`
4. `Ajustar`
5. `Mantener`

Reglas practicas:

- `Redisenar` gana solo si el problema es estructural para la semana siguiente. Una semana mala por estres o tiempo no justifica `redisenar`; en ese caso gana `simplificar`.
- `Simplificar` gana sobre `ajustar` cuando ejecutar la proxima semana ya se ve fragil: adherencia `< 60%`, confianza `<= 2/5` o `semana tensionada`.
- `Ajustar` solo vive en semanas todavia cumplibles: adherencia `>= 60%`, confianza `>= 3/5` y problema localizado en una dimension.
- `Mantener` solo aplica cuando no hay una senal clara que justifique cambiar carga, estructura o flexibilidad.

### Desempate y fallback conservador

- Si un caso califica para `ajustar` y `simplificar` a la vez, usar `simplificar` salvo que la ejecucion haya sido `>= 60%`, la confianza sea `>= 3/5` y la tension este contenida a una sola senal.
- Si un caso califica para `mantener` y `ajustar`, usar `ajustar` solo cuando haya una friccion o desajuste concreto que cambie algo visible; si no, `mantener`.
- Si los datos estan incompletos o se contradicen, no escalar a `simplificar` ni `redisenar` solo por incertidumbre. El fallback por defecto es `mantener` con baja confianza, o `ajustar` minimo si existe una correccion puntual muy evidente.
- Ante empate real, elegir siempre la opcion menos agresiva entre las que siguen siendo defendibles con evidencia.

### Cambios permitidos por decision

| Decision | Cambios permitidos MVP |
| --- | --- |
| Mantener | Mantener estructura; opcional progreso leve de carga o consistencia |
| Ajustar | Tocar volumen, duracion, seleccion de ejercicios, estructura nutricional o flexibilidad semanal |
| Simplificar | Reducir sesiones, acortar duracion, bajar complejidad, usar version minima efectiva |
| Redisenar | Replantear frecuencia, entorno, foco semanal o estructura de cumplimiento base |

## 10. Ejemplos de outputs de adaptacion

### Ejemplo 1: Mantener

`Decision: Mantener`

`Por que:` Cumpliste casi todas las sesiones, reportaste buena energia y la semana fue sostenible.

`Cambio visible:` Se mantiene la estructura de 4 sesiones. Solo progresamos ligeramente una sesion clave.

### Ejemplo 2: Ajustar

`Decision: Ajustar`

`Por que:` Cumpliste razonablemente, pero tuviste hambre alta y el fin de semana se volvio dificil de sostener.

`Cambio visible:` Mantenemos calorias promedio, pero agregamos mas flexibilidad en comidas de fin de semana y una estructura mas simple post-entreno.

### Ejemplo 3: Simplificar

`Decision: Simplificar`

`Por que:` Tuviste poco tiempo, estres alto y solo completaste 2 de 5 sesiones. La prioridad ahora es recuperar consistencia.

`Cambio visible:` Bajamos de 5 a 3 sesiones, reducimos duracion y dejamos una version minima efectiva para que vuelvas a cumplir.

### Ejemplo 4: Redisenar

`Decision: Redisenar`

`Por que:` Reportaste una nueva molestia de rodilla y tu semana cambio por completo. El plan anterior ya no encaja con tu contexto actual.

`Cambio visible:` Reorganizamos frecuencia, quitamos ejercicios gatillo y pasamos a una semana mas conservadora.

## 11. Principios de copy UX y confianza

### Principios de copy

- Hablar como coach claro, no como bot generico.
- Explicar causa y efecto, no solo dar ordenes.
- Evitar tono moralizante o culposo cuando hubo baja adherencia.
- Usar lenguaje especifico: `bajamos sesiones`, `acortamos duracion`, `mantenemos estructura`.

### Principios de confianza

- Decir explicitamente que el sistema trabaja con senales semanales, no con certeza absoluta.
- Mostrar limites cuando falta informacion.
- No prometer criterio medico ni diagnostico.
- Hacer visible por que se cambio algo.
- Mantener el fallback conservador cuando la confianza sea baja.

## 12. Edge cases, safety y fallback

| Caso | Comportamiento esperado |
| --- | --- |
| Dolor problematico o lesion nueva | Congelar progresiones agresivas, mostrar mensaje de seguridad y recomendar revision profesional |
| Semana sin datos suficientes | No inventar precision; usar adaptacion conservadora con nota de informacion incompleta |
| El usuario no se pesa | Permitir progreso percibido o visual como input alternativo |
| Check-in abandonado a mitad | Guardar progreso si es posible y permitir reanudar |
| Cambios fuertes de contexto: viaje, enfermedad, semana laboral critica | Priorizar `simplificar` o `redisenar` antes que insistir con agresividad |
| Senales contradictorias | Elegir salida conservadora y marcar baja confianza interna |
| Rechazo de recomendacion | Registrar motivo y ofrecer `hacerlo mas facil` o `revisar contexto` |

## 13. Eventos analytics a instrumentar

| Evento | Cuando dispara | Propiedades minimas |
| --- | --- | --- |
| `onboarding_started` | Inicio del onboarding | source, segment, timestamp |
| `onboarding_completed` | Fin de onboarding | duration, fields_completed |
| `initial_plan_generated` | Plan inicial listo | rule_version, plan_type |
| `initial_plan_accepted` | Usuario acepta semana 1 | timestamp |
| `weekly_home_viewed` | Visita a home semanal | current_week, checkin_due |
| `weekly_log_submitted` | Registro minimo guardado | log_type, current_week |
| `weekly_check_in_started` | Inicio del weekly check-in | current_week |
| `weekly_check_in_completed` | Fin del weekly check-in | duration, completion_state |
| `adaptation_generated` | Decision lista | decision_type, rule_version, confidence_state |
| `adaptation_viewed` | Usuario ve decision | decision_type |
| `adaptation_accepted` | Usuario acepta adaptacion | decision_type |
| `adaptation_rejected` | Usuario rechaza o pide cambio | decision_type, rejection_reason |
| `safety_fallback_triggered` | Se activa guardrail | trigger_type |

## 14. Release gates del MVP

Los siguientes gates son cerrados para el MVP. Todos deben estar en verde antes de marcar el loop como `release-ready`.

| Gate | Criterio de salida | Evidencia minima | Owner que prepara | Quien valida antes de release |
| --- | --- | --- | --- | --- |
| `G1_scope_locked` | objetivo, promesa, target/non-target y scope `in/out` congelados | PRD y backlog alineados | Product | Product lead |
| `G2_onboarding_contract_ready` | onboarding definido campo por campo con required/optionalidad y validaciones minimas | data contracts + UX checklist | Product + App | Product + frontend lead |
| `G3_decision_rules_ready` | reglas de `mantener`, `ajustar`, `simplificar`, `redisenar`, changes permitidos y reason codes v1 cerrados | PRD + tech architecture + data contracts | Intelligence | Intelligence lead + backend lead |
| `G4_safety_ready` | triggers de seguridad/deferencia y UX de fallback definidos con CTA conservador | tech architecture + UX checklist | Product + Intelligence | Product lead |
| `G5_functional_loop_ready` | onboarding -> plan inicial -> semana activa -> check-in -> decision -> aceptacion funciona end-to-end | QA/UAT smoke del loop | App | App lead |
| `G6_analytics_ready` | eventos core permiten reconstruir onboarding, check-in, decision y aceptacion | taxonomy de eventos + smoke de observabilidad | Intelligence | Data/analytics owner |
| `G7_audit_and_rollback_ready` | cada decision deja trazabilidad minima y el rollout puede apagarse por flags | audit schema + flags + runbook basico | App + Intelligence | Tech lead |
| `G8_alpha_go_no_go` | cohorte inicial, cadence de review y umbrales de safety/aceptacion definidos | checklist de alpha y criterio go/no-go | Product | Product lead + tech lead |

### Regla operativa de release

- si falla cualquier gate de safety, audit o rollback, el MVP no sale aunque el flujo funcional este completo
- si el loop funciona pero analytics no permite reconstruir funnel y aceptacion, no se marca `release-ready`
- si hay dudas entre dos salidas posibles, gana la interpretacion mas conservadora

## 15. Launch readiness checklist

- [ ] Onboarding MVP definido campo por campo.
- [ ] Plan inicial MVP definido con estructura y explicacion.
- [ ] Home semanal MVP definida.
- [ ] Logging minimo viable definido.
- [ ] Weekly check-in especificado y limitado a 3-5 minutos.
- [ ] Reglas MVP de `mantener / ajustar / simplificar / redisenar` aprobadas.
- [ ] Reason codes internos y user-facing definidos.
- [ ] Guardrails de safety y fallback conservador aprobados.
- [ ] Pantalla de decision del coach y diff semanal definidos.
- [ ] Eventos analytics core definidos y mapeados por surface.
- [ ] Checklist QA de edge cases y safety preparado.
- [ ] Criterios de alpha cerrada y go/no-go documentados.

## 16. Preguntas abiertas y supuestos

### Supuestos

- El usuario aceptara un weekly check-in obligatorio si la adaptacion posterior es visible y util.
- Un loop semanal es suficiente para demostrar valor antes de introducir adaptacion diaria.
- La explicacion breve y concreta aumenta aceptacion de recomendaciones.
- Simplificar a tiempo reduce churn mejor que insistir con planes mas duros.

### Preguntas abiertas

- Cual es el minimo logging que maximiza senal sin matar adherencia?
- Cuanta autonomia debe tener el usuario para modificar o rechazar una adaptacion?
- Que parte del plan inicial debe ser puramente gobernada por reglas y cual por IA controlada?
- Que experiencia de reenganche se muestra si un usuario salta dos check-ins seguidos?

Nota de cierre para MVP:

- El corte `ajustar` vs `simplificar` queda cerrado en este documento: `simplificar` gana cuando la siguiente semana ya no luce ejecutable; `ajustar` queda reservado para correcciones menores sobre una semana todavia cumplible.
