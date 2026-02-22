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


  # Future Projection Integration

El Adaptive Engine alimenta el Projection Engine mediante:

- Promedio AdherenceScore
- ΔWeight estimado
- ΔMuscle estimado
- Tendencia semanal

Projection(t) =
  CurrentState + f(Consistency, TrainingLoad, CaloricTrend)