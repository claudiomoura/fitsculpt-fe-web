# Adaptive Engine Specification

## Objetivo

Ajustar entrenamiento y nutrición basado en comportamiento real.

---

## Inputs

- Días activos
- Workouts completados
- Consistencia calórica
- Food logs
- Tendencia peso

---

## Output

- Ajuste volumen ±%
- Ajuste intensidad
- Ajuste calorías ±%
- Recomendaciones específicas

---

## Fórmula Base (Ejemplo MVP)

AdherenceScore = (DíasActivos / DíasObjetivo)

If AdherenceScore < 0.5:
  Reduce volumen -10%

If AdherenceScore > 0.8:
  Increase volumen +5%