import type {
  TrackingIntelligenceCapabilityId,
  TrackingIntelligenceCompliancePayload,
} from "@/domains/tracking-intelligence/contracts";

type TrackingComplianceRule = {
  blockedClaims: readonly string[];
  safeLanguage: readonly string[];
};

const BASE_COMPLIANCE_RULE: TrackingComplianceRule = {
  blockedClaims: [
    "medical_diagnosis",
    "guaranteed_physical_outcome",
    "hyperrealistic_visual_prediction",
  ],
  safeLanguage: [
    "orientative_tracking_feedback",
    "non_medical_advice",
    "confidence_and_limitations_required",
  ],
};

const BODY_SCAN_COMPLIANCE: TrackingIntelligenceCompliancePayload = {
  disclaimer:
    "Esta lectura orienta seguimiento fisico con tus datos actuales. No ofrece diagnostico medico ni promete precision visual hiperrealista.",
  limitations: [
    "La confianza baja si faltan fotos comparables, check-ins recientes o medidas consistentes.",
    "Las fotos pueden ayudar a contextualizar cambios, pero no sustituyen mediciones estandarizadas.",
    "La version actual prioriza senales deterministas y explicables mientras el modelo AI final sigue pendiente.",
  ],
  safetyNotes: [
    "Usa el resultado para ajustar seguimiento, no para sacar conclusiones clinicas.",
    "Si hay dolor, cambios bruscos o dudas de salud, consulta a un profesional.",
  ],
  medicalAccuracy: "not_medical_advice",
  visualAccuracy: "not_hyperrealistic",
};

const PROJECTION_COMPLIANCE: TrackingIntelligenceCompliancePayload = {
  disclaimer:
    "La proyeccion describe escenarios probables segun consistencia y datos historicos. No garantiza resultados reales ni sustituye criterio profesional.",
  limitations: [
    "El modelo base es determinista y simplifica variaciones biologicas y de contexto.",
    "Una mejora de adherencia no implica una respuesta corporal lineal ni inmediata.",
    "Si faltan senales recientes, la proyeccion pierde confianza y debe leerse con cautela.",
  ],
  safetyNotes: [
    "No ajustes nutricion o volumen de entrenamiento de forma extrema solo por una proyeccion.",
    "Si existe dolor, lesion o sintomas clinicos, prioriza evaluacion profesional.",
  ],
  medicalAccuracy: "not_medical_advice",
  visualAccuracy: "not_hyperrealistic",
};

const RECOMMENDATION_COMPLIANCE: TrackingIntelligenceCompliancePayload = {
  disclaimer:
    "Estas recomendaciones priorizan el siguiente mejor paso con datos parciales. No sustituyen criterio clinico ni garantizan un resultado corporal concreto.",
  limitations: [
    "La logica actual usa reglas deterministas y explicables; el modelo AI final aun no esta conectado.",
    "Una recomendacion puede apoyarse solo en projection, solo en body scan o en ambas fuentes segun la disponibilidad real.",
    "Si faltan check-ins, fotos o adherence data, la recomendacion se degrada a acciones base de recogida de datos y consistencia.",
  ],
  safetyNotes: [
    "Evita cambios agresivos solo por una lectura automatizada.",
    "Ante sintomas, lesion o fatiga persistente, consulta a un profesional antes de ajustar volumen o nutricion.",
  ],
  medicalAccuracy: "not_medical_advice",
  visualAccuracy: "not_hyperrealistic",
};

export function getTrackingIntelligenceCompliance(
  capability: TrackingIntelligenceCapabilityId,
): TrackingIntelligenceCompliancePayload {
  if (capability === "body-scan") return BODY_SCAN_COMPLIANCE;
  if (capability === "projection") return PROJECTION_COMPLIANCE;
  return RECOMMENDATION_COMPLIANCE;
}

export function getTrackingIntelligenceComplianceRule(
  _capability: TrackingIntelligenceCapabilityId,
): TrackingComplianceRule {
  return BASE_COMPLIANCE_RULE;
}
