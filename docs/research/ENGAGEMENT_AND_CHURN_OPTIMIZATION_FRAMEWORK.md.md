# FitSculpt — Engagement & Churn Optimization Framework
Versión: v1.0
Owner: Research + Product

---

# 1. Problema Central

En plataformas fitness y gimnasios:

- Alta adquisición inicial
- Alta tasa de abandono en 3–6 meses
- Falta de resultados visibles
- Falta de feedback adaptativo

El objetivo del sistema es:

Optimizar engagement sostenido y reducir churn mediante adaptación conductual e intervención motivacional visual.

---

# 2. Modelo General del Sistema

Engagement Engine =
  Adaptive Engine
+ Churn Prediction Model
+ Multimodal Logging
+ Future Projection Engine

---

# 3. Modelo de Churn Prediction

Input:

- AdherenceScore histórico
- Frecuencia semanal
- Variabilidad actividad
- Engagement depth
- Ignored recommendations rate

Output:

- ChurnProbability_t

Si:
ChurnProbability > Threshold

Activar intervención intensiva.

---

# 4. Intervenciones Adaptativas

Nivel 1:
- Ajuste ligero plan

Nivel 2:
- Simplificación plan
- Meta reducida

Nivel 3:
- Future Body Projection

Nivel 4:
- Reenganche personalizado

---

# 5. Future Body Projection Engine

Objetivo:

Permitir al usuario visualizar su cuerpo proyectado a:

- 3 meses
- 6 meses
- 12 meses

Basado en:

- Consistencia estimada
- Déficit/superávit calórico proyectado
- Cambios masa muscular estimados
- Datos antropométricos


## 5.1 Time Horizon Model (3–6–12 meses) 
El sistema proyecta evolución corporal en 3 horizontes temporales: 
- 3 meses → Cambios iniciales visibles 
- 6 meses → Transformación progresiva -
 12 meses → Resultado consolidado 
 
 Cada horizonte depende de: 
 - AdherenceScore promedio 
 - ConsistencyFactor 
 - Déficit/superávit calórico acumulado 
 - Volumen de entrenamiento estimado La proyección no es una promesa, es una simulación basada en adherencia real.

---

# 6. Modelo Matemático Simplificado

BodyProjection(t) =
  CurrentBody
+ f(ΔWeight_t)
+ f(ΔMuscle_t)
+ f(ConsistencyFactor)

Donde:

ConsistencyFactor depende de:
AdherenceScore promedio.

---

# 7. Uso en Investigación

Hipótesis:

H4:
Usuarios que visualizan su proyección futura muestran mayor retención que usuarios sin visualización.

H5:
Visualización combinada con Adaptive Engine reduce churn significativamente.

---

# 8. Aplicación en Gimnasios

El sistema permite:

- Identificar clientes en riesgo
- Aplicar intervención personalizada
- Reducir abandono post-enero

Impacto medible:
- Incremento duración media membresía
- Reducción cancelaciones tempranas

---

# 9. Métricas Clave

- ChurnRate mensual
- Subscription survival curve
- EngagementScore
- Projection interaction rate
- Retention uplift %

---

# 10. Contribución Científica

1. Modelo integrado de predicción de abandono
2. Intervención visual prospectiva basada en datos
3. Evaluación empírica en entorno real
4. Aplicación híbrida B2C + B2B