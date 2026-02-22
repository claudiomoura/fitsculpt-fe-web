# FitSculpt — Full Experimental Protocol
Versión: v1.0
Owner: Research
Estado: Core Thesis Validation Framework

---

# 1. Objetivo Experimental

Evaluar si un sistema adaptativo multimodal con predicción de churn
mejora engagement y retención frente a un sistema sin adaptación predictiva.

---

# 2. Diseño del Estudio

Tipo:
Randomized Controlled Trial (RCT)

Duración:
12 semanas

Unidades experimentales:
Usuarios individuales

---

# 3. Grupos Experimentales

## Grupo A — Control

- Plan generado
- Weekly Review informativo
- Sin Adaptive Engine
- Sin intervención basada en churn
- Sin Future Projection

## Grupo B — Adaptive

- Adaptive Engine activo
- Weekly Review con ajustes
- Sin churn-based intervention
- Sin Future Projection

## Grupo C — Adaptive + Churn

- Adaptive Engine activo
- Churn Prediction activo
- Intervenciones basadas en riesgo
- Sin Future Projection

## Grupo D — Sistema Completo

- Adaptive Engine
- Churn Prediction
- Future Projection
- Multimodal logging

---

# 4. Variables Independientes

- Activación Adaptive Engine
- Activación Churn Model
- Activación Future Projection
- Uso multimodal (voz/imagen)

---

# 5. Variables Dependientes

## Primarias

- Retención W4
- Retención W8
- Retención W12
- WCAA (Weekly Consistent Active Users)

## Secundarias

- Engagement depth
- Recommendation acceptance rate
- Tiempo medio registro
- ChurnProbability media

---

# 6. Métricas Formales

## Retención

Retention_Wk = Usuarios activos en semana k / Usuarios iniciales

## WCAA

Usuario activo ≥ 3 días semana

## Churn Rate mensual

Cancelaciones_mes / Usuarios_activos_inicio_mes

---

# 7. Hipótesis

H1:
Grupo D > Grupo A en retención W12

H2:
Grupo C reduce churn ≥ 10% vs Grupo A

H3:
Future Projection aumenta engagement depth

H4:
Multimodal logging reduce fricción de registro

---

# 8. Tamaño Muestral (Estimación)

Objetivo:
Detectar mejora del 10% en retención.

Con:
α = 0.05
Power = 0.8

Estimación:
200–400 usuarios por grupo.

---

# 9. Análisis Estadístico

- t-test comparación medias
- ANOVA entre 4 grupos
- Kaplan-Meier survival curves
- Regresión logística
- AUC para modelo churn
- Effect size (Cohen's d)

---

# 10. Validación Temporal

- Split temporal (train primeras semanas)
- Test en semanas posteriores
- Evaluación estabilidad modelo

---

# 11. Control de Sesgos

- Randomización automática
- Balance inicial de variables
- No intervención manual
- Seguimiento consistente

---

# 12. Consideraciones Éticas

- Consentimiento informado
- No recomendaciones médicas
- Transparencia de simulación
- Posibilidad de opt-out

---

# 13. Resultados Esperados

- Mejora significativa en retención
- Reducción churn
- Incremento engagement
- Validación modelo predictivo

---

# 14. Contribución Científica

1. Sistema adaptativo evaluado empíricamente
2. Integración de predicción churn + intervención
3. Validación en entorno móvil-cloud real
4. Aplicación B2C + B2B (gimnasios)