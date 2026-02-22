# FitSculpt — AI Infrastructure Architecture
Versión: v1.0
Owner: Engineering + AI

---

# 1. Objetivo

Diseñar una arquitectura escalable, modular y económicamente sostenible
para:

- Voice logging
- Vision logging
- Adaptive Engine
- Procesamiento multimodal

---

# 2. Principios

1. AI desacoplado del backend principal
2. Procesamiento asíncrono cuando sea posible
3. Escalabilidad independiente
4. Observabilidad total
5. Cost control desde el diseño

---

# 3. Arquitectura de Alto Nivel

Mobile App
   ↓
BFF Layer
   ↓
Core Backend (Fastify)
   ↓
AI Gateway Layer
   ↓
AI Services (Microservicios)
   ↓
Storage / Metrics

---

# 4. Componentes AI

## 4.1 AI Gateway

Responsable de:
- Rate limiting
- Autenticación
- Logging
- Versionado de modelos

---

## 4.2 Voice Service

Input:
- Audio

Pipeline:
- STT
- LLM estructuración
- Validación schema

Output:
- JSON estructurado

---

## 4.3 Vision Service

Input:
- Imagen

Pipeline:
- Modelo detección alimentos
- Estimación porciones
- Macro inference

Output:
- JSON estructurado + confidence

---

## 4.4 Adaptive Engine Worker

Procesamiento batch semanal:

- Calcular A_t
- Calcular ajustes
- Generar recomendaciones
- Persistir resultados

---

# 5. Procesamiento Síncrono vs Asíncrono

Síncrono:
- Voice parsing rápido (<2s)
- Confirmación usuario

Asíncrono:
- Cálculo macros complejos
- Procesamiento imagen pesado
- Reentrenamiento modelos

---

# 6. Observabilidad

Métricas obligatorias:

- Latencia STT
- Latencia visión
- Coste por request
- Error rate
- Confidence media

---

# 7. Escalabilidad

Separar:

- Backend API
- AI Workers
- Vision Processing

Permite escalar IA sin afectar core.

---

# 8. Cost Control

- Límite uso diario por plan
- Cache resultados frecuentes
- Batch processing para usuarios inactivos