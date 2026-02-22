# FitSculpt — Engagement Score Model Specification
Versión: v1.0  
Owner: Research + Product  
Estado: Core Thesis Component (features → churn → intervención)

---

## 1) Objetivo

Definir un EngagementScore semanal `E_t` (0 a 1) que mida el “enganche real”
de un usuario con FitSculpt, basado en señales conductuales observables.

El score debe ser:
- Explicable
- Estable (sin saltos erráticos)
- Accionable (dispara intervenciones)
- Compatible con B2C y Gym (B2B)

---

## 2) Definición: qué es engagement en FitSculpt

Engagement no es “abrir la app”.
Engagement = **hacer acciones que generan progreso**.

Acciones core (ya definidas):
- Entreno completado (workout session finish)
- Registro de comida (food log)
- Tracking (peso/medidas)
- Revisión semanal (Weekly Review)

---

## 3) Variables de entrada (features semanales)

Para semana `t`:

### 3.1 Consistencia (habit signals)
- `D_t`: días con al menos 1 acción core (0..7)
- `W_t`: sesiones de entreno completadas
- `F_t`: días con food log
- `T_t`: días con tracking

### 3.2 Profundidad (depth signals)
- `S_t`: nº total de acciones core (conteo total)
- `R_t`: Weekly Review abierto (0/1)
- `A_t`: tasa de aceptación de recomendaciones (0..1) (si aplica)

### 3.3 Fricción / facilidad (friction signals) *(opcional)*
- `V_t`: # voice logs
- `I_t`: # image logs
- `TimeLog_t`: tiempo medio para registrar (si se mide)

---

## 4) Normalización (todo a [0,1])

Definimos normalizaciones:

- `eD_t = clamp(D_t / 7, 0, 1)`
- `eW_t = clamp(W_t / W*_t, 0, 1)`  (si hay objetivo W*; si no, usar W* = 3 por defecto)
- `eF_t = clamp(F_t / F*_t, 0, 1)`  (default 5)
- `eT_t = clamp(T_t / T*_t, 0, 1)`  (default 3)
- `eR_t = R_t` (0 o 1)
- `eA_t = A_t` (0..1; si no existe, usar null y reponderar)

Para profundidad:
- `S*_t`: objetivo de acciones semanales (default: 10)
- `eS_t = clamp(S_t / S*_t, 0, 1)`

---

## 5) EngagementScore semanal (E_t)

### 5.1 Fórmula base (v1, explicable)

`E_t = wD*eD_t + wW*eW_t + wF*eF_t + wT*eT_t + wR*eR_t + wS*eS_t`

Pesos recomendados (suman 1):
- `wD = 0.25` (habit/días activos)
- `wW = 0.25` (entreno)
- `wF = 0.20` (nutrición)
- `wT = 0.10` (tracking)
- `wR = 0.10` (Weekly Review)
- `wS = 0.10` (profundidad global)

> Explicabilidad: mostrar al usuario 3 barras: Consistencia, Entreno, Nutrición,
> y un “score total” (no hace falta mostrar fórmula).

---

## 6) Suavizado temporal (para estabilidad)

Para evitar que 1 semana mala destruya el score:

`Ē_t = α * E_t + (1-α) * Ē_{t-1}`

Recomendación:
- `α = 0.6` (da más peso a la semana actual pero suaviza)

Este `Ē_t` es el score usado para churn prediction.

---

## 7) Engagement Trend (Tendencia)

Define tendencia semanal:

`ΔE_t = Ē_t - Ē_{t-1}`

Esto es clave para detectar caída.

---

## 8) Zonas de riesgo (para reglas de producto)

- `Ē_t ≥ 0.70` → Engagement Alto
- `0.40 ≤ Ē_t < 0.70` → Medio
- `Ē_t < 0.40` → Bajo

Regla adicional:
- Si `ΔE_t < -0.15` → caída brusca → riesgo inmediato

---

## 9) Uso del score (sistema completo)

### 9.1 Alimenta Churn Prediction
`P(churn_t) = f(Ē_t, ΔE_t, Ā_t, ... )`

### 9.2 Alimenta Adaptive Engine
- Si engagement bajo → simplificar plan y reducir carga
- Si engagement alto → progresión suave

### 9.3 Dispara intervenciones
- Bajo + caída → Future Projection + objetivos más pequeños
- Medio + caída → refuerzo positivo + ajustes leves
- Alto → mantener

---

## 10) Evaluación (para tesis)

Hipótesis:
- H_eng1: EngagementScore predice churn (AUC > 0.75 junto con otras features)
- H_eng2: Intervenciones que elevan Ē_t elevan retención W8/W12

Validación:
- Correlación Ē_t con retention y churn
- Model comparison: churn model con vs sin Ē_t

---

## 11) Privacidad

El score usa:
- Conteos de eventos agregados por semana
- No requiere PII
- No guarda audio ni imagen cruda (solo conteo)

---

## 12) Versionado (roadmap)

v1:
- Score por eventos core agregados

v2:
- Segmentar por tipo usuario (Gym vs solo app)
- Añadir calidad de sesión (si existe)

v3:
- Modelos temporales (LSTM/Transformer) para engagement sequence