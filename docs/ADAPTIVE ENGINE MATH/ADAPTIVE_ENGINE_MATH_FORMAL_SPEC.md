# FitSculpt — Adaptive Engine (Formal Math Spec) v1.0

Fecha: 2026-02-22  
Owner: Product (PM)  
Estado: Draft para implementación + evaluación (tesis)

> Objetivo: definir un motor adaptativo *explicable* que ajuste entrenamiento y nutrición
> según comportamiento real (adherencia) y resultados (tendencia peso), sin requerir
> datos sensibles y minimizando fricción.

---

## 1) Definiciones y notación

### Horizonte temporal
- Semana `t` (por ejemplo, lunes–domingo).
- Ventana de análisis: últimas `k` semanas (por defecto `k=4`).

### Acciones core (eventos)
En una semana `t`:
- `W_t`: número de sesiones de entrenamiento completadas.
- `F_t`: número de días con al menos 1 food log (comida registrada).
- `T_t`: número de días con al menos 1 tracking (peso/medida/etc).

### Objetivos (targets)
Definidos por el plan o por defaults del onboarding:
- `W*_t`: sesiones objetivo por semana (p.ej. 3).
- `F*_t`: días objetivo con food log (p.ej. 5).
- `T*_t`: días objetivo con tracking (p.ej. 3).

> Nota: si el usuario no tiene plan activo o no configuró objetivos, usar defaults conservadores.
> Esto evita bloquear la adaptación por falta de datos.

---

## 2) Métrica principal: Adherence Score (A_t)

### 2.1 Normalización por componente
Definimos adherencias parciales normalizadas a [0, 1]:

- Adherencia de entrenamiento:
  `aW_t = clamp(W_t / W*_t, 0, 1)`

- Adherencia de nutrición (logging):
  `aF_t = clamp(F_t / F*_t, 0, 1)`

- Adherencia de tracking:
  `aT_t = clamp(T_t / T*_t, 0, 1)`

### 2.2 Combinación ponderada
`A_t = wW * aW_t + wF * aF_t + wT * aT_t`

Pesos recomendados (v1):
- `wW = 0.50` (entreno es el driver principal del producto)
- `wF = 0.30`
- `wT = 0.20`
con `wW + wF + wT = 1`.

> Explicabilidad: siempre mostrar al usuario los 3 componentes (porcentaje) y el total.

---

## 3) Estimación de tendencia de peso (Weight Trend) — opcional pero potente

Si hay suficientes registros de peso en las últimas `k` semanas:
- `p_i`: peso (kg) medido en día `i`
- Estimar tendencia semanal robusta con media móvil o regresión lineal simple.

Definición sencilla (v1, robusta):
- Calcular promedio de peso de semana `t`: `P_t`
- Tendencia:
  `ΔP_t = P_t - P_{t-1}`

Si no hay datos suficientes:
- `ΔP_t = null` (no usar en ajustes calóricos).

---

## 4) Motor de ajuste de entrenamiento

### 4.1 Carga objetivo (Training Load Index)
En vez de depender de 1RM (no lo tienes), trabajamos con un proxy:

- `L_t`: carga semanal planificada (unidades internas del plan)
- `C_t`: carga semanal completada (proxy a partir de sesiones finalizadas)

v1 (si no hay carga detallada): usar solo sesiones:
- `C_t = W_t`
- `L_t = W*_t`

### 4.2 Regla de ajuste semanal (ΔTrain_t)
Definimos un ajuste porcentual de volumen (o dificultad) basado en `A_t`:

- Si `A_t < 0.50` → el usuario está fallando el sistema: **reducir** carga
- Si `0.50 ≤ A_t < 0.80` → mantener
- Si `A_t ≥ 0.80` → progresar suave

Formal:
- `ΔTrain_t =`
  - `-0.10` si `A_t < 0.50`
  - `0.00` si `0.50 ≤ A_t < 0.80`
  - `+0.05` si `A_t ≥ 0.80`

### 4.3 Clamp de seguridad
Para evitar oscilaciones:
- `ΔTrain_t ∈ [-0.15, +0.10]`
- Nunca aumentar si `W_t = 0` (semana sin entreno) aunque `A_t` sea alto por comida/tracking.

### 4.4 Output de entrenamiento (qué cambia)
El motor produce:
- `train_volume_multiplier = 1 + ΔTrain_t`

Aplicación producto (sin entrar a implementación):
- Aumentar/reducir número de series totales semanales, o ejercicios por día, o densidad del plan.
- Mantener ejercicio/estructura cuando sea posible (evitar “plan completamente nuevo”).
- Mostrar explicación: “Subimos +5% porque cumpliste 3/3 entrenos”.

---

## 5) Motor de ajuste de nutrición

### 5.1 Calorie Adherence Proxy (si hay food log)
Si existe ingestión estimada (kcal) por día:
- `K_t`: promedio semanal de kcal registradas
- `K*_t`: objetivo calórico del plan

`aK_t = clamp(1 - |K_t - K*_t| / K*_t, 0, 1)`
(si no hay K*_t, no usar).

### 5.2 Ajuste calórico basado en tendencia de peso (ΔCal_t)
Si `ΔP_t` existe y el objetivo del usuario es conocido:
- Objetivo pérdida: si `ΔP_t` no baja lo esperado → reducir kcal suavemente
- Objetivo ganancia: si `ΔP_t` no sube → aumentar suavemente

v1 (simple y seguro):
- Definir zona muerta:
  - si `|ΔP_t| ≤ 0.2 kg/sem` → sin ajuste
- Si objetivo = pérdida y `ΔP_t > -0.2` → `ΔCal_t = -0.05`
- Si objetivo = ganancia y `ΔP_t < +0.2` → `ΔCal_t = +0.05`
- Clamp: `ΔCal_t ∈ [-0.10, +0.10]`

Si no hay peso:
- usar solo adherencia: si `aF_t < 0.5`, NO ajustar kcal (primero mejorar logging).

### 5.3 Output de nutrición
- `calorie_multiplier = 1 + ΔCal_t`
- Macro split puede mantenerse fijo (v1) o ajustarse solo en PRO (v2).

Explicabilidad:
- “Ajustamos -5% porque el peso no bajó esta semana y registraste suficiente para estimar.”

---

## 6) Selección de recomendaciones (UX)

El motor genera máximo 3 recomendaciones semanales:
1) Una de hábito (adherencia): p.ej. “apunta a 3 días activos”
2) Una de entrenamiento (si aplica): p.ej. “reduce volumen esta semana”
3) Una de nutrición (si aplica): p.ej. “ajusta kcal +5%”

Regla:
- Si `aW_t` es el más bajo, priorizar recomendación de entreno/hábito.
- Si `aF_t` es el más bajo, priorizar reducir fricción de logging (voz/foto) en vez de ajustar calorías.
- Si no hay datos suficientes, recomendar “capturar datos” (sin culpar al usuario).

---

## 7) Métricas de evaluación (producto + tesis)

### 7.1 KPIs principales
- `WCAA`: días activos/semana con 1 acción core (proxy de hábito)
- Retención W1/W4
- Tasa de completitud: `W_t / W*_t`

### 7.2 Métricas específicas del motor
- `A_t` promedio y distribución
- Acceptance rate de recomendaciones
- “Oscillation rate”: % semanas con cambio de signo frecuente en ΔTrain/ΔCal (debe ser bajo)

---

## 8) Diseño experimental (A/B) recomendado

Grupo Control:
- Weekly Review informativo (resumen) SIN ajustes automáticos (solo tips genéricos).

Grupo Treatment:
- Weekly Review + ajustes basados en `A_t` y (si disponible) `ΔP_t`.

Duración mínima:
- 8 semanas (ideal 12) para medir hábito y retención.

Ética:
- Ajustes pequeños (±5–10%) + transparencia + opción “no aplicar”.

---

## 9) Privacidad y mitigación

Datos usados:
- Conteos de acciones (no PII)
- Registros agregados por semana
- Peso opcional (sensible): almacenar y procesar con cuidado, permitir opt-out.

No guardar:
- Audio crudo / fotos crudas sin necesidad (si se usan, retención mínima y control del usuario).
- Prompts completos de IA por defecto (solo métricas agregadas).

---

## 10) Versionado (roadmap del motor)

v1 (este doc):
- Ajuste semanal simple por adherencia + peso opcional
- 3 recomendaciones máximas
- Explicable y estable

v2:
- Personalización de objetivos (W*, F*, T*) por comportamiento
- Ajuste por tipo de sesión (si se capturan señales)
- Macro adjustments (PRO)

v3:
- Modelo predictivo de churn + intervención
- Multi-objetivo (composición corporal) con restricciones