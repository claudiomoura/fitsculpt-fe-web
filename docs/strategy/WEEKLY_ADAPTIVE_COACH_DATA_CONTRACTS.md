# Weekly Adaptive Coach Data Contracts

## 1. Objetivo del documento

Este documento define un borrador implementable de contratos y diseño de datos para el `Weekly Adaptive Coach MVP`. Su objetivo es alinear frontend, backend, decisioning, analytics y trust/safety sobre las mismas entidades, payloads y reglas minimas.

Principio rector:

- si un dato se pide, debe existir una razon clara de uso en generacion de plan, adaptacion, explicacion, safety o analytics

## 2. Principios de diseno de contratos

1. `Versionados desde el dia 1.` Todo payload entre app y decisioning debe declarar version.
2. `Snapshot antes que mutacion.` Las decisiones deben referenciar la foto exacta de datos usada.
3. `Required means required.` No marcar como obligatorio algo que el MVP no usara realmente.
4. `Determinismo primero.` Los campos deben soportar reglas claras antes de aspirar a ML.
5. `Separacion de objetivos.` Operational entities, analytics events y audit records no son la misma cosa.

## 3. Entidades core a introducir o extender

| Entidad / tabla | Tipo sugerido | Proposito |
| --- | --- | --- |
| `user_profiles` | tabla/documento principal | perfil operativo vivo del usuario |
| `onboarding_profile_snapshots` | append-only | snapshot exacto usado para plan inicial |
| `plan_weeks` | tabla principal | semana actual o historica del usuario |
| `weekly_log_summaries` | tabla auxiliar | resumen de ejecucion semanal minima viable |
| `weekly_check_ins` | tabla principal | respuestas estructuradas del check-in |
| `adaptation_decisions` | tabla principal | resultado canonico del motor |
| `adaptation_change_items` | child table / json array | cambios concretos aplicados al plan |
| `decision_reason_items` | child table / json array | reasons estructurados internos y visibles |
| `safety_signals` | tabla auxiliar | senales de riesgo declaradas o inferidas |
| `decision_audit_records` | append-only | trazabilidad completa por plan/adaptacion |
| `analytics_events` | stream o tabla append-only | medicion de producto y loop |
| `engine_versions` | tabla de referencia | versionado de ruleset, prompts y config |

## 4. Entidad: onboarding profile

### Campos requeridos para MVP

| Campo | Tipo sugerido | Requerido | Uso principal |
| --- | --- | --- | --- |
| `user_id` | string/uuid | Si | relacion |
| `primary_goal` | enum | Si | generacion de plan y expectativas |
| `secondary_goal` | enum nullable | No | personalizacion ligera |
| `goal_horizon_weeks` | integer | Si | calibrar agresividad inicial |
| `commitment_level` | enum 1-5 o string canonical | Si | dificultad inicial |
| `age` | integer | Si | safety y contexto |
| `sex` | enum | Si | contexto de coaching y baseline |
| `height_cm` | integer | Si | contexto basal |
| `weight_kg` | decimal nullable | Si, salvo explicit no-weight path | contexto basal y progreso |
| `weight_input_mode` | enum | Si | distinguir exacto vs aproximado vs omitido |
| `training_experience_level` | enum | Si | complejidad inicial |
| `nutrition_experience_level` | enum | Si | precision nutricional inicial |
| `injuries_or_limitations` | array<object> | Si, puede ser vacio | safety y seleccion de plan |
| `days_available_per_week` | integer | Si | frecuencia inicial |
| `session_duration_minutes` | integer | Si | volumen y densidad |
| `equipment_access` | enum or array | Si | seleccion de ejercicios |
| `preferred_training_window` | enum nullable | No | UX y estructura |
| `work_style` | enum | Si | baseline de actividad y fatiga |
| `exercise_preferences` | array<string> | No | adherencia |
| `exercise_avoidances` | array<string> | No | adherencia y safety |
| `nutrition_restrictions` | array<string> | No | estructura nutricional |
| `plan_style_preference` | enum | Si | tono y complejidad del plan |
| `historical_dropout_reason` | enum | Si | riesgo de adherencia |
| `current_confidence_level` | integer 1-5 | Si | intensidad inicial |
| `estimated_daily_steps_band` | enum | No | baseline conductual |
| `average_sleep_hours` | decimal | Si | recovery baseline |
| `self_reported_stress_level` | integer 1-5 | Si | sostenibilidad inicial |
| `meals_per_day_usual` | integer | No | estructura nutricional |
| `alcohol_frequency_band` | enum | No | contexto de adherencia |

### Campos recomendados de metadata

- `profile_version`
- `completed_at`
- `source`
- `locale`
- `consent_version`
- `safety_disclaimer_acknowledged`

### Ejemplo de payload de onboarding completado

```json
{
  "contract_version": "1.0",
  "user_id": "usr_123",
  "primary_goal": "fat_loss",
  "secondary_goal": "energy",
  "goal_horizon_weeks": 16,
  "commitment_level": 4,
  "age": 33,
  "sex": "female",
  "height_cm": 167,
  "weight_kg": 72.4,
  "weight_input_mode": "exact",
  "training_experience_level": "beginner_intermediate",
  "nutrition_experience_level": "beginner",
  "injuries_or_limitations": [
    {
      "area": "knee",
      "severity": "mild",
      "status": "historical",
      "notes": "discomfort with deep lunges"
    }
  ],
  "days_available_per_week": 4,
  "session_duration_minutes": 45,
  "equipment_access": ["gym", "home_dumbbells"],
  "preferred_training_window": "morning",
  "work_style": "sedentary",
  "exercise_preferences": ["machines", "walking"],
  "exercise_avoidances": ["burpees"],
  "nutrition_restrictions": ["lactose_light"],
  "plan_style_preference": "structured",
  "historical_dropout_reason": "time",
  "current_confidence_level": 3,
  "estimated_daily_steps_band": "5k_8k",
  "average_sleep_hours": 6.5,
  "self_reported_stress_level": 4,
  "meals_per_day_usual": 3,
  "alcohol_frequency_band": "social_weekly",
  "completed_at": "2026-04-09T19:20:00Z"
}
```

## 5. Entidad: plan week

### Campos minimos

| Campo | Tipo sugerido | Requerido | Uso |
| --- | --- | --- | --- |
| `plan_week_id` | string/uuid | Si | id primario |
| `user_id` | string/uuid | Si | relacion |
| `week_index` | integer | Si | orden secuencial |
| `state` | enum | Si | workflow semanal |
| `origin_type` | enum | Si | `initial_plan` o `adaptation` |
| `origin_reference_id` | string nullable | No | adaptacion o snapshot origen |
| `training_plan_summary` | json | Si | resumen estructurado entreno |
| `nutrition_plan_summary` | json | Si | resumen estructurado nutricion |
| `weekly_objective` | string | Si | foco visible |
| `assumptions` | array<string> | No | transparencia |
| `generated_by_engine_version` | string | Si | trazabilidad |
| `valid_from` | datetime | Si | inicio de semana |
| `valid_to` | datetime | Si | cierre de semana |
| `accepted_at` | datetime nullable | No | aceptacion del usuario |

### Estados sugeridos de `plan_weeks`

| Estado | Significado |
| --- | --- |
| `draft` | semana creada pero aun no visible al usuario |
| `active` | semana en ejecucion |
| `check_in_due` | se vencio o cerro la semana y espera check-in |
| `adaptation_ready` | existe decision lista para mostrar |
| `accepted` | usuario acepto la semana/adaptacion |
| `expired` | semana historica cerrada |

## 6. Entidad: weekly log summary

### Campos minimos sugeridos

- `plan_week_id`
- `training_sessions_planned`
- `training_sessions_completed`
- `nutrition_adherence_signal_latest`
- `weight_entries_count`
- `latest_weight_kg`
- `wellbeing_note_present`
- `logging_completeness_band`
- `updated_at`

Esta entidad debe ser agregada y simple. El MVP no necesita un modelo hipergranular de sets, reps y macros para decidir una adaptacion semanal creible.

## 7. Entidad: weekly check-in

### Campos requeridos para MVP

| Campo | Tipo sugerido | Requerido | Uso principal |
| --- | --- | --- | --- |
| `check_in_id` | string/uuid | Si | id primario |
| `plan_week_id` | string/uuid | Si | relacion |
| `user_id` | string/uuid | Si | relacion |
| `training_sessions_completed` | integer | Si | adherencia entreno |
| `training_sessions_planned` | integer | Si | ratio adherencia |
| `nutrition_adherence_score` | integer 1-5 | Si | adherencia nutricional |
| `progress_mode` | enum | Si | `weight` o `perceived_progress` |
| `current_weight_kg` | decimal nullable | Condicional | progreso cuantitativo |
| `perceived_progress` | enum nullable | Condicional | progreso cualitativo |
| `energy_score` | integer 1-5 | Si | sostenibilidad |
| `hunger_score` | integer 1-5 | Si | friccion nutricional |
| `recovery_score` | integer 1-5 | Si | sueno/fatiga |
| `stress_score` | integer 1-5 | Si | contexto |
| `pain_level` | enum | Si | safety gate |
| `friction_primary` | enum | Si | causa principal de incumplimiento |
| `friction_note` | string nullable | No | contexto adicional |
| `context_change_flag` | boolean | Si | rediseno potencial |
| `context_change_type` | enum nullable | No | viaje, enfermedad, trabajo, familia, otro |
| `next_week_confidence_score` | integer 1-5 | Si | agresividad siguiente semana |
| `submitted_at` | datetime | Si | trazabilidad |

### Estados sugeridos de `weekly_check_ins`

| Estado | Significado |
| --- | --- |
| `draft` | check-in iniciado pero no enviado |
| `submitted` | completo y listo para decision |
| `processed` | decision generada |
| `flagged` | requiere revision por safety o inconsistencia |

### Ejemplo de payload de weekly check-in

```json
{
  "contract_version": "1.0",
  "check_in_id": "chk_456",
  "plan_week_id": "week_003",
  "user_id": "usr_123",
  "training_sessions_completed": 2,
  "training_sessions_planned": 4,
  "nutrition_adherence_score": 3,
  "progress_mode": "weight",
  "current_weight_kg": 72.0,
  "perceived_progress": null,
  "energy_score": 2,
  "hunger_score": 4,
  "recovery_score": 2,
  "stress_score": 5,
  "pain_level": "expected_soreness",
  "friction_primary": "time",
  "friction_note": "Trabajo muy intenso y llegue tarde toda la semana",
  "context_change_flag": true,
  "context_change_type": "work_peak",
  "next_week_confidence_score": 2,
  "submitted_at": "2026-04-16T20:30:00Z"
}
```

## 8. Contrato de request al decision engine

### Objetivo

Entregar al motor un payload de dominio estable, independiente de la UI, que contenga todo lo necesario para tomar una decision auditable.

### Campos clave del request

| Campo | Tipo | Requerido |
| --- | --- | --- |
| `contract_version` | string | Si |
| `request_type` | enum | Si |
| `user_id` | string | Si |
| `profile_snapshot` | object | Si |
| `current_plan_week` | object | Si |
| `weekly_log_summary` | object | No |
| `weekly_check_in` | object | Si para adaptacion |
| `previous_adaptation_summary` | object nullable | No |
| `engine_context` | object | Si |

### Ejemplo de request de adaptacion

```json
{
  "contract_version": "1.0",
  "request_type": "weekly_adaptation",
  "user_id": "usr_123",
  "profile_snapshot": {
    "snapshot_id": "ops_001",
    "primary_goal": "fat_loss",
    "days_available_per_week": 4,
    "session_duration_minutes": 45,
    "equipment_access": ["gym", "home_dumbbells"],
    "plan_style_preference": "structured",
    "historical_dropout_reason": "time",
    "current_confidence_level": 3,
    "injuries_or_limitations": [
      {
        "area": "knee",
        "severity": "mild",
        "status": "historical"
      }
    ]
  },
  "current_plan_week": {
    "plan_week_id": "week_003",
    "week_index": 3,
    "training_sessions_planned": 4,
    "session_duration_minutes": 45,
    "nutrition_strategy": "structured_meals",
    "weekly_objective": "Cumplir 4 sesiones y sostener deficit moderado"
  },
  "weekly_log_summary": {
    "training_sessions_completed": 2,
    "latest_weight_kg": 72.0,
    "logging_completeness_band": "medium"
  },
  "weekly_check_in": {
    "training_sessions_completed": 2,
    "training_sessions_planned": 4,
    "nutrition_adherence_score": 3,
    "progress_mode": "weight",
    "current_weight_kg": 72.0,
    "energy_score": 2,
    "hunger_score": 4,
    "recovery_score": 2,
    "stress_score": 5,
    "pain_level": "expected_soreness",
    "friction_primary": "time",
    "context_change_flag": true,
    "context_change_type": "work_peak",
    "next_week_confidence_score": 2
  },
  "previous_adaptation_summary": {
    "primary_decision": "adjust",
    "accepted": true
  },
  "engine_context": {
    "engine_version": "ruleset_v1",
    "feature_flags": {
      "decision_engine_ruleset_v1": true,
      "decision_engine_ai_copy_v1": false
    },
    "requested_at": "2026-04-16T20:31:00Z"
  }
}
```

## 9. Entidad: adaptation decision/result

### Campos requeridos para MVP

| Campo | Tipo sugerido | Requerido | Uso |
| --- | --- | --- | --- |
| `adaptation_id` | string/uuid | Si | id primario |
| `check_in_id` | string/uuid | Si | relacion |
| `plan_week_id` | string/uuid | Si | semana evaluada |
| `next_plan_week_id` | string/uuid | Si | semana resultante |
| `primary_decision` | enum | Si | mantener/ajustar/simplificar/redisenar |
| `decision_confidence_band` | enum | Si | high/medium/low |
| `safety_outcome` | enum | Si | clear/constrained/deferred |
| `reason_codes_internal` | array<string> | Si | trazabilidad |
| `reason_codes_user_facing` | array<string> | Si | UI |
| `evidence_summary` | object | Si | inputs clave que explican la decision |
| `decision_rule_path` | string | Si | rama canonica que produjo la salida |
| `candidate_decisions_considered` | array<string> | No | observabilidad de solapamientos |
| `training_changes` | array<object> | No | diff entreno |
| `nutrition_changes` | array<object> | No | diff nutricion |
| `expected_impact_summary` | string | Si | expectativa para la proxima semana |
| `fallback_used` | boolean | Si | observabilidad |
| `fallback_reason` | string nullable | No | si aplica |
| `engine_version` | string | Si | trazabilidad |
| `ruleset_version` | string | Si | trazabilidad |
| `created_at` | datetime | Si | timestamp |

### Cambio item sugerido

| Campo | Tipo | Ejemplo |
| --- | --- | --- |
| `domain` | enum | `training` |
| `change_type` | enum | `reduce_frequency` |
| `from_value` | string/number/json | `4` |
| `to_value` | string/number/json | `3` |
| `reason_code` | string | `time_constraint` |
| `user_visible_summary` | string | `Bajamos de 4 a 3 sesiones para recuperar cumplimiento.` |

### Ejemplo de adaptation result

```json
{
  "contract_version": "1.0",
  "adaptation_id": "adp_789",
  "check_in_id": "chk_456",
  "plan_week_id": "week_003",
  "next_plan_week_id": "week_004",
  "primary_decision": "simplify",
  "decision_confidence_band": "high",
  "safety_outcome": "constrained",
  "reason_codes_internal": [
    "low_training_adherence",
    "time_constraint",
    "high_stress",
    "low_next_week_confidence"
  ],
  "reason_codes_user_facing": [
    "Tu semana tuvo menos tiempo real del esperado.",
    "El estres y la recuperacion hicieron el plan actual dificil de sostener.",
    "La prioridad ahora es recuperar consistencia, no empujar mas carga."
  ],
  "decision_rule_path": "safety_clear>structural_mismatch_false>simplify_threshold_met",
  "candidate_decisions_considered": [
    "adjust",
    "simplify"
  ],
  "evidence_summary": {
    "training_adherence_ratio": 0.5,
    "nutrition_adherence_score": 3,
    "stress_score": 5,
    "recovery_score": 2,
    "next_week_confidence_score": 2
  },
  "training_changes": [
    {
      "domain": "training",
      "change_type": "reduce_frequency",
      "from_value": 4,
      "to_value": 3,
      "reason_code": "time_constraint",
      "user_visible_summary": "Bajamos de 4 a 3 sesiones esta semana."
    },
    {
      "domain": "training",
      "change_type": "reduce_duration",
      "from_value": 45,
      "to_value": 35,
      "reason_code": "high_stress",
      "user_visible_summary": "Acortamos la duracion para que el plan vuelva a ser cumplible."
    }
  ],
  "nutrition_changes": [
    {
      "domain": "nutrition",
      "change_type": "increase_weekend_flexibility",
      "from_value": "standard",
      "to_value": "higher_flexibility",
      "reason_code": "adherence_friction",
      "user_visible_summary": "Simplificamos la estructura nutricional del fin de semana."
    }
  ],
  "expected_impact_summary": "Esperamos que puedas volver a cumplir mejor la proxima semana con menos friccion.",
  "fallback_used": false,
  "fallback_reason": null,
  "engine_version": "decision_engine_v1",
  "ruleset_version": "ruleset_v1.0",
  "created_at": "2026-04-16T20:31:01Z"
}
```

## 10. Modelos de estado y transiciones utiles

### Estado del loop semanal

| Estado | Entrada | Salida esperada |
| --- | --- | --- |
| `onboarding_in_progress` | usuario inicia perfil | `onboarding_completed` |
| `plan_initial_ready` | plan inicial generado | `plan_active` |
| `plan_active` | semana en ejecucion | `check_in_due` |
| `check_in_due` | ventana de check-in abierta | `check_in_submitted` |
| `check_in_submitted` | payload completo recibido | `adaptation_generated` |
| `adaptation_generated` | decision lista para UI | `adaptation_accepted` |
| `adaptation_accepted` | usuario acepta siguiente semana | `plan_active` de semana siguiente |

### Estado de safety

| Estado | Significado |
| --- | --- |
| `clear` | no hay constraint especial |
| `constrained` | se permiten cambios conservadores |
| `deferred` | no se debe adaptar normalmente; se pide revisar contexto o seguir guidance conservadora |

## 11. Reglas de validacion y constraints

### Onboarding

- `age` debe estar dentro de un rango permitido por producto.
- `days_available_per_week` debe ser `1-7`.
- `session_duration_minutes` debe ser mayor a cero y razonable para MVP.
- `current_confidence_level` y escalas similares deben usar una sola convencion `1-5`.
- si `weight_input_mode = omitted`, no exigir `weight_kg`, pero marcar menor precision de progreso.
- `injuries_or_limitations` puede venir vacio, pero nunca nulo ambiguo si el contrato lo evita.

### Weekly check-in

- `training_sessions_completed` no puede ser mayor que `training_sessions_planned` sin una nota o normalizacion.
- si `progress_mode = weight`, `current_weight_kg` es requerido.
- si `progress_mode = perceived_progress`, `perceived_progress` es requerido.
- `pain_level` debe mapearse a taxonomy canonica, no texto libre.
- `friction_primary` debe aceptar una sola causa principal en MVP para simplificar rules.
- `context_change_type` es requerido solo si `context_change_flag = true`.

### Adaptation result

- `primary_decision` debe ser exactamente una de cuatro salidas canonicas.
- `primary_decision` solo puede ser `maintain`, `adjust`, `simplify` o `redesign`.
- cada change item debe ser coherente con `primary_decision` y con el ruleset vigente.
- `decision_confidence_band` no puede faltar, incluso si no se muestra completa al usuario.
- si `fallback_used = true`, `fallback_reason` es obligatorio.
- `decision_rule_path` es obligatorio para toda decision generada por ruleset v1.
- si `candidate_decisions_considered` incluye `adjust` y `simplify`, la salida final debe respetar la precedencia del ruleset y no quedar ambigua en audit.

### Fallback reasons canonicos v1

Usar exactamente uno de estos valores cuando `fallback_used = true`:

- `physical_risk`
- `data_incomplete`
- `signals_conflict`
- `low_confidence`
- `structural_mismatch`

## 12. Campos de explainability y audit

### Obligatorios por decision

- `engine_version`
- `ruleset_version`
- `contract_version`
- `input_snapshot_id`
- `derived_features_snapshot`
- `reason_codes_internal`
- `reason_codes_user_facing`
- `decision_rule_path`
- `safety_outcome`
- `fallback_used`
- `fallback_reason`
- `created_at`

### Estructura sugerida de `decision_audit_records`

```json
{
  "audit_id": "aud_001",
  "user_id": "usr_123",
  "plan_week_id": "week_003",
  "check_in_id": "chk_456",
  "adaptation_id": "adp_789",
  "contract_version": "1.0",
  "engine_version": "decision_engine_v1",
  "ruleset_version": "ruleset_v1.0",
  "feature_flag_snapshot": {
    "decision_engine_ruleset_v1": true,
    "decision_engine_ai_copy_v1": false
  },
  "input_snapshot_refs": {
    "profile_snapshot_id": "ops_001",
    "current_plan_week_id": "week_003",
    "weekly_check_in_id": "chk_456"
  },
  "derived_features_snapshot": {
    "training_adherence_ratio": 0.5,
    "stress_band": "high",
    "recovery_band": "low",
    "data_completeness_band": "medium",
    "strain_signal_count": 3,
    "structural_mismatch": false,
    "signals_conflict_flag": false
  },
  "safety_evaluation_result": {
    "outcome": "constrained",
    "triggered_signals": []
  },
  "decision_rule_path": "safety_clear>structural_mismatch_false>simplify_threshold_met",
  "decision_output_ref": "adp_789",
  "created_at": "2026-04-16T20:31:01Z"
}
```

## 13. Contrato draft de analytics events

### Campos base para todos los eventos

La taxonomia canonica de analytics vive en esta seccion. Si otros docs usan nombres abreviados o de UX, este documento manda para instrumentacion, QA y dashboards.

| Campo | Tipo | Requerido |
| --- | --- | --- |
| `event_name` | string | Si |
| `event_id` | string/uuid | Si |
| `actor` | enum | Si |
| `user_id` | string/uuid nullable | Condicional |
| `session_id` | string | No |
| `occurred_at` | datetime | Si |
| `surface` | enum/string | Si |
| `week_index` | integer nullable | No |
| `contract_version` | string | Si |
| `app_version` | string nullable | No |
| `platform` | enum | Si |

### Eventos core MVP

| Evento | Cuando dispara | Propiedades minimas especificas |
| --- | --- | --- |
| `onboarding_started` | inicio de onboarding | `source` |
| `onboarding_step_completed` | fin de cada paso | `step_name`, `completion_time_seconds` |
| `onboarding_completed` | onboarding completo | `duration_seconds`, `required_fields_completed` |
| `initial_plan_generated` | plan semana 1 listo | `engine_version`, `ruleset_version`, `fallback_used` |
| `initial_plan_accepted` | usuario acepta plan inicial | `week_index` |
| `weekly_log_submitted` | guardado de logging minimo | `log_type`, `week_index` |
| `weekly_check_in_started` | entra al check-in | `week_index` |
| `weekly_check_in_completed` | envia check-in | `week_index`, `completion_time_seconds` |
| `adaptation_generated` | decision creada | `primary_decision`, `decision_confidence_band`, `safety_outcome`, `engine_version`, `ruleset_version` |
| `adaptation_viewed` | usuario ve decision | `primary_decision`, `week_index` |
| `adaptation_accepted` | usuario acepta siguiente semana | `primary_decision`, `week_index` |
| `adaptation_rejected` | usuario rechaza o pide otra opcion | `primary_decision`, `rejection_reason` |
| `safety_fallback_triggered` | engine cae a modo conservador | `trigger_type`, `week_index` |

Reglas minimas de instrumentacion:

- `actor` debe ser `user`, `system` o `admin` segun quien origina el evento.
- `event_name` debe usar exactamente la nomenclatura canonica de esta tabla para evitar funnels duplicados.
- Si UX necesita labels mas amigables, se resuelven en copy o tracking plans derivados, no cambiando el nombre canonico del evento.

### Ejemplo de evento analytics

```json
{
  "event_name": "adaptation_generated",
  "event_id": "evt_001",
  "user_id": "usr_123",
  "occurred_at": "2026-04-16T20:31:02Z",
  "surface": "decision",
  "week_index": 3,
  "contract_version": "1.0",
  "platform": "ios",
  "primary_decision": "simplify",
  "decision_confidence_band": "high",
  "safety_outcome": "constrained",
  "engine_version": "decision_engine_v1",
  "ruleset_version": "ruleset_v1.0"
}
```

## 14. Consideraciones de privacidad y datos sensibles

### Datos sensibles o sensibles por contexto

- peso actual e historial de peso
- lesiones o limitaciones declaradas
- indicadores de estres, sueno y bienestar
- notas libres donde el usuario puede volcar informacion sensible accidentalmente

### Recomendaciones MVP

1. Minimizar texto libre. Usar enums y escalas siempre que sea posible.
2. Separar PII operativa de logs de auditoria cuando sea viable.
3. No enviar mas datos de los necesarios al proveedor LLM si se usa IA para copy.
4. Definir retencion de audit logs y eventos desde el inicio.
5. Evitar claims clinicos en campos, labels y outputs.
6. Marcar claramente que el producto no reemplaza criterio medico.

### Practicas de contrato recomendadas

- `notes` y campos abiertos deben ser opcionales y con longitud maxima.
- payloads hacia analytics no deben duplicar texto libre sensible salvo necesidad fuerte.
- si se usa proveedor externo de IA, preferir payloads resumidos y redacted.

## 15. Preguntas abiertas de contrato

1. El producto necesita almacenar historial completo de peso desde el MVP, o alcanza con ultimo valor + snapshot semanal?
2. `sex` y futuros campos como ciclo menstrual deben modelarse ya pensando expansion, o mantener MVP estricto y extender luego?
3. Conviene persistir `training_plan_summary` y `nutrition_plan_summary` como JSON flexible o con tablas mas estructuradas desde el dia 1?
4. El rechazo de una adaptacion requiere contrato explicito de motivos en MVP, o puede esperar a phase 2?
5. Que parte exacta de `decision_confidence_band` sera visible al usuario en MVP y que parte quedara solo para observabilidad interna?
6. Se necesita un identificador de `cohort` o `experiment_bucket` en entidades operativas, o solo en analytics y audit?

## 16. Decisiones recomendadas de datos

1. Mantener contratos `1.0` simples, versionados y centrados en el loop semanal.
2. Usar snapshots historicos para onboarding y decisiones, no solo perfil mutable vivo.
3. Modelar `adaptation_decisions` como entidad propia, no solo como diff incrustado en el plan siguiente.
4. Tratar reason codes, safety outcome y confidence band como campos de primer nivel, no metadata opcional.
5. Mantener analytics y audit separados para proteger claridad operativa y privacidad.
