# Weekly Adaptive Coach API Plan

## 1. Objetivo del documento

Este documento traduce la arquitectura y los contratos del `Weekly Adaptive Coach MVP` a un plan de API orientado a implementacion. Su objetivo es alinear frontend, backend app y modulo de decisioning sobre una superficie de endpoints minima, versionable y auditable.

Principio rector:

- exponer al frontend contratos orientados a producto y estado de pantalla
- mantener entre backend y decisioning contratos de dominio mas estables que la UI
- optimizar para un MVP confiable y trazable, no para una API maximalista

## 2. Principios de diseno de API para este MVP

1. `Backend-for-Frontend primero.` El frontend no debe orquestar multiples llamadas de dominio para reconstruir el loop semanal.
2. `Contratos de producto hacia fuera, contratos de dominio hacia dentro.` La app consume respuestas pensadas para surfaces; el decisioning recibe payloads versionados orientados a reglas.
3. `Una sola decision principal por ciclo.` La API nunca debe devolver multiples decisiones competidoras para una misma semana.
4. `Snapshot antes que mutacion historica.` Los endpoints transaccionales deben crear referencias historicas, no sobrescribir silenciosamente el pasado.
5. `Fallback conservador antes que error opaco.` Si decisioning no puede decidir con confianza suficiente, el sistema debe devolver una salida segura y trazable.
6. `Idempotencia explicita en operaciones criticas.` Especialmente en generacion de plan inicial, envio de check-in y aceptacion de adaptacion.
7. `Observabilidad nativa.` Cada endpoint critico debe emitir analytics, audit o ambos segun corresponda.
8. `Compatibilidad pragmatica.` Evitar versionar toda la API por anticipado; versionar contratos y endpoints solo donde haya riesgo real de evolucion rapida.

## 3. Boundaries recomendados

### 3.1 Frontend-facing / BFF

Responsabilidad recomendada:

- consolidar estado del loop semanal para la app
- aplicar auth, permisos, feature flags y shape de respuesta amigable para UI
- orquestar persistencia operacional, decisioning, analytics y audit

### 3.2 Backend/domain interno

Responsabilidad recomendada:

- gestionar entidades `profile`, `plan`, `weekly-cycle`, `check-in`, `adaptation`, `audit`
- exponer endpoints internos o contratos entre modulos si el backend se separa logicamente

### 3.3 Decisioning

Responsabilidad recomendada:

- recibir `initial_plan_request` y `weekly_adaptation_request`
- devolver output estructurado, no payloads de UI
- no decidir auth, feature flags ni copy final de pantalla fuera del contexto permitido

## 4. Inventario recomendado de endpoints

## 4.1 Endpoints frontend-facing / BFF

### Endpoint: obtener estado del coach

| Campo | Detalle |
| --- | --- |
| Metodo | `GET` |
| Path | `/api/v1/coach/weekly-state` |
| Proposito | Devolver el estado consolidado del loop para home, gating y proximos CTAs |
| Auth | Usuario autenticado |
| Nuevo o extension | `Nuevo` |
| Request principal | query opcional `include_history`, `include_plan_summary` |
| Response principal | `loop_state`, `current_week`, `next_action`, `check_in_due`, `plan_summary`, `latest_adaptation_summary`, `feature_flags` |
| Status / errores | `200`, `401`, `403`, `404` si aun no existe onboarding/plan, `409` si estado inconsistente |
| Idempotencia / retry | Lectura segura; reintentos normales |
| Audit / logging | Analytics de vista de home; log estructurado de `loop_state` y `week_index`, sin audit profundo |

Notas:

- Este endpoint evita que la app reconstruya el estado a partir de `profile`, `plan`, `check-in` y `adaptation` por separado.

### Endpoint: guardar onboarding parcial

| Campo | Detalle |
| --- | --- |
| Metodo | `PATCH` |
| Path | `/api/v1/coach/onboarding-profile` |
| Proposito | Guardar progreso parcial del onboarding coach-level |
| Auth | Usuario autenticado |
| Nuevo o extension | `Extiende` flujo existente de perfil si ya existe `profile`; si no, `Nuevo` |
| Request principal | subset versionado de campos de onboarding, `step_name`, `draft_state` |
| Response principal | `profile_draft`, `completion_state`, `missing_required_fields`, `updated_at` |
| Status / errores | `200`, `400` validacion, `401`, `403`, `409` conflicto de version de perfil |
| Idempotencia / retry | Semiidempotente si el mismo payload se reenvia; usar `profile_version` o `updated_at` para evitar pisadas |
| Audit / logging | Analytics de paso completado; log estructurado de validaciones fallidas |

### Endpoint: completar onboarding y generar plan inicial

| Campo | Detalle |
| --- | --- |
| Metodo | `POST` |
| Path | `/api/v1/coach/onboarding/complete` |
| Proposito | Cerrar onboarding, crear snapshot y disparar generacion de semana 1 |
| Auth | Usuario autenticado |
| Nuevo o extension | `Nuevo`, aunque reutiliza persistencia de perfil |
| Request principal | `contract_version`, campos finales requeridos de onboarding, `client_request_id` |
| Response principal | `profile_snapshot_id`, `initial_plan_week`, `plan_explanation`, `assumptions`, `loop_state` |
| Status / errores | `201`, `400` campos incompletos, `401`, `403`, `409` si ya existe plan inicial activo, `422` safety/deferencia, `503` si decisioning falla sin fallback |
| Idempotencia / retry | Recomendado `Idempotency-Key` o `client_request_id`; misma clave debe devolver misma semana inicial o mismo resultado final |
| Audit / logging | Audit obligatorio de request al motor, snapshot creado, version de reglas y fallback usado; analytics `onboarding_completed` e `initial_plan_generated` |

Notas:

- Conviene que este endpoint sea transaccional desde la perspectiva del frontend.
- Si el sistema ya tiene un endpoint general de perfil, este endpoint debe quedar como acto de cierre del journey coach, no como simple update de perfil.

### Endpoint: aceptar plan inicial

| Campo | Detalle |
| --- | --- |
| Metodo | `POST` |
| Path | `/api/v1/coach/plans/{planWeekId}/accept` |
| Proposito | Confirmar que la semana inicial pasa a activa |
| Auth | Usuario autenticado |
| Nuevo o extension | `Extiende` flujo de planes si existe aceptacion de plan; si no, `Nuevo` |
| Request principal | `client_request_id` opcional, metadata ligera de plataforma |
| Response principal | `plan_week_id`, `state`, `accepted_at`, `next_action` |
| Status / errores | `200`, `401`, `403`, `404`, `409` si la semana ya fue aceptada o expiro |
| Idempotencia / retry | Debe ser idempotente por `planWeekId`; repetir no debe duplicar aceptacion |
| Audit / logging | Analytics `initial_plan_accepted`; log operacional de cambio de estado |

### Endpoint: registrar logging semanal minimo

| Campo | Detalle |
| --- | --- |
| Metodo | `POST` |
| Path | `/api/v1/coach/weeks/{planWeekId}/logs` |
| Proposito | Capturar senales minimas de semana activa |
| Auth | Usuario autenticado |
| Nuevo o extension | `Extiende` tracking/logging existente si ya hay tracking; si no, `Nuevo` |
| Request principal | `log_type`, `training_completed`, `nutrition_signal`, `weight_or_progress`, `wellbeing_note` opcional |
| Response principal | `weekly_log_summary`, `logging_completeness_band`, `updated_at` |
| Status / errores | `201`, `400`, `401`, `403`, `404`, `409` si la semana no esta activa |
| Idempotencia / retry | Si ya existe logging granular, este endpoint puede agregarse como upsert resumido; si no, usar `client_request_id` para evitar duplicados de submit |
| Audit / logging | Analytics `weekly_log_submitted`; no requiere audit profundo salvo si toca datos sensibles de riesgo |

### Endpoint: obtener formulario de weekly check-in

| Campo | Detalle |
| --- | --- |
| Metodo | `GET` |
| Path | `/api/v1/coach/weeks/{planWeekId}/check-in` |
| Proposito | Devolver estado del check-in, payload draft y metadata para renderizar el flujo |
| Auth | Usuario autenticado |
| Nuevo o extension | `Nuevo` |
| Request principal | query opcional `include_draft=true` |
| Response principal | `check_in_state`, `week_context`, `draft_answers`, `required_fields`, `deadline`, `next_cta` |
| Status / errores | `200`, `401`, `403`, `404`, `409` si el check-in aun no corresponde |
| Idempotencia / retry | Lectura segura |
| Audit / logging | Analytics `weekly_check_in_started` cuando corresponda; logs de gating |

### Endpoint: guardar draft de weekly check-in

| Campo | Detalle |
| --- | --- |
| Metodo | `PATCH` |
| Path | `/api/v1/coach/weeks/{planWeekId}/check-in` |
| Proposito | Guardar respuestas parciales sin disparar decisioning |
| Auth | Usuario autenticado |
| Nuevo o extension | `Nuevo` |
| Request principal | subset de respuestas, `draft=true` |
| Response principal | `check_in_id`, `draft_answers`, `completion_state`, `updated_at` |
| Status / errores | `200`, `400`, `401`, `403`, `404`, `409` |
| Idempotencia / retry | Semiidempotente por merge de draft; conviene usar version del draft para prevenir perdida de respuestas |
| Audit / logging | Logs estructurados ligeros; analytics solo si producto necesita abandono/continuacion |

### Endpoint: enviar weekly check-in y generar adaptacion

| Campo | Detalle |
| --- | --- |
| Metodo | `POST` |
| Path | `/api/v1/coach/weeks/{planWeekId}/check-in/submit` |
| Proposito | Validar check-in, invocar decisioning, persistir adaptacion y crear siguiente semana |
| Auth | Usuario autenticado |
| Nuevo o extension | `Nuevo` |
| Request principal | `contract_version`, respuestas completas del check-in, `client_request_id` |
| Response principal | `check_in_id`, `adaptation_summary`, `decision_surface`, `next_plan_week_summary`, `safety_outcome`, `fallback_used` |
| Status / errores | `201`, `400`, `401`, `403`, `404`, `409` si ya fue enviado, `422` inconsistencia o safety deferido, `503` si decisioning y fallback fallan |
| Idempotencia / retry | Critico: mismo `Idempotency-Key` o `client_request_id` debe devolver la misma adaptacion creada; no duplicar semanas futuras |
| Audit / logging | Audit obligatorio completo, analytics `weekly_check_in_completed` y `adaptation_generated`, log de feature flags y versions |

Notas:

- Este es el endpoint mas critico del MVP y debe ser fuertemente trazable.
- Si se prefiere desacoplar submit y polling por performance, eso puede dejarse para una fase posterior; para MVP conviene sincrono si el tiempo de respuesta es aceptable.

### Endpoint: obtener decision del coach

| Campo | Detalle |
| --- | --- |
| Metodo | `GET` |
| Path | `/api/v1/coach/adaptations/{adaptationId}` |
| Proposito | Devolver el detalle visible de la decision, diff y expectativa de la proxima semana |
| Auth | Usuario autenticado |
| Nuevo o extension | `Nuevo` |
| Request principal | query opcional `include_diff=true` |
| Response principal | `primary_decision`, `reason_codes_user_facing`, `evidence_summary`, `training_changes`, `nutrition_changes`, `expected_impact_summary`, `next_plan_week_summary` |
| Status / errores | `200`, `401`, `403`, `404` |
| Idempotencia / retry | Lectura segura |
| Audit / logging | Analytics `adaptation_viewed`; log de render data para debugging UI si hace falta |

### Endpoint: aceptar adaptacion

| Campo | Detalle |
| --- | --- |
| Metodo | `POST` |
| Path | `/api/v1/coach/adaptations/{adaptationId}/accept` |
| Proposito | Confirmar la semana siguiente como plan activo aceptado |
| Auth | Usuario autenticado |
| Nuevo o extension | `Extiende` flujo de planes/aceptacion si ya existe; si no, `Nuevo` |
| Request principal | `client_request_id` opcional |
| Response principal | `adaptation_id`, `next_plan_week_id`, `accepted_at`, `loop_state` |
| Status / errores | `200`, `401`, `403`, `404`, `409` si ya fue aceptada o no corresponde |
| Idempotencia / retry | Debe ser idempotente por `adaptationId` |
| Audit / logging | Analytics `adaptation_accepted`; log operacional de cambio de estado |

### Endpoint: rechazar adaptacion o pedir version mas facil

| Campo | Detalle |
| --- | --- |
| Metodo | `POST` |
| Path | `/api/v1/coach/adaptations/{adaptationId}/feedback` |
| Proposito | Capturar rechazo, necesidad de contexto adicional o pedido de simplificacion extra |
| Auth | Usuario autenticado |
| Nuevo o extension | `Nuevo`, pero puede diferirse a post-MVP si el tiempo aprieta |
| Request principal | `feedback_type`, `rejection_reason`, `free_text` opcional acotado |
| Response principal | `recorded`, `next_cta`, `supporting_copy` |
| Status / errores | `200`, `400`, `401`, `403`, `404`, `409` |
| Idempotencia / retry | Reintentos seguros si se deduplica por `client_request_id` |
| Audit / logging | Analytics `adaptation_rejected`; log de razones para tuning de reglas |

### Endpoint: obtener historial minimo de adaptaciones

| Campo | Detalle |
| --- | --- |
| Metodo | `GET` |
| Path | `/api/v1/coach/adaptations/history` |
| Proposito | Devolver historial ligero de semanas, decisiones y cambios clave |
| Auth | Usuario autenticado |
| Nuevo o extension | `Nuevo` |
| Request principal | query `limit`, `cursor` |
| Response principal | array de `week_index`, `primary_decision`, `accepted`, `summary`, `created_at` |
| Status / errores | `200`, `401`, `403` |
| Idempotencia / retry | Lectura segura |
| Audit / logging | Analytics opcional de vista de historial |

## 4.2 Endpoints backend/domain internos recomendados

Estos endpoints pueden vivir como routers internos del mismo backend o como contratos entre modulos si luego se separa infraestructura.

### Profile domain

| Metodo | Path | Proposito | Nuevo o extension |
| --- | --- | --- | --- |
| `GET` | `/internal/profile/{userId}` | Obtener perfil operativo vivo | `Extiende` perfil existente |
| `PUT` | `/internal/profile/{userId}` | Persistir perfil normalizado del coach | `Extiende` o `Nuevo` |
| `POST` | `/internal/profile/{userId}/snapshots` | Crear `OnboardingProfileSnapshot` | `Nuevo` |

### Planning domain

| Metodo | Path | Proposito | Nuevo o extension |
| --- | --- | --- | --- |
| `POST` | `/internal/plans/initial` | Persistir semana 1 desde output del motor | `Nuevo` |
| `POST` | `/internal/plans/next-week` | Crear siguiente `PlanWeek` desde adaptacion | `Nuevo` |
| `POST` | `/internal/plans/{planWeekId}/accept` | Marcar plan/semana como aceptado | `Extiende` si ya existe aceptacion |
| `GET` | `/internal/plans/{planWeekId}` | Leer plan week detallado | `Extiende` o `Nuevo` |

### Weekly-cycle domain

| Metodo | Path | Proposito | Nuevo o extension |
| --- | --- | --- | --- |
| `POST` | `/internal/weeks/{planWeekId}/log-summary` | Upsert de `WeeklyLogSummary` | `Nuevo` o `Extiende` tracking |
| `GET` | `/internal/weeks/{planWeekId}/state` | Obtener estado operacional de la semana | `Nuevo` |
| `POST` | `/internal/weeks/{planWeekId}/mark-check-in-due` | Transicion por scheduler/job | `Nuevo` |

### Check-in domain

| Metodo | Path | Proposito | Nuevo o extension |
| --- | --- | --- | --- |
| `PATCH` | `/internal/check-ins/{planWeekId}/draft` | Guardar draft de check-in | `Nuevo` |
| `POST` | `/internal/check-ins/{planWeekId}/submit` | Persistir check-in final | `Nuevo` |
| `GET` | `/internal/check-ins/{planWeekId}` | Obtener check-in por semana | `Nuevo` |

### Adaptation domain

| Metodo | Path | Proposito | Nuevo o extension |
| --- | --- | --- | --- |
| `POST` | `/internal/adaptations` | Persistir `AdaptationDecision` | `Nuevo` |
| `GET` | `/internal/adaptations/{adaptationId}` | Leer adaptacion completa | `Nuevo` |
| `POST` | `/internal/adaptations/{adaptationId}/accept` | Confirmar aceptacion operacional | `Nuevo` o `Extiende` plan flow |
| `POST` | `/internal/adaptations/{adaptationId}/feedback` | Persistir feedback de rechazo o friccion | `Nuevo` |

### Audit / analytics domain

| Metodo | Path | Proposito | Nuevo o extension |
| --- | --- | --- | --- |
| `POST` | `/internal/audit/decision-records` | Guardar `DecisionAuditRecord` append-only | `Nuevo` |
| `POST` | `/internal/analytics/events` | Publicar eventos de producto | `Extiende` analytics existente |

## 4.3 Endpoints de decisioning recomendados

### Endpoint: generar plan inicial

| Campo | Detalle |
| --- | --- |
| Metodo | `POST` |
| Path | `/internal/decisioning/initial-plan` |
| Proposito | Generar output estructurado para semana 1 |
| Auth | Service-to-service |
| Nuevo o extension | `Nuevo` |
| Request principal | `contract_version`, `request_type=initial_plan`, `profile_snapshot`, `engine_context` |
| Response principal | `initial_plan_summary`, `reason_codes`, `assumptions`, `safety_outcome`, `fallback_used`, `engine_version`, `ruleset_version` |
| Status / errores | `200`, `400`, `409` version no soportada, `422` input invalido para decidir, `500/503` fallo interno |
| Idempotencia / retry | Reintento seguro si el backend deduplica por request id antes de persistir side effects |
| Audit / logging | Log estructurado de derived features y output; audit lo persiste el backend llamador |

### Endpoint: generar adaptacion semanal

| Campo | Detalle |
| --- | --- |
| Metodo | `POST` |
| Path | `/internal/decisioning/weekly-adaptation` |
| Proposito | Emitir decision principal, diff y explicacion estructurada |
| Auth | Service-to-service |
| Nuevo o extension | `Nuevo` |
| Request principal | `contract_version`, `request_type=weekly_adaptation`, `profile_snapshot`, `current_plan_week`, `weekly_log_summary`, `weekly_check_in`, `engine_context` |
| Response principal | `primary_decision`, `decision_confidence_band`, `safety_outcome`, `reason_codes_internal`, `reason_codes_user_facing`, `training_changes`, `nutrition_changes`, `expected_impact_summary`, `fallback_used` |
| Status / errores | `200`, `400`, `409` version no soportada, `422` no decidible o deferred, `500/503` |
| Idempotencia / retry | El motor puede ser puro; la deduplicacion de side effects debe vivir en backend app |
| Audit / logging | Log obligatorio de input version, derived features, safety result, ruleset version y output |

## 5. Nuevos vs extensiones recomendadas

### Nuevos casi seguros

- `/api/v1/coach/weekly-state`
- `/api/v1/coach/onboarding/complete`
- `/api/v1/coach/weeks/{planWeekId}/check-in`
- `/api/v1/coach/weeks/{planWeekId}/check-in/submit`
- `/api/v1/coach/adaptations/{adaptationId}`
- `/internal/decisioning/initial-plan`
- `/internal/decisioning/weekly-adaptation`
- `decision_audit_records` y sus writes append-only

### Extensiones probables de flujos existentes

- perfil de usuario para guardar onboarding parcial
- planes actuales para aceptar semana inicial o semana adaptada
- tracking/logging actual si ya existe captura de progreso
- analytics existente para publicar eventos del loop

### Supuesto explicito

No se confirma aun si el repo ya tiene conceptos de `plan`, `week`, `profile` o `tracking` compatibles. Por eso la recomendacion es extender donde ya exista un ownership claro y crear endpoints `coach/*` donde el loop semanal necesite una surface propia de producto.

## 6. Estrategia de versionado y compatibilidad

### Recomendacion MVP

1. Mantener version de path solo en la surface frontend: `/api/v1/...`.
2. Mantener `contract_version` obligatorio en payloads entre backend y decisioning.
3. Tratar cambios aditivos como compatibles dentro de `v1`.
4. Tratar cambios de semantics, enums canonicos o required fields como cambio de contrato.
5. Soportar como maximo dos versiones internas del contrato de decisioning durante transiciones cortas.

### Compatibilidad practica

- agregar campos nuevos como opcionales primero
- no reutilizar enums para nuevos significados
- si cambia la taxonomia de decisions o safety, versionar `ruleset_version` y evaluar si tambien requiere `contract_version`
- el frontend no debe inferir logica de negocio de campos opcionales no garantizados

## 7. Consideraciones de idempotencia y retry

### Endpoints criticos

Requieren deduplicacion fuerte:

- `POST /api/v1/coach/onboarding/complete`
- `POST /api/v1/coach/weeks/{planWeekId}/check-in/submit`
- `POST /api/v1/coach/plans/{planWeekId}/accept`
- `POST /api/v1/coach/adaptations/{adaptationId}/accept`

### Recomendacion concreta

1. Aceptar `Idempotency-Key` header o `client_request_id` en body.
2. Guardar huella por usuario + endpoint + clave + resultado final.
3. Si el request ya produjo side effects, devolver la misma respuesta final.
4. Si el procesamiento sigue en curso, devolver `202` o `409` bien explicado solo si realmente hay asincronia.

### Donde no sobredisenar

- los `GET` no necesitan nada especial
- drafts pueden operar con versionado optimista en lugar de idempotencia fuerte
- logs semanales pueden tratarse como upsert si el modelo lo permite

## 8. Requisitos de audit y logging por endpoint critico

| Endpoint | Audit requerido | Logging requerido |
| --- | --- | --- |
| `POST /api/v1/coach/onboarding/complete` | snapshot de perfil, request a motor, output de plan inicial, versions, flags | latency, validation outcome, fallback, user journey state |
| `POST /api/v1/coach/weeks/{planWeekId}/check-in/submit` | request completo, derived features, safety result, decision output, next week id | latency, retries, duplicate prevention, decision type |
| `POST /api/v1/coach/adaptations/{adaptationId}/accept` | no audit profundo salvo cambio de estado historico | state transition, actor, timestamp |
| `POST /api/v1/coach/plans/{planWeekId}/accept` | no audit profundo salvo si crea semana activa historica | state transition, actor, timestamp |
| `/internal/decisioning/*` | no persistir audit final aqui si el backend ya lo hace, pero si logs estructurados completos | engine version, ruleset version, error class, derived features band |

### Regla operativa

Analytics y audit no deben mezclarse. Analytics mide producto; audit reconstruye decisiones.

## 9. Consideraciones de errores y status

### Recomendaciones

1. Usar `400` para errores de validacion de shape.
2. Usar `422` para casos validos sintacticamente pero no procesables por reglas, safety o consistencia de datos.
3. Usar `409` para conflictos de estado o duplicacion no idempotente.
4. Usar `503` cuando falle un componente dependiente y no exista fallback seguro.
5. Incluir `error_code` estable y `user_safe_message` cuando el frontend necesite mostrar feedback.

### Ejemplos de `error_code` utiles

- `onboarding_incomplete`
- `initial_plan_already_exists`
- `check_in_not_due`
- `check_in_already_submitted`
- `decision_deferred_for_safety`
- `decision_input_inconsistent`
- `idempotency_conflict`
- `engine_version_unsupported`

## 10. Secuencia sugerida de implementacion de API

1. Definir contratos internos `decisioning` para plan inicial y adaptacion semanal.
2. Definir endpoints BFF de `onboarding/complete` y `weekly-state`.
3. Definir submit de `weekly check-in` con idempotencia y audit completos.
4. Agregar endpoints de aceptacion y detalle de adaptacion.
5. Agregar feedback/rechazo e historial solo si el tiempo MVP lo permite.

## 11. Preguntas abiertas y decisiones no resueltas

1. El producto actual ya tiene una API de `profile` y `plans` que conviene extender, o el wedge necesita namespace `coach` aislado desde el inicio?
2. El submit de check-in debe ser sincrono en MVP o puede superar el SLA aceptable de UI y requerir polling?
3. La aceptacion de adaptacion debe ser obligatoria para activar la semana siguiente, o se puede autoactivar al mostrar la decision?
4. El rechazo o pedido de `hacerlo mas facil` entra en MVP o se deja como evento/feedback pasivo sin endpoint dedicado?
5. Existe hoy infraestructura estandar de `Idempotency-Key` en backend o habria que introducirla solo para este flujo?
6. El historial minimo de adaptaciones necesita endpoint propio en MVP o puede resolverse desde `weekly-state` con una lista corta?
7. Se necesita API interna para review manual/ops en alpha cerrada o alcanza con audit logs y BI?
8. Si ya existe tracking granular, conviene mapearlo a `WeeklyLogSummary` al vuelo o persistir un resumen materializado?
