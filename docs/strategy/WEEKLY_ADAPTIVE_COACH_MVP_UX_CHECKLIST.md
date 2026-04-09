# Weekly Adaptive Coach MVP UX Checklist

## 1. Objetivo del documento

Esta checklist convierte el PRD y el blueprint del `Weekly Adaptive Coach` en criterios concretos de UX, producto y comportamiento para que product, design y dev ejecuten el MVP con la menor ambiguedad posible.

Regla principal:

- la UX del MVP debe hacer visible que el producto entendio la semana real del usuario y devolvio una siguiente semana mas cumplible

## 2. Principios UX obligatorios

1. `El valor debe verse rapido.` Cada surface debe acercar al usuario a una recomendacion creible o a una adaptacion visible.
2. `No castigar malas semanas.` La UX debe sentirse como coaching, no como auditoria moral.
3. `Menos inputs, mas consecuencia.` Si pedimos datos, luego deben reflejarse en el plan, la explicacion o la decision.
4. `Una decision principal por semana.` No mostrar multiples recomendaciones compitiendo.
5. `La claridad gana a la sofisticacion.` Mejor un diff simple y entendible que una personalizacion opaca.
6. `Safety antes que performance.` Cuando hay senales de riesgo, la UX debe frenar agresividad y explicar limites.
7. `Mobile-first de verdad.` El loop principal debe resolverse comodamente con una mano y en sesiones cortas.

## 3. Journey end-to-end del MVP

| Etapa | Objetivo del usuario | Objetivo del producto | Riesgo UX a evitar |
| --- | --- | --- | --- |
| Descubrimiento inicial | entender si FitSculpt le sirve | prometer coaching adaptativo, no tracking generico | sobreprometer IA magica |
| Onboarding | contar su contexto real sin agotarse | capturar inputs suficientes para un plan creible | formulario largo sin valor percibido |
| Plan inicial | sentir que el plan encaja | demostrar criterio inicial y setear expectativas | plan generico o sin explicacion |
| Semana activa | saber que hacer esta semana | mantener foco y facilitar logging minimo | home saturada y confusa |
| Weekly check-in | cerrar la semana rapido y sin culpa | capturar senales minimas para adaptar bien | cuestionario largo o punitivo |
| Decision del coach | entender que cambia y por que | hacer visible la adaptacion y ganar confianza | explicacion vaga o diff ilegible |
| Nueva semana | aceptar y ejecutar | reiniciar el loop con narrativa de progreso | dejar dudas sobre que hacer ahora |

## 4. Inventario de pantallas MVP

Estas son las pantallas que deben existir o estar explicitamente resueltas:

| Surface | Estado MVP |
| --- | --- |
| Onboarding - Objetivo y contexto | obligatoria |
| Onboarding - Contexto fisico | obligatoria |
| Onboarding - Disponibilidad y entorno | obligatoria |
| Onboarding - Preferencias y adherencia | obligatoria |
| Resumen del plan inicial | obligatoria |
| Home semanal | obligatoria |
| Logging minimo | obligatoria |
| Weekly check-in | obligatoria |
| Decision del coach | obligatoria |
| Diff de cambios de la semana | obligatoria, integrada o adjunta a decision |
| Historial minimo de adaptaciones | recomendada si no rompe scope |
| Surface de trust/safety | obligatoria aunque sea liviana |

## 5. Checklist por pantalla critica

### 5.1 Onboarding - Objetivo y contexto

**Objetivo**

- entender que quiere lograr el usuario, en que horizonte y con que nivel de compromiso real

**Must-have blocks**

- objetivo principal
- objetivo secundario
- horizonte deseado
- nivel de compromiso percibido
- barra de progreso o expectativa clara del recorrido

**Must-not-have clutter**

- explicaciones largas tipo articulo
- multiples CTAs compitiendo
- campos avanzados que no se usaran en semana 1

**Estados**

- vacio inicial
- validacion inline
- guardado parcial si abandona
- continue enabled solo con minimos completos

**Analytics hooks**

- `onboarding_started`
- `onboarding_step_viewed`
- `onboarding_step_completed`
- `onboarding_abandoned`

**Copy notes**

- explicar por que preguntamos esto en una sola linea
- evitar promesas grandilocuentes; usar lenguaje de ajuste realista

### 5.2 Onboarding - Contexto fisico

**Objetivo**

- capturar base suficiente para generar un plan creible y seguro

**Must-have blocks**

- edad
- sexo
- altura
- peso actual con opcion de no saber exacto si aplica
- experiencia entrenando
- lesiones o limitaciones relevantes

**Must-not-have clutter**

- biomarcadores avanzados
- copy clinico o diagnostico
- preguntas de precision falsa

**Estados**

- ayuda contextual para lesiones y limitaciones
- validaciones simples y tolerantes
- aviso si una limitacion cambia lo que el coach puede recomendar

**Analytics hooks**

- `onboarding_field_completed`
- `safety_signal_declared`

**Copy notes**

- tono cuidadoso y no alarmista
- dejar claro que no es evaluacion medica

### 5.3 Onboarding - Disponibilidad y entorno

**Objetivo**

- adaptar el plan a la semana real, no a la semana ideal

**Must-have blocks**

- dias disponibles por semana
- duracion realista por sesion
- equipamiento disponible
- horario preferido
- tipo de trabajo o nivel de actividad base

**Must-not-have clutter**

- calendarios complejos
- configuradores avanzados de rutina
- demasiadas subpreguntas por cada contexto

**Estados**

- selectors rapidos de baja friccion
- validacion de combinaciones absurdas o imposibles

**Analytics hooks**

- `onboarding_availability_set`
- `onboarding_equipment_selected`

**Copy notes**

- reforzar: `vamos a construir sobre lo que si puedes sostener`

### 5.4 Onboarding - Preferencias y adherencia

**Objetivo**

- reducir friccion futura y detectar riesgo de abandono desde el inicio

**Must-have blocks**

- ejercicios o formatos que le gustan
- ejercicios o formatos que evita
- restricciones alimentarias basicas
- estilo preferido: simple, flexible, estructurado
- principal causa historica de abandono
- confianza actual para cumplir

**Must-not-have clutter**

- taxonomias gigantes de preferencias
- preguntas aspiracionales que no cambian nada en MVP

**Estados**

- opciones predefinidas + campo opcional corto
- claridad de que esta informacion personaliza la dificultad inicial

**Analytics hooks**

- `onboarding_adherence_risk_selected`
- `onboarding_completed`

**Copy notes**

- lenguaje humano: `que suele hacer que abandones?`
- evitar sonar acusatorio

### 5.5 Resumen del plan inicial

**Objetivo**

- generar la primera sensacion de coaching competente y razonado

**Must-have blocks**

- resumen de la semana 1
- numero de sesiones y duracion esperada
- linea nutricional basica
- razonamiento corto: `por que este plan encaja contigo`
- supuestos o limites visibles
- CTA primario `Aceptar plan`

**Must-not-have clutter**

- tablas densas de detalles avanzados
- demasiados modulos secundarios
- lenguaje generico tipo `creado con AI`

**Estados**

- loading con mensaje de progreso creible
- success con plan listo
- fallback conservador si faltan datos
- error recuperable si falla generacion

**Analytics hooks**

- `initial_plan_generated`
- `initial_plan_viewed`
- `initial_plan_accepted`
- `initial_plan_rejected`

**Copy notes**

- explicacion concreta basada en inputs declarados
- setear expectativa: `la primera semana es una base que vamos a ajustar contigo`

### 5.6 Home semanal

**Objetivo**

- dejar claro que esta semana importa y cual es el siguiente paso hacia el check-in

**Must-have blocks**

- objetivo semanal visible arriba del fold
- estado de progreso simple
- CTA principal contextual: `Registrar progreso` o `Hacer check-in`
- countdown o estado de check-in
- resumen breve del plan actual

**Must-not-have clutter**

- dashboard tipo cockpit
- graficos secundarios sin accion
- multiples caminos principales

**Estados**

- primera semana activa
- semana en curso con logging parcial
- check-in disponible
- semana vencida sin check-in

**Analytics hooks**

- `weekly_home_viewed`
- `weekly_cta_clicked`

**Copy notes**

- una sola prioridad visible
- evitar tono de productividad vacia; hablar de cumplir mejor la semana

### 5.7 Logging minimo

**Objetivo**

- capturar senales minimas sin convertir la app en tracker pesado

**Must-have blocks**

- entreno completado o no
- cercania nutricional simple
- peso o progreso percibido
- nota opcional breve

**Must-not-have clutter**

- macros detallados
- series/reps/cargas completas en MVP si no son necesarias para decidir
- editor largo de notas

**Estados**

- input rapido
- confirmacion de guardado clara
- opcion de editar ultimo registro

**Analytics hooks**

- `weekly_log_started`
- `weekly_log_submitted`

**Copy notes**

- reforzar que basta senal util, no perfeccion

### 5.8 Weekly check-in

**Objetivo**

- convertir una semana imperfecta en una decision simple y accionable

**Must-have blocks**

- progreso visible por pasos
- adherencia entreno
- adherencia nutricion
- progreso o peso
- energia
- hambre/saciedad
- recuperacion
- estres
- dolor o molestias
- principal friccion
- confianza proxima semana
- CTA final `Ver decision del coach`

**Must-not-have clutter**

- scroll infinito
- inputs abiertos obligatorios multiples
- preguntas que no cambian decision o UX posterior

**Estados**

- inicio claro
- progreso parcial guardable
- abandono recuperable
- validacion simple
- envio exitoso

**Analytics hooks**

- `checkin_started`
- `checkin_step_completed`
- `checkin_completed`
- `checkin_abandoned`

**Copy notes**

- tono de reflexion guiada
- nunca usar copy de culpa por baja adherencia

### 5.9 Decision del coach + diff semanal

**Objetivo**

- hacer visible el valor diferencial del producto en menos de un scroll

**Must-have blocks**

- decision principal: `Mantener`, `Ajustar`, `Simplificar` o `Redisenar`
- explicacion corta de por que
- reason codes legibles
- diff claro: que se mantiene, que cambia, que esperamos
- CTA primario `Aceptar adaptacion`
- CTA secundario `Hazmelo mas facil` o `Revisar contexto`

**Must-not-have clutter**

- comparativas densas de todo el plan
- razonamientos largos tipo ensayo
- jergas tecnicas de modelo o score interno

**Estados**

- loading tras check-in
- success con decision
- low-confidence fallback
- safety fallback
- decision rechazada o cuestionada

**Analytics hooks**

- `coach_decision_generated`
- `coach_decision_viewed`
- `coach_adaptation_accepted`
- `coach_adaptation_rejected`
- `safety_fallback_triggered`

**Copy notes**

- estructura recomendada: `por que`, `que cambia`, `que esperamos`
- ser especifico: `bajamos de 5 a 3 sesiones`, no `optimizamos tu rutina`

### 5.10 Historial minimo de adaptaciones

**Objetivo**

- reforzar accountability y narrativa de progreso sin abrir complejidad innecesaria

**Must-have blocks**

- lista simple por semana
- decision tomada
- resumen corto del cambio

**Must-not-have clutter**

- analitica historica profunda
- comparadores complejos

**Estados**

- vacio inicial sin historial
- lista con semanas previas

**Analytics hooks**

- `adaptation_history_viewed`

**Copy notes**

- usarlo como soporte, no como surface principal del MVP

### 5.11 Trust / safety surface

**Objetivo**

- explicar limites del sistema y actuar con prudencia cuando hay riesgo o baja confianza

**Must-have blocks**

- mensaje claro de limite
- razon de prudencia o falta de confianza suficiente
- CTA recomendado: pausar, revisar contexto o buscar ayuda profesional segun caso

**Must-not-have clutter**

- mensajes frios o legales sin accion
- lenguaje que parezca diagnostico

**Estados**

- safety trigger
- datos insuficientes
- contradiccion fuerte de senales

**Analytics hooks**

- `safety_message_viewed`
- `low_confidence_flow_seen`

**Copy notes**

- tono firme, claro y sereno
- nunca sonar medico si no hay criterio clinico real

## 6. Estados requeridos en todo el MVP

Cada surface critica debe resolver estos estados cuando aplique:

| Estado | Regla UX |
| --- | --- |
| Empty | explicar que falta y cual es el siguiente paso, nunca dejar superficie muda |
| Loading | mostrar progreso y expectativa realista, no spinner desnudo |
| Error | decir que paso en lenguaje humano y ofrecer recuperacion clara |
| Success | confirmar valor entregado y empujar siguiente accion |
| Partial / Incomplete | permitir retomar sin castigo cuando sea posible |
| Safety | frenar agresividad y mostrar siguiente paso prudente |
| Low confidence | no fingir precision; explicitar limites y optar por salida conservadora |

Checklist transversal:

- [ ] no hay pantallas sin estado vacio definido
- [ ] no hay loading sin mensaje contextual
- [ ] no hay error sin CTA de recuperacion
- [ ] no hay success que deje al usuario sin siguiente paso

## 7. Requisitos de trust y safety

- [ ] Nunca prometer diagnostico medico o supervision clinica.
- [ ] Si hay dolor problematico, lesion nueva, mareo o senal de riesgo, no mostrar progresion agresiva.
- [ ] Toda decision sensible debe tener explicacion breve y accion conservadora.
- [ ] Si faltan datos clave, usar fallback de `mantener` o `ajustar` minimo con nota de baja confianza.
- [ ] Debe existir copy que explique que el sistema trabaja con senales semanales y no con certeza absoluta.
- [ ] El usuario debe entender que puede revisar contexto o buscar ayuda profesional cuando corresponda.

## 8. Consideraciones mobile-first

- [ ] CTA principal visible sin scroll excesivo.
- [ ] Inputs utilizables con pulgar y sin precision fina.
- [ ] Steps del onboarding y check-in divididos en bloques cortos.
- [ ] Textos clave visibles en 1 o 2 pantallas maximo.
- [ ] No depender de hover, tooltips invisibles o tablas anchas.
- [ ] El diff semanal debe ser legible en stacking vertical.
- [ ] El loading y guardado parcial deben tolerar interrupciones reales del movil.

## 9. Basicos de accesibilidad

- [ ] Contraste suficiente en textos, estados y CTAs.
- [ ] Labels visibles, no solo placeholders.
- [ ] Orden de foco y navegacion coherente.
- [ ] Feedback de error asociado al campo correcto.
- [ ] CTA y elementos interactivos con area tactil comoda.
- [ ] No depender solo del color para comunicar estado o riesgo.
- [ ] Lenguaje simple y directo en pantallas criticas.

## 10. Checklist de contenido y copy

- [ ] El tono suena a coach claro, no a bot generico.
- [ ] La explicacion siempre conecta senal -> decision -> cambio.
- [ ] No hay lenguaje moralizante cuando la adherencia fue baja.
- [ ] No hay promesas infladas de resultados rapidos.
- [ ] Se usa la nomenclatura canonica: `plan inicial`, `weekly check-in`, `decision del coach`, `simplificar`, `redisenar`.
- [ ] El usuario entiende por que le pedimos cada dato importante.
- [ ] Los CTAs dicen exactamente que pasara despues.

## 11. Pre-development UX signoff checklist

Antes de entrar a implementacion, producto, design y dev deben poder marcar todo esto:

- [ ] Cada pantalla critica tiene objetivo definido.
- [ ] Cada pantalla critica tiene bloques obligatorios y clutter explicitamente excluido.
- [ ] Cada pantalla critica tiene estados vacio, loading, error y success resueltos cuando aplica.
- [ ] Cada pantalla critica tiene analytics hooks definidos.
- [ ] El flujo completo entra dentro de la promesa `onboarding -> plan inicial -> semana -> check-in -> decision -> nueva semana`.
- [ ] La decision del coach se entiende en menos de un scroll en mobile.
- [ ] Safety y low confidence no son casos postergados; tienen UX definida.
- [ ] No hay campos o preguntas que no impacten plan, decision o confianza.
- [ ] Las dependencias de copy, data y payload ya estan resueltas.

## 12. Pre-release QA / UAT checklist enfocada en comportamiento

### Happy path

- [ ] Un usuario nuevo completa onboarding y recibe plan inicial sin friccion mayor.
- [ ] El usuario entiende por que ese plan encaja con su contexto.
- [ ] Durante la semana puede registrar progreso minimo en menos de 1 minuto.
- [ ] Al final de semana puede completar check-in en 3 a 5 minutos.
- [ ] La decision del coach muestra razon y diff con claridad.
- [ ] El usuario puede aceptar la adaptacion y entrar a la nueva semana sin confusion.

### Edge cases

- [ ] Un usuario abandona onboarding y puede retomarlo.
- [ ] Un usuario no se pesa y puede usar progreso percibido.
- [ ] Un usuario llega al check-in con logging incompleto y el sistema no colapsa.
- [ ] Un usuario deja el check-in a mitad y puede volver.
- [ ] Un usuario rechaza la recomendacion y ve una salida secundaria sensata.
- [ ] Un usuario tiene una semana muy mala y la UX no lo castiga.

### Safety / trust

- [ ] Dolor problematico dispara conducta conservadora y mensaje correcto.
- [ ] Baja confianza o datos insuficientes generan salida prudente, no precision falsa.
- [ ] Ninguna pantalla sugiere criterio medico no soportado.
- [ ] Los mensajes de seguridad son claros y accionables.

### Analytics / observabilidad

- [ ] Todos los eventos core del loop se disparan una sola vez y con propiedades minimas.
- [ ] Se puede reconstruir el journey de onboarding a decision aceptada.
- [ ] Se puede identificar cuando el usuario abandono o rechazo una adaptacion.

## 13. Criterio final de calidad UX del MVP

La UX del MVP esta lista cuando:

- el usuario siente que el producto entendio su semana real
- la adaptacion se explica con lenguaje simple y concreto
- el loop completo puede hacerse en movil sin fatiga seria
- los casos de riesgo se resuelven con prudencia visible
- producto, design y engineering pueden construir sin discutir que significa cada pantalla
