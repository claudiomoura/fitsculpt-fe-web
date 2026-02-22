# FitSculpt — Churn Prediction Model Specification
Versión: v1.0
Owner: Research + AI
Estado: Core Thesis Component

---

# 1. Objetivo

Diseñar un modelo predictivo que estime la probabilidad de abandono
(ChurnProbability_t) para cada usuario en cada semana t.

El modelo debe:

- Ser explicable
- Ser incremental
- Ser entrenable con datos reales
- Permitir intervención adaptativa

---

# 2. Definición Formal de Churn

Churn = Cancelación de suscripción
    o inactividad > 30 días
    o abandono de membresía gym

Para experimentación:

Binary variable:

Churn_t ∈ {0,1}

---

# 3. Variables de Entrada (Features)

## 3.1 Señales de Adherencia

- AdherenceScore promedio 4 semanas
- Días activos por semana
- Varianza actividad semanal

## 3.2 Señales de Engagement

- Weekly Review opened (sí/no)
- Recommendation acceptance rate
- Voice/Image logging frequency
- Session completion ratio

## 3.3 Señales de Comportamiento

- Tendencia decreciente de actividad
- Número de semanas consecutivas baja adherencia
- Tiempo desde última sesión

## 3.4 Señales Contextuales (si disponibles)

- Plan activo (FREE vs PRO)
- Tipo objetivo (pérdida, ganancia)
- Gym member vs solo app

---

# 4. Modelo Matemático Inicial (Baseline)

Modelo logístico:

P(churn_t) = σ(β0 + β1*A_t + β2*Trend_t + β3*Engagement_t + ...)

Donde:
σ = función sigmoide

---

# 5. Versión v2 (Mejorada)

Modelos posibles:

- Logistic Regression (explicable)
- Random Forest
- Gradient Boosted Trees
- Survival Analysis Model

Recomendado tesis:
Iniciar con modelo explicable y comparar con modelo no lineal.

---

# 6. Umbral de Riesgo

Definir:

Si P(churn_t) > 0.7 → Alto riesgo
Si 0.4–0.7 → Riesgo medio
Si <0.4 → Bajo riesgo

---

# 7. Intervención Basada en Riesgo

Alto riesgo:
- Simplificación plan
- Future Projection motivacional
- Mensaje personalizado

Riesgo medio:
- Ajuste leve plan
- Refuerzo positivo

Bajo riesgo:
- Mantener adaptación normal

---

# 8. Métricas de Evaluación

- AUC-ROC
- Precision / Recall
- F1 Score
- Brier Score
- Survival curve improvement

---

# 9. Validación

- Cross-validation
- Temporal split validation
- Evaluación en cohortes reales

---

# 10. Hipótesis Científica

H1:
El modelo predice churn con AUC > 0.75

H2:
Intervención basada en predicción reduce churn ≥ 10%

---

# 11. Contribución Académica

1. Modelo de churn basado en señales conductuales fitness
2. Integración con sistema adaptativo
3. Evaluación real en entorno móvil-cloud
4. Aplicación B2C + B2B (gimnasios)

---

# 12. Roadmap del Modelo

v1:
- Logistic regression
- Features básicas

v2:
- Feature engineering avanzado
- Modelos no lineales

v3:
- Modelo personalizado por usuario
- Deep learning temporal