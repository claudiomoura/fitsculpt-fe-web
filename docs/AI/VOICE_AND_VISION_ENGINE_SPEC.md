# FitSculpt — Voice & Vision Engine Specification
Versión: v1.0
Owner: Product + AI
Relacionado con:
- ADAPTIVE_ENGINE_MATH_FORMAL_SPEC.md
- ZERO_FRICTION_LOGGING_SPEC.md

---

# 1. Objetivo Estratégico

Reducir fricción en el registro de datos (entrenamiento y nutrición) mediante:

1. Voice Logging (input por voz natural)
2. Vision Logging (foto de comida)
3. Conversión automática a datos estructurados

Esto aumenta:
- Adherencia (A_t)
- Calidad de datos
- Retención
- Experiencia moderna

---

# 2. Principio de Diseño

El usuario no debe “rellenar formularios”.
Debe poder:

- Hablar
- Tomar una foto
- Confirmar en 1 toque

---

# 3. Voice Logging Engine

## 3.1 Flujo Usuario

Usuario dice:

"Hoy he comido salmón con patatas y una Coca-Cola"

Pipeline:

1. Speech-to-Text
2. NLP parsing
3. Entity extraction
4. Estimación porción
5. Confirmación
6. Persistencia

---

## 3.2 Arquitectura Conceptual

Mobile:
- Captura audio
- Envía audio

AI Layer:
- STT (Speech-to-Text)
- LLM parsing estructurado

Output estructurado:

{
  items: [
    { name: "salmón", quantity: "200g" },
    { name: "patatas", quantity: "150g" },
    { name: "coca-cola", quantity: "330ml" }
  ]
}

Backend:
- Estimación macros
- Confirmación
- Guardado

---

## 3.3 Casos de Uso

- "He salido a correr 30 minutos"
- "Entrené pecho y tríceps"
- "He comido pasta con pollo"

Sistema debe detectar:
- Tipo: comida / actividad
- Cantidad estimada
- Contexto

---

# 4. Vision Logging Engine

## 4.1 Flujo Usuario

Usuario:
- Hace foto a su comida
- Sube imagen

Sistema:

1. Image recognition
2. Food detection
3. Portion estimation
4. Macro estimation
5. Confirmación
6. Persistencia

---

## 4.2 Output estructurado

{
  detected_items: [
    { name: "salmón", estimated_grams: 180 },
    { name: "patatas", estimated_grams: 120 }
  ],
  confidence: 0.82
}

---

## 4.3 UX Regla Crítica

Nunca guardar automáticamente.

Siempre:
- Mostrar resumen editable
- Permitir ajuste rápido

---

# 5. Integración con Adaptive Engine

Voice/Vision afectan:

- aF_t (food adherence)
- Calidad de K_t (calorías)
- Consistencia semanal

No cambian el motor.
Mejoran sus inputs.

---

# 6. Modelo de Confianza

Si confidence < 0.6:
- Solicitar confirmación manual
- No usar para ajustes críticos

---

# 7. Privacidad

- Audio no persistido tras procesamiento (salvo consentimiento)
- Imagen no persistida por defecto
- Solo guardar datos estructurados
- Cumplimiento GDPR-ready

---

# 8. Gating por Plan

| Feature | FREE | STRENGTH_AI | NUTRI_AI | PRO |
|----------|-------|--------------|-----------|------|
| Voice logging básico | ✔ | ✔ | ✔ | ✔ |
| Vision food logging | ✖ | ✖ | ✔ | ✔ |
| Estimación macro avanzada | ✖ | ✖ | ✔ | ✔ |

FREE:
- Puede usar voz pero sin macros automáticas detalladas

---

# 9. Métricas Clave

- voice_log_created
- image_log_created
- confirmation_edit_rate
- friction_reduction (tiempo medio registro)
- increase_food_logging_frequency

---

# 10. Roadmap

v1:
- Voice logging comida simple
- Confirmación manual
- Sin imagen

v2:
- Vision food logging
- Estimación macro básica

v3:
- Multi-modal (voz + imagen)
- Estimación contextual
- Aprendizaje personalizado

---

# 11. Riesgos

- Sobreestimación porciones
- Usuario confía demasiado en estimación
- Coste computacional IA
- Privacidad

Mitigación:
- Transparencia
- Confirmación siempre
- Clamp ajustes en Adaptive Engine