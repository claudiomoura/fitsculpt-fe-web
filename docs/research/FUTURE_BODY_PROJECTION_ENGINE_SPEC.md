# FitSculpt — Future Body Projection Engine Spec
Versión: v1.0
Owner: Research + Product
Estado: Draft (defendible para tesis)

## 1) Objetivo
Aumentar motivación y reducir churn permitiendo que el usuario visualice una **proyección** a 3, 6 y 12 meses **si mantiene su nivel de consistencia**.

> La proyección NO es una promesa. Es una simulación basada en adherencia y supuestos explícitos.

## 2) Qué problema resuelve
- El usuario abandona porque no ve progreso o no sabe si “vale la pena”.
- La proyección crea un “future self” tangible que aumenta continuidad y adherencia.

## 3) Inputs permitidos (sin inventar datos)
### Inputs mínimos (ya disponibles o derivados de lo que tienes)
- AdherenceScore promedio (Ā) en ventana de 4 semanas
- ConsistencyFactor derivado de WCAA (días activos/semana)
- Tendencia de peso ΔP (si hay tracking suficiente)
- Señales de actividad (workout sessions completadas)

### Inputs opcionales (si el usuario los provee)
- Objetivo (pérdida / ganancia / recomposición)
- Fotos de progreso (para visualización, no para diagnóstico)

## 4) Outputs (qué ve el usuario)
- 3 “cards” o vistas: 3m / 6m / 12m
- Cada vista muestra:
  - Proyección de cambio (ej. rango estimado) y no un número exacto
  - Mensaje explicativo: “Basado en tu consistencia de las últimas 4 semanas”
  - CTA: “Mejorar proyección” → sugiere acciones simples (2–3)

## 5) Time Horizon Model (3–6–12 meses)
El sistema proyecta evolución corporal en 3 horizontes temporales:
- 3 meses → Cambios iniciales visibles
- 6 meses → Transformación progresiva
- 12 meses → Resultado consolidado

Cada horizonte depende de:
- AdherenceScore promedio
- ConsistencyFactor
- Déficit/superávit calórico acumulado (si hay datos)
- Volumen de entrenamiento estimado

La proyección no es una promesa,
es una simulación basada en adherencia real.

## 6) Reglas de seguridad y ética (obligatorio)
- No mostrar claims médicos (“curar”, “tratar”, etc.)
- No prometer resultados (“vas a verte así seguro”)
- Mostrar incertidumbre: rangos y supuestos
- Permitir desactivar esta feature
- Evitar reforzar dismorfia corporal: copy neutral y centrado en salud/rendimiento

## 7) Gating por plan (propuesta)
- FREE: proyección simple basada en adherencia (sin imagen generativa)
- NUTRI_AI / PRO: proyección con inputs nutrición y explicaciones más ricas
- PRO: versión “future self” más completa (si se decide)

> Assunção: la política exacta de gating se define con negocio; aquí solo se propone.

## 8) Evaluación (para tesis)
Hipótesis:
- H4: usuarios con proyección activa tienen mayor WCAA que control
- H5: usuarios con proyección activa presentan menor churn a 8–12 semanas

Métricas:
- WCAA, Retención W4/W8, churn rate mensual
- “Projection engagement”: apertura, tiempo, repetición
- Acceptance rate de recomendaciones posteriores a proyección

Diseño:
- A/B: Weekly Review + proyección vs Weekly Review sin proyección
- Duración mínima recomendada: 8–12 semanas

## 9) Dependencias
- Métricas definidas (Activation, WCAA, churn)
- Weekly Review estable
- Datos mínimos de acciones core

## 10) No objetivos (para evitar scope creep)
- No diagnóstico de salud
- No “body transformation” garantizada
- No recomendaciones extremas