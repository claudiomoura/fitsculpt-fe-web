# FitSculpt — AI Safety & Risk Management Framework
Versión: v1.0
Owner: Product + AI + Engineering

---

# 1. Objetivo

Garantizar que:

- El Adaptive Engine sea seguro
- Las recomendaciones no generen daño
- El sistema sea explicable
- El uso de IA respete privacidad
- Cumplamos estándares éticos y regulatorios

---

# 2. Principios Fundamentales

1. Ajustes pequeños y graduales
2. Transparencia total
3. Usuario siempre tiene control
4. No sustituimos asesoramiento médico
5. Minimización de datos
6. Explicabilidad antes que complejidad

---

# 3. Clasificación de Riesgos

## 3.1 Riesgo Bajo
- Recomendaciones de hábito
- Ajustes volumen ±5%

## 3.2 Riesgo Medio
- Ajustes calorías
- Estimación macros por imagen

## 3.3 Riesgo Alto (NO PERMITIDO v1)
- Diagnóstico médico
- Ajustes extremos (>15%)
- Recomendaciones clínicas

---

# 4. Límites de Seguridad (Hard Constraints)

Entrenamiento:
- Nunca aumentar volumen >10%
- Nunca reducir volumen >15%
- Nunca aumentar si semana previa fue 0 sesiones

Nutrición:
- Ajuste máximo ±10%
- Nunca ajustar si datos insuficientes
- No hacer recomendaciones clínicas

---

# 5. Transparencia Obligatoria

Cada ajuste debe mostrar:

- Qué cambió
- Por qué cambió
- Qué datos se usaron

Ejemplo:

"Ajustamos +5% porque completaste 3/3 sesiones esta semana."

---

# 6. Control del Usuario

Siempre permitir:

- Ignorar recomendación
- Desactivar Adaptive Engine
- Editar macros sugeridos
- Editar alimentos detectados

Nunca aplicar automáticamente sin confirmación visible.

---

# 7. Privacidad y Retención de Datos

## 7.1 Audio
- No almacenar audio crudo
- Procesamiento temporal
- Guardar solo estructura final

## 7.2 Imagen
- No persistir imagen salvo consentimiento explícito
- Guardar solo datos nutricionales estructurados

## 7.3 Wearables
- Importar solo datos necesarios
- No guardar información innecesaria

---

# 8. Bias & Error Mitigation

Riesgo:
- Modelo visión subestima porciones
- STT interpreta mal alimentos

Mitigación:
- Confidence threshold
- Confirmación obligatoria
- Feedback loop usuario

---

# 9. Auditoría del Motor

Registrar:

- AdherenceScore
- Ajustes aplicados
- Oscilaciones frecuentes
- Casos extremos

Permite:
- Detectar comportamiento anómalo
- Mejorar algoritmo

---

# 10. Modo Seguro (Safe Mode)

Si:
- Datos inconsistentes
- Oscilaciones repetidas
- Error parsing

Sistema entra en:

Safe Mode:
- No ajustar plan
- Mostrar solo recomendaciones de hábito

---

# 11. Cumplimiento Regulatorio

El sistema:

- No es dispositivo médico
- No ofrece diagnóstico
- No sustituye nutricionista o entrenador

Incluir disclaimer visible en onboarding.

---

# 12. Roadmap de Seguridad

v1:
- Clamp ajustes
- Transparencia básica
- Confirmación manual

v2:
- Auditoría automática anomalías
- Detección riesgo abandono extremo

v3:
- Explainable AI panel avanzado