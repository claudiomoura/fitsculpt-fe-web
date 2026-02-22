# Multimodal Engine Specification

---

# 1. Objetivo

Combinar:

- Voz
- Imagen
- Wearables
- Acciones manuales

En un único evento estructurado.

---

# 2. Ejemplo

Usuario:
- Hace foto
- Dice: "Fue salmón con patatas"

Sistema:

1. Analiza imagen
2. Usa voz para desambiguar
3. Cruza con histórico
4. Estima macros
5. Confirma

---

# 3. Multimodal Confidence Score

FinalScore =
  (VisionConfidence * 0.6)
+ (VoiceConfidence * 0.3)
+ (HistoricalSimilarity * 0.1)

Si FinalScore < 0.65:
  Requiere edición manual.

---

# 4. Integración Wearables

Wearable detecta:
- Carrera 5km

Usuario dice:
"He salido a correr"

Sistema:
- Cruza datos
- Evita duplicado
- Marca como validado

---

# 5. Beneficio Estratégico

Esto crea:

- Dataset multimodal
- Mejor precisión
- Diferenciación fuerte mercado