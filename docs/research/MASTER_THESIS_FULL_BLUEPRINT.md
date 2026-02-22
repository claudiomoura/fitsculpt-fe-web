# FitSculpt — Master Thesis Full Blueprint
Programa: Mestrado em Engenharia Informática
Especialização: Mobile Computing & Cloud Computing
Duración: 2 años

---

# 1. Título Propuesto

Design and Evaluation of an Adaptive Multimodal Fitness System Based on Behavioral Adherence and Cloud-Based AI Inference

---

# 2. Motivación Científica

Las aplicaciones fitness actuales:

- No integran entrenamiento y nutrición como sistema adaptativo unificado
- No reducen fricción mediante input multimodal
- No ajustan dinámicamente según adherencia real
- No presentan modelos explicables

Existe un gap entre:
- Generación inicial de planes (IA generativa)
- Adaptación dinámica basada en comportamiento real

---

# 3. Pregunta de Investigación Principal

¿Puede un sistema adaptativo multimodal basado en señales de adherencia mejorar la retención y consistencia frente a planes estáticos generados por IA?

---

# 4. Hipótesis

H1:
El grupo con Adaptive Engine activo presenta mayor WCAA que grupo control.

H2:
El uso de input multimodal (voz + imagen) reduce fricción y aumenta frecuencia de logging.

H3:
La combinación de señales multimodales mejora precisión del modelo adaptativo frente a input manual únicamente.

H4:
La visualización prospectiva aumenta la retención frente a grupo control.

---

# 5. Contribuciones Técnicas

## 5.1 Contribución en Mobile Computing

- Diseño de sistema multimodal móvil (voz + imagen)
- Interacción de baja fricción
- Edge vs Cloud inference trade-offs
- Optimización latencia móvil

## 5.2 Contribución en Cloud Computing

- Arquitectura desacoplada AI Gateway
- Procesamiento asíncrono
- Cost-aware AI services
- Escalabilidad independiente del backend core

## 5.3 Contribución en AI

- Modelo formal de adherencia semanal
- Motor adaptativo explicable
- Multimodal fusion model
- Marco de seguridad AI aplicado a fitness

## Contribución adicional

- Diseño de un sistema de visualización prospectiva (Future Self Projection)
  como intervención conductual para reducir churn.

---

# 6. Arquitectura del Sistema

Mobile App
→ BFF
→ Backend Core
→ AI Gateway
→ Voice Service
→ Vision Service
→ Adaptive Engine Worker
→ Metrics Layer

Separación clara:
- Servicio de inferencia
- Servicio de negocio
- Servicio de datos

---

# 7. Modelo Matemático

Se usa:

AdherenceScore A_t
Weight trend ΔP_t
Calorie adjustment ΔCal_t
Training adjustment ΔTrain_t

Con clamps de seguridad y transparencia.

---

# 8. Diseño Experimental Completo

## 8.1 Tipo

Randomized Controlled Trial (RCT)

## 8.2 Grupos

Control:
- Plan estático
- Weekly Review sin ajuste

Tratamiento:
- Adaptive Engine activo
- Ajustes semanales

## 8.3 Duración

12 semanas

## 8.4 Métricas Primarias

- Weekly Consistent Active Users (WCAA)
- Retención W4 y W8

## 8.5 Métricas Secundarias

- Recommendation acceptance rate
- Tiempo medio de registro comida
- Logging frequency

---

# 9. Análisis Estadístico

- t-test comparación medias
- ANOVA si múltiples segmentos
- Kaplan-Meier survival analysis
- Regresión logística retención
- Effect size (Cohen’s d)

---

# 10. Evaluación Multimodal

Comparar:

Grupo Manual
vs
Grupo Voice
vs
Grupo Vision
vs
Grupo Multimodal

Medir:
- Frecuencia logging
- Precisión macros
- Tiempo registro

---

# 11. Seguridad y Ética

- Ajustes pequeños
- No recomendaciones médicas
- Confirmación manual
- Minimización de datos
- GDPR compliant

---

# 12. Cronograma 24 Meses

Semestre 1:
- Diseño arquitectura
- Implementación motor v1

Semestre 2:
- Voice logging
- Integración wearables
- Dataset inicial

Semestre 3:
- Vision logging
- RCT formal
- Recolección datos

Semestre 4:
- Análisis estadístico
- Paper
- Redacción tesis

---

# 13. Resultados Esperados

- Mejora estadísticamente significativa en WCAA
- Reducción fricción logging
- Mayor retención
- Arquitectura replicable en otros dominios

---

# 14. Posible Publicación

- IEEE Transactions on Mobile Computing
- ACM IMWUT
- IEEE Health Informatics