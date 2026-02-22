# FitSculpt — Data Collection & Governance Specification
Versión: v1.0
Owner: Research + Engineering
Estado: Core Thesis Infrastructure Layer

---

# 1. Objetivo

Definir:

- Qué datos se recogen
- Cómo se estructuran
- Cómo se anonimizan
- Cómo se usan en investigación
- Cómo se almacenan
- Cómo se auditan

Garantizar:

- Rigor científico
- Cumplimiento legal
- Reproducibilidad experimental

---

# 2. Principios

1. Minimización de datos
2. Separación identidad ↔ comportamiento
3. Solo datos necesarios para investigación
4. Auditabilidad
5. Reproducibilidad

---

# 3. Tipos de Datos Recogidos

## 3.1 Eventos de Comportamiento

- workout_started
- workout_finished
- food_logged
- tracking_entry_created
- weekly_review_opened
- recommendation_accepted
- recommendation_ignored
- projection_opened

Formato:

{
  user_id_hash,
  event_type,
  timestamp,
  metadata
}

---

## 3.2 Métricas Derivadas (No crudas)

Semanalmente:

- EngagementScore
- AdherenceScore
- ChurnProbability
- RiskLevel
- ΔEngagement

Estas se almacenan como:

{
  user_id_hash,
  week_id,
  engagement_score,
  adherence_score,
  churn_probability,
  risk_level
}

---

## 3.3 Datos Sensibles (No Persistidos)

- Audio crudo (NO persistir)
- Imagen cruda (NO persistir salvo consentimiento)
- Ubicación precisa (NO usar)
- Datos médicos (NO usar)

---

# 4. Anonimización

Separación:

Tabla A:
- user_id
- email
- plan
- gym_id

Tabla B (research dataset):
- user_id_hash (irreversible hash)
- eventos agregados

Nunca cruzar directamente en análisis académico.

---

# 5. Construcción del Dataset de Investigación

Para cada usuario:

Construir dataset longitudinal:

Semana 1:
- Ē_1
- Ā_1
- P(churn_1)
- churn_label

Semana 2:
...

Formato:

user_id_hash | week | Ē_t | ΔE_t | Ā_t | churn_label

---

# 6. Data Quality Control

- Validar eventos duplicados
- Detectar semanas sin datos
- Detectar outliers extremos
- Imputación mínima (preferir exclusión clara)

---

# 7. Versionado del Dataset

Cada experimento debe registrar:

- Versión modelo
- Versión fórmula engagement
- Fecha corte dataset
- Cohorte utilizada

---

# 8. Retención de Datos

- Datos crudos comportamiento: máximo X meses
- Dataset investigación anonimizado: permitido más tiempo
- Opción usuario: borrar datos bajo GDPR

---

# 9. Consentimiento

Durante onboarding:

- Consentimiento para análisis anónimo
- Consentimiento separado para imagen persistente
- Opción opt-out del estudio

---

# 10. Seguridad

- Encriptación en tránsito
- Encriptación en reposo
- Acceso restringido a dataset investigación

---

# 11. Reproducibilidad Científica

Guardar:

- Script de generación dataset
- Configuración modelo
- Seeds aleatorias
- Parámetros experimentales

Permite:
- Repetir experimento
- Validar resultados

---

# 12. Contribución Académica

Este framework demuestra:

- Diseño responsable de sistema AI
- Separación clara producción ↔ investigación
- Aplicación real de data governance en mobile-cloud systems