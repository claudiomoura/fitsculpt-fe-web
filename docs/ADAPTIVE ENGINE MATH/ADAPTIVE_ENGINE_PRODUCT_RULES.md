# FitSculpt — Adaptive Engine Product Rules
Versión: v1.0  
Relacionado con: ADAPTIVE_ENGINE_MATH_FORMAL_SPEC.md  
Owner: Product  

---

# 1. Objetivo del Documento

Traducir el modelo matemático del Adaptive Engine a reglas claras de producto y UX.

Este documento responde a:

- ¿Cuándo se activa el motor?
- ¿Qué ve el usuario?
- ¿Qué se ajusta exactamente?
- ¿Cómo se explica?
- ¿Cómo se gatea por plan?
- ¿Cómo evitamos comportamientos peligrosos?

---

# 2. Ciclo de Activación

## 2.1 Frecuencia

- El motor se ejecuta 1 vez por semana.
- Idealmente: domingo noche o lunes temprano.
- El usuario lo ve en Weekly Review.

Nunca:
- En medio de una sesión.
- Varias veces en la misma semana.

---

# 3. Reglas de Visualización

El motor puede generar hasta 3 tipos de outputs:

1. Ajuste entrenamiento
2. Ajuste nutrición
3. Recomendación de hábito

Máximo 3 tarjetas visibles en Weekly Review.

---

# 4. Reglas de Entrenamiento (Producto)

## 4.1 Cuándo se muestra ajuste

Mostrar ajuste entrenamiento si:

- Usuario tiene plan activo
- Tiene al menos 1 sesión completada en últimas 2 semanas
- AdherenceScore disponible

Si no:
- Mostrar recomendación de hábito (“intenta 2 días esta semana”)

---

## 4.2 Cómo se comunica

Formato:

"Tus resultados esta semana: 3/3 sesiones completadas.
Aumentamos el volumen +5% para progresar."

Si reducción:

"Completaste 1/3 sesiones.
Reducimos el volumen -10% para facilitar consistencia."

---

## 4.3 Seguridad

Nunca:
- Aumentar si semana previa fue 0 sesiones
- Cambiar estructura completa del plan
- Aumentar >10%

---

# 5. Reglas de Nutrición

## 5.1 Cuándo se ajustan calorías

Solo si:

- Usuario registra comida ≥ 3 días
- Tiene peso registrado ≥ 2 semanas
- Objetivo definido (pérdida / ganancia)

Si no:
- Mostrar recomendación para mejorar logging
- No tocar calorías

---

## 5.2 Comunicación

"Ajustamos tus calorías -5% porque el peso no bajó esta semana y registraste datos suficientes."

Siempre incluir:
- Botón: "No aplicar esta semana"

---

# 6. Reglas de Hábito

Si AdherenceScore < 0.5:

Prioridad máxima → hábito

Ejemplo:

"Esta semana intentemos 2 días activos.
Empieza por algo pequeño."

Nunca culpar.
Siempre tono constructivo.

---

# 7. Gating por Plan

| Feature | FREE | STRENGTH_AI | NUTRI_AI | PRO |
|----------|-------|--------------|-----------|------|
| Weekly Review resumen | ✔ | ✔ | ✔ | ✔ |
| Ajuste entrenamiento | ✖ | ✔ | ✖ | ✔ |
| Ajuste nutrición | ✖ | ✖ | ✔ | ✔ |
| Recomendaciones IA avanzadas | ✖ | ✔ | ✔ | ✔ |

FREE:
- Solo resumen + hábito básico
- CTA upgrade visible

---

# 8. Interacción Usuario

Cada recomendación tiene:

- Aplicar
- Ahora no

Si aplica:
- Estado cambia visualmente
- Se registra evento analytics

Si ignora:
- No se penaliza
- No mostrar repetidamente la misma recomendación 3 semanas seguidas

---

# 9. Eventos de Analytics

Registrar:

- weekly_review_opened
- adjustment_training_applied
- adjustment_nutrition_applied
- recommendation_ignored
- adherence_score_calculated

Sin guardar datos sensibles innecesarios.

---

# 10. Anti-Oscilación

Para evitar comportamiento errático:

- No permitir cambio de signo dos semanas seguidas
- Usar promedio móvil 2 semanas si variabilidad alta
- Clamp ajustes

---

# 11. UX Principles

- Máximo 1 pantalla.
- Máximo 3 decisiones.
- No más de 60 segundos de lectura.
- Siempre explicable en lenguaje simple.
- Mostrar métricas visuales (barra progreso semanal).

---

# 12. Roadmap del Motor (Producto)

v1:
- Ajuste simple ±5–10%

v2:
- Ajuste por tipo de entrenamiento
- Ajuste macro split
- Objetivos dinámicos

v3:
- Predicción abandono
- Intervención personalizada
- Ajuste intra-semana

---

# 13. Principios Éticos

- Nunca hacer recomendaciones médicas.
- Nunca sugerir cambios extremos.
- Permitir opt-out completo del motor.
- Transparencia total.

---

# 14. Resumen Ejecutivo

El Adaptive Engine no reemplaza al usuario.
Lo acompaña.

Es:

- Pequeño
- Seguro
- Explicable
- Medible
- Escalable