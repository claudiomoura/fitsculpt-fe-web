# FitSculpt — Master Thesis Full Experimental Design
Programa: Ingeniería Informática (Mobile & Cloud Computing)
Duración estimada: 18–24 meses

---

# 1. Título Provisional

"Design and Evaluation of an Adaptive Multimodal Fitness System Based on Behavioral Adherence Signals"

---

# 2. Problema de Investigación

Las apps fitness actuales:
- Generan planes estáticos
- No adaptan dinámicamente según comportamiento real
- No integran señales multimodales (voz, imagen, wearables)

Hipótesis central:

Un sistema adaptativo basado en adherencia semanal mejora:
- Retención
- Consistencia
- Cumplimiento del plan
frente a planes estáticos generados por IA.

---

# 3. Variables

## Independiente
- Uso del Adaptive Engine (ON vs OFF)

## Dependientes
- Weekly Consistent Active Users (WCAA)
- Retención W4 y W8
- AdherenceScore medio
- Recommendation acceptance rate
- Cambio peso (si disponible)

---

# 4. Diseño Experimental

Grupo A (Control):
- Weekly Review informativo
- Sin ajustes automáticos

Grupo B (Tratamiento):
- Weekly Review + ajustes basados en A_t + ΔP_t

Duración:
- 8–12 semanas

---

# 5. Tamaño de Muestra

Estimación preliminar:

Si efecto esperado = +10% en WCAA
Con α = 0.05 y potencia 0.8

Requiere ~200–400 usuarios por grupo.

---

# 6. Métricas Secundarias

- Tiempo medio de registro comida
- Incremento frecuencia logging con voz
- Reducción fricción (comparación manual vs voz)

---

# 7. Análisis Estadístico

- t-test o Mann–Whitney para comparación medias
- Regresión logística para retención
- Análisis de supervivencia (Kaplan–Meier)

---

# 8. Contribución Científica

1. Modelo formal de adherencia semanal
2. Arquitectura multimodal móvil-cloud
3. Evaluación empírica real
4. Marco de seguridad AI aplicado a fitness

---

# 9. Publicación Potencial

- IEEE Mobile Computing
- ACM CHI
- Health Informatics conferences