# Weekly Adaptive Coach Blueprint

## 1. Vision de producto y tesis

FitSculpt debe ganar el mercado no por tener "mas features fitness", sino por entregar una sensacion real de coaching continuo: un plan inicial creible, una revision semanal obligatoria y una decision visible de mantener, ajustar, simplificar o redisenar con explicacion clara.

### Tesis

- La mayoria de apps fitness fracasan porque generan planes estaticos y responsabilizan al usuario cuando la realidad cambia.
- La adherencia mejora cuando el producto actua como coach: interpreta contexto, reduce friccion y hace recomendaciones explicables.
- El loop semanal es la unidad minima de valor porque balancea suficiente senal conductual con una frecuencia sostenible para el usuario.
- El diferencial de FitSculpt no es "AI generica", sino un sistema adaptativo visible, disciplinado y confiable.

## 2. Problema del usuario y por que fallan las apps actuales

### Problema real

El usuario no necesita solo un plan. Necesita que el plan sobreviva a:

- semanas con poco tiempo
- fatiga, dolor, estres o mal sueno
- cambios de motivacion
- oscilaciones de peso y apetito
- viajes, menstruacion, trabajo y vida social

### Por que fallan las apps existentes

| Falla de mercado | Consecuencia para el usuario | Oportunidad FitSculpt |
| --- | --- | --- |
| Onboarding superficial | Plan poco creible desde el dia 1 | Onboarding con nivel de coach, no de formulario de marketing |
| Plan estatico | El usuario siente que la app "no entiende" su realidad | Revision semanal obligatoria con decision explicita |
| Recomendaciones opacas | Baja confianza y baja adopcion | Explicacion corta: que cambio, por que y que esperamos |
| Demasiada complejidad cuando baja la adherencia | Abandono por culpa o saturacion | Modo simplificar antes de perder al usuario |
| Mezcla pobre entre fitness y salud | Ajustes peligrosos o irrelevantes | Limites de seguridad y derivacion cuando corresponde |

## 3. Usuario objetivo inicial y exclusiones

### Primer usuario objetivo

Persona de 25 a 45 anos, con objetivo de transformacion fisica visible y sostenible, que ya intento entrenar/comer mejor varias veces, pero falla por inconsistencia, fatiga de decision o planes que no se adaptan a su vida real.

### Perfil ideal de lanzamiento

- Quiere perder grasa, recomponer o recuperar forma fisica.
- Esta dispuesto a hacer check-in semanal de 3 a 5 minutos.
- Tolera estructura si siente personalizacion real.
- Entrena en gimnasio, casa o formato hibrido.
- Valora resultados visibles, energia y sostenibilidad; no solo "quemar calorias".

### No es el usuario inicial

- Atletas avanzados de alto rendimiento con periodizacion compleja.
- Usuarios clinicos que requieran supervision medica activa.
- Personas buscando solo tracking pasivo sin compromiso semanal.
- Usuarios que esperan diagnostico medico, nutricion terapeutica o soporte de trastornos alimentarios.

## 4. Loop semanal core

### Secuencia

1. Onboarding profundo genera plan inicial creible.
2. Usuario ejecuta la semana con logging minimo viable.
3. El sistema dispara check-in obligatorio al cierre de semana.
4. El motor decide una de cuatro salidas: mantener, ajustar, simplificar o redisenar.
5. La app muestra explicacion, impacto esperado y plan de la siguiente semana.
6. El usuario acepta, comenta o pide contexto adicional.
7. Se reinicia el ciclo con nuevas metas y restricciones.

### Regla de producto

Sin check-in semanal no hay adaptacion completa. La experiencia debe empujar el cierre del loop porque ahi vive el valor diferencial.

## 5. Inputs de onboarding detallados

### Esenciales en lanzamiento

#### Objetivo y horizonte

- objetivo principal: perder grasa, ganar musculo, recomponer, volver a rutina
- objetivo secundario: energia, salud, fuerza, confianza corporal
- horizonte temporal deseado
- urgencia percibida y nivel de compromiso

#### Contexto fisico y experiencia

- edad
- sexo
- altura
- peso actual
- peso historico aproximado o rango reciente
- experiencia entrenando
- experiencia con nutricion/seguimiento
- lesiones relevantes o limitaciones declaradas

#### Disponibilidad y entorno

- dias reales disponibles por semana
- duracion realista por sesion
- acceso a gimnasio, casa, equipamiento o ambos
- preferencia de horarios
- tipo de trabajo: sedentario, activo, turnos

#### Preferencias y adherencia

- ejercicios que le gustan o detesta
- restricciones alimentarias
- estilo preferido: simple, flexible, estructurado
- principal causa historica de abandono
- confianza actual para cumplir el plan

#### Baseline conductual

- pasos o actividad diaria estimada
- sueno promedio
- nivel de estres autodeclarado
- consumo de alcohol social/frecuencia
- numero de comidas habitual

### Para version posterior

- circunferencias, fotos y composicion corporal
- historial de peso detallado por 3 a 6 meses
- dispositivos y wearables
- fase menstrual y sintomas asociados
- medicamentos relevantes y suplementos
- contexto emocional/comida por ansiedad
- historial de dietas extremas
- disponibilidad financiera para alimentos o gimnasio
- red de soporte social

## 6. Especificacion del weekly check-in

### Objetivo del check-in

Transformar una semana de senales imperfectas en una decision simple, accionable y explicable.

### Duracion objetivo

3 a 5 minutos.

### Inputs minimos

| Categoria | Pregunta / input | Tipo |
| --- | --- | --- |
| Adherencia entrenamiento | Cuantas sesiones completaste vs planificadas | cuantitativo |
| Adherencia nutricion | Que tan cerca estuviste de tu plan nutricional | escala |
| Peso / progreso | Peso actual o percepcion de progreso si no quiere pesarse | cuantitativo/cualitativo |
| Energia | Como estuvo tu energia esta semana | escala |
| Hambre | Hambre/saciedad general | escala |
| Recuperacion | Sueno y fatiga | escala |
| Estres | Estres percibido | escala |
| Dolor / molestias | Dolor muscular esperable vs dolor problematico | selector |
| Friccion | Que fue lo mas dificil de cumplir | selector + texto |
| Confianza | Que tan capaz te ves de cumplir la proxima semana | escala |

### Inputs deseables en fase 2

- pasos promedio
- frecuencia cardiaca en reposo o tendencias de wearable
- cumplimiento real de series/reps/cargas
- fotos de progreso
- ciclo menstrual y sintomas
- eventos extraordinarios: viaje, enfermedad, semana laboral critica

### Salidas del check-in

- decision del coach
- explicacion breve en lenguaje humano
- cambios concretos para la proxima semana
- CTA principal: aceptar plan
- CTA secundaria: necesito que lo hagas mas facil / revisar contexto

## 7. Overview del decision engine

### Estados de decision

| Decision | Cuando usarla | Objetivo |
| --- | --- | --- |
| Mantener | Buen cumplimiento, carga sostenible, progreso o senales neutras | No tocar lo que esta funcionando |
| Ajustar | Cumplimiento razonable pero hay friccion o progreso insuficiente | Mejorar precision sin romper adherencia |
| Simplificar | Adherencia baja, fatiga alta, estres alto o plan demasiado ambicioso | Recuperar cumplimiento y confianza |
| Redisenar | Desalineacion estructural: plan incorrecto, contexto cambio fuerte, limitacion nueva | Replantear estrategia base |

### Logica de alto nivel

1. Evaluar seguridad primero.
2. Evaluar adherencia real vs adherencia esperada.
3. Evaluar tendencia de progreso vs objetivo.
4. Evaluar sostenibilidad: energia, sueno, estres, dolor, confianza.
5. Priorizar preservacion de adherencia antes que agresividad del plan.
6. Mostrar una sola decision principal, aunque internamente existan multiples micro-ajustes.

### Principio operativo

Es mejor una recomendacion ligeramente menos optima pero altamente cumplible que una recomendacion teoricamente perfecta e imposible de ejecutar.

## 8. Dimensiones de adaptacion del entrenamiento

### Variables que el motor puede tocar

- numero de sesiones por semana
- duracion de sesion
- volumen total por grupo muscular
- intensidad percibida o proximidad al fallo
- complejidad tecnica del ejercicio
- seleccion de ejercicios segun dolor, preferencia y equipamiento
- orden de ejercicios
- densidad: descansos, superseries, bloques mas cortos
- foco: fuerza, hipertrofia, acondicionamiento, cumplimiento minimo
- dias de recovery o movilidad

### Reglas de ejemplo

- Si la persona cumple 80%+ de sesiones, recupera bien y reporta buena energia: mantener o progresar levemente.
- Si cumple menos de 60% por falta de tiempo: simplificar frecuencia o reducir duracion antes de tocar intensidad.
- Si reporta molestias articulares: sustituir ejercicios gatillo y reducir demanda mecanica.
- Si el problema es aburrimiento: variar seleccion, no necesariamente subir carga.

## 9. Dimensiones de adaptacion de nutricion

### Variables que el motor puede tocar

- objetivo calorico global
- distribucion de proteina
- numero de comidas sugeridas
- estrategia de snacks o saciedad
- flexibilidad del fin de semana
- estructura pre/post entrenamiento
- nivel de precision: macros exactos vs guias por porciones
- lista de sustituciones y comidas base
- proteccion de adherencia en eventos sociales

### Regla clave

Cuando el cumplimiento nutricional cae, la primera respuesta no debe ser castigar con mas restriccion, sino reducir friccion y redisenar la estructura de cumplimiento.

## 10. Recuperacion, estres, sueno y ciclo menstrual

### Consideraciones obligatorias

- Sueno bajo + fatiga alta + estres alto debe reducir agresividad del plan.
- Dolor persistente o empeorando debe activar barreras de seguridad.
- En semanas de alta demanda laboral/familiar, el sistema debe priorizar version minima efectiva.
- Si la usuaria reporta ciclo menstrual y sintomas, el motor puede modular volumen, intensidad y expectativas de peso/retencion.

### Principios

- No interpretar cualquier aumento de peso semanal como fracaso si hay senales de retencion, ciclo, sodio o estres.
- No empujar deficit/agresividad cuando la recuperacion esta claramente comprometida.
- Diferenciar cansancio normal de sobrecarga o posible riesgo fisico.

## 11. Limites de riesgo, seguridad y casos de deferencia

### El AI debe deferir o escalar cuando haya

- dolor agudo, mareo, desmayo, falta de aire inusual
- lesion nueva o empeoramiento claro
- senales de conducta alimentaria de riesgo
- perdida de peso extrema o conductas compensatorias
- embarazo, postparto temprano o contexto medico relevante no evaluado
- sintomas clinicos que sugieran necesidad de profesional humano
- contradicciones fuertes en datos o muy baja confianza del modelo

### Respuesta del producto

- congelar ajustes agresivos
- mostrar mensaje de seguridad claro
- recomendar consulta profesional o revision manual
- mantener version conservadora del plan hasta nueva informacion

## 12. Superficies UX necesarias en la app

| Superficie | Rol |
| --- | --- |
| Onboarding de coach | Capturar contexto suficiente para generar plan creible |
| Resumen del plan inicial | Explicar por que este plan es adecuado para esta persona |
| Home semanal | Mostrar objetivo de la semana, adherencia y proximo check-in |
| Logging minimo | Permitir registrar entrenamiento, peso, nutricion y bienestar sin friccion excesiva |
| Check-in semanal | Centro de captura de senales y momento de reflexion guiada |
| Pantalla de decision del coach | Mostrar mantener/ajustar/simplificar/redisenar con explicacion |
| Diff del plan | Visualizar que cambio respecto a la semana anterior |
| Centro de confianza | Mostrar limites, supuestos y cuando el AI recomienda ayuda humana |
| Historial de adaptaciones | Construir narrativa de progreso y accountability |

## 13. Metricas de exito

### Producto

- tasa de completitud de onboarding
- tiempo a primer plan aceptado
- tasa de check-in semanal completado
- tasa de aceptacion de adaptaciones
- retencion W4, W8 y W12

### Conducta

- adherencia semanal a entrenamiento
- adherencia nutricional autodeclarada
- porcentaje de usuarios que vuelven al loop despues de una mala semana
- porcentaje de usuarios que pasan de simplificar a mantener en 2 a 4 semanas

### Resultado

- cambio de peso/composicion segun objetivo
- mejora de energia/percepcion de control
- progreso en consistencia sostenida
- NPS o score de confianza en el coach

## 14. Checklist de implementacion

### Fase 0: Definicion de MVP del loop

- [ ] Cerrar definicion del usuario objetivo inicial.
- [ ] Congelar inputs esenciales de onboarding.
- [ ] Definir esquema de datos del check-in semanal.
- [ ] Definir las 4 decisiones canonicas del motor.
- [ ] Escribir reglas de seguridad y deferencia.
- [ ] Alinear copy de explicacion del coach.

### Fase 1: MVP funcional

- [ ] Implementar onboarding tipo coach.
- [ ] Generar plan inicial con explicacion.
- [ ] Implementar home semanal con CTA a check-in.
- [ ] Implementar check-in obligatorio de 3-5 minutos.
- [ ] Mostrar decision del coach con diff del plan.
- [ ] Instrumentar eventos de analytics del loop completo.

### Fase 2: Decisioning y confianza

- [ ] Incorporar score de adherencia semanal.
- [ ] Incorporar reglas de simplificacion automatica.
- [ ] Incorporar confianza/certeza de recomendacion.
- [ ] Implementar historial de adaptaciones.
- [ ] Implementar reason codes visibles para el usuario.

### Fase 3: Profundidad adaptativa

- [ ] Integrar wearables y datos de actividad/sueno.
- [ ] Incorporar patrones de recuperacion y estres.
- [ ] Soportar mejor ciclo menstrual y semanas especiales.
- [ ] Introducir re-diseno estructural del plan cuando el contexto cambie.
- [ ] Optimizar personalizacion por cohortes y resultados observados.

## 15. Preguntas abiertas y supuestos

### Supuestos actuales

- El usuario aceptara un check-in semanal obligatorio si el valor percibido es evidente.
- Un loop semanal sera suficiente para mejorar adherencia antes de introducir adaptacion diaria.
- La explicabilidad visible aumentara confianza y aceptacion de cambios.
- Simplificar a tiempo reducira churn mejor que insistir con planes agresivos.

### Preguntas abiertas

- Cual es el minimo logging necesario para que el motor sea util sin generar fatiga?
- En que momento introducir pesaje obligatorio vs opcional?
- Cuanta autonomia dejar al usuario para rechazar o editar la recomendacion?
- Que parte del plan inicial debe ser deterministicamente gobernada por reglas y que parte por modelos?
- Cual es el umbral exacto de riesgo para pasar de ajuste automatizado a deferencia humana?
- Como diferenciar recomposicion real de progreso percibido cuando el peso no se mueve?
