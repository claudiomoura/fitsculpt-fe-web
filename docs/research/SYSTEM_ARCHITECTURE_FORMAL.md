# FitSculpt — System Architecture (Formal Chapter)
Versión: v1.0
Owner: Research + Engineering

---

# 1. Introducción

FitSculpt está diseñado como un sistema distribuido mobile–cloud
orientado a:

- Adaptación conductual en tiempo real
- Inferencia AI desacoplada
- Escalabilidad horizontal
- Evaluación experimental reproducible

---

# 2. Arquitectura General

## 2.1 Vista de Alto Nivel

Mobile Client
    ↓
BFF Layer (Next.js App Router)
    ↓
Core Backend (Fastify + Prisma)
    ↓
AI Gateway
    ↓
AI Microservices
    ↓
Database + Analytics Layer

---

# 3. Componentes

## 3.1 Mobile Client

Responsabilidades:

- Captura de eventos
- Voice input
- Image upload
- Visualización de Weekly Review
- Visualización Future Projection

Características:

- Mobile-first UX
- Baja latencia (<2s en acciones core)
- Manejo estados offline limitados

---

## 3.2 BFF Layer (Backend For Frontend)

Rol:

- Proxy seguro
- Normalización de contratos
- Control de sesión (fs_token)
- Protección de rutas

Beneficio:

- Evita exposición directa backend core
- Permite versionado frontend independiente

---

## 3.3 Core Backend

Stack:
- Fastify
- Prisma ORM

Responsabilidades:

- Gestión usuarios
- Planes entrenamiento/nutrición
- Tracking
- Entitlements
- Eventos engagement

No realiza inferencia AI compleja.

---

## 3.4 AI Gateway

Capa intermedia para:

- Rate limiting
- Versionado modelos
- Logging inferencias
- Control coste

Desacopla:

Core business logic ↔ AI services

---

## 3.5 AI Microservices

Separados por responsabilidad:

- Voice Service
- Vision Service
- Engagement Engine
- Churn Prediction Service
- Adaptive Engine Worker
- Projection Engine

Procesamiento:

- Síncrono (voz parsing rápido)
- Asíncrono (proyección, batch churn)

---

## 3.6 Data Layer

Separación:

Operational DB:
- Usuarios
- Planes
- Tracking

Analytics DB:
- Eventos agregados
- EngagementScore
- ChurnProbability
- Cohortes experimentales

Beneficio:
Permite análisis sin afectar producción.

---

# 4. Flujo de Datos

## 4.1 Evento de Usuario

Usuario completa entreno →
Evento registrado →
Actualiza métricas semanales →
Recalcula EngagementScore →
Actualiza ChurnProbability (batch o near real-time)

---

## 4.2 Weekly Review Flow

- Usuario abre Weekly Review
- Backend solicita métricas semanales
- Adaptive Engine genera ajustes
- Projection Engine genera simulación
- UI muestra resultados explicables

---

# 5. Escalabilidad

Separación horizontal:

- Backend API escala por usuarios activos
- AI Workers escalan por inferencias
- Vision service escala independientemente

Permite:

- 10k usuarios
- 100k usuarios
- 1M usuarios

sin reescritura arquitectónica.

---

# 6. Latencia

Objetivos:

- Registro acción < 300ms
- Voice parsing < 2s
- Weekly Review < 1.5s

Proyección pesada → procesamiento asíncrono opcional.

---

# 7. Seguridad

- JWT o cookie httpOnly (fs_token)
- Encriptación TLS
- Separación PII ↔ dataset investigación
- No persistencia audio crudo

---

# 8. Observabilidad

Logs:

- engagement_score_calculated
- churn_prediction_updated
- adaptive_adjustment_applied
- projection_generated

Métricas:

- Latencia inferencia
- Error rate
- Coste AI

---

# 9. Ventajas Arquitectónicas

1. Modularidad clara
2. AI desacoplada
3. Escalable
4. Medible
5. Compatible con RCT
6. Preparado para B2B gimnasios

---

# 10. Contribución en Ingeniería

Este diseño demuestra:

- Arquitectura mobile-cloud distribuida
- Integración AI desacoplada
- Diseño orientado a experimentación
- Gobernanza de datos aplicada
- Escalabilidad planificada

Representa una solución técnica replicable en otros dominios conductuales.