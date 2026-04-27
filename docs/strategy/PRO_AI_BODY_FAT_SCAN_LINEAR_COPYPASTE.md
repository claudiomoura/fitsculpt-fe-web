# Linear: PRO AI Body Fat Scan Copy-Paste Load

Este archivo sirve para crear manualmente el backlog del feature `PRO AI Body Fat Scan` cuando no hay acceso directo a la API de Linear.

## Crear primero en Linear

### Project

- `PRO AI Body Fat Scan`

### Epics

1. `EP-01 PRO Scope, Entitlements & Trust`
2. `EP-02 Scan Flow, AI Execution & Result UX`
3. `EP-03 Analytics, QA & Launch Readiness`

### Cycles

1. `C1 - Scope + Contract Freeze`
2. `C2 - PRO Scan Build`
3. `C3 - QA + Launch Readiness`

## Orden exacto de creacion de issues

### 1. BFS-001 - Freeze PRO AI Body Fat Scan promise and eligibility

- Project: `PRO AI Body Fat Scan`
- Epic: `EP-01 PRO Scope, Entitlements & Trust`
- Suggested cycle: `C1 - Scope + Contract Freeze`
- Priority: `P0`
- Labels: `area/product`, `area/ai`, `phase-1`, `type/story`, `surface/trust`, `ready/defined`
- Descripcion: Definir de forma cerrada que promete el feature, para quien existe y bajo que condiciones PRO puede usarse.
- Acceptance criteria:
  - Existe una definicion unica del feature y su promesa.
  - Queda explicito que es PRO-only y las condiciones de elegibilidad.
  - Quedan listados los casos fuera de alcance para esta primera entrega.
- Related docs:
  - `docs/strategy/PRO_AI_BODY_FAT_SCAN_LINEAR_PLAN.md`
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`
  - `docs/strategy/COACH_BODYSCAN_MEALPHOTO_CHECKPOINT_2026-04-10.md`

### 2. BFS-002 - Define AI body-fat scan request and result contract

- Project: `PRO AI Body Fat Scan`
- Epic: `EP-01 PRO Scope, Entitlements & Trust`
- Suggested cycle: `C1 - Scope + Contract Freeze`
- Priority: `P0`
- Labels: `area/backend`, `area/ai`, `type/story`, `risk/dependency`, `ready/defined`
- Descripcion: Versionar el contrato de request/result para alinear UI, orquestacion, persistencia y estados del scan.
- Acceptance criteria:
  - Existe payload versionado de request con inputs requeridos y opcionales.
  - Existe payload versionado de resultado con state, confidence, limitations y metadata visible.
  - El contrato define `insufficient-data`, `blocked` y `completed` de forma consistente.
- Related docs:
  - `docs/strategy/PRO_AI_BODY_FAT_SCAN_LINEAR_PLAN.md`
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`

### 3. BFS-003 - Define trust, disclaimer, and low-confidence policy

- Project: `PRO AI Body Fat Scan`
- Epic: `EP-01 PRO Scope, Entitlements & Trust`
- Suggested cycle: `C1 - Scope + Contract Freeze`
- Priority: `P0`
- Labels: `area/product`, `area/trust-safety`, `type/story`, `risk/safety`, `surface/trust`, `ready/defined`
- Descripcion: Cerrar lenguaje permitido y comportamiento visible para estados de baja confianza, insuficiencia de datos y guidance de usuario.
- Acceptance criteria:
  - Existe copy base no medico y no diagnostico.
  - Los estados `low-confidence` e `insufficient-data` tienen comportamiento visible definido.
  - Queda claro cuando mostrar retry, guidance adicional o deferencia.
- Related docs:
  - `docs/strategy/PRO_AI_BODY_FAT_SCAN_LINEAR_PLAN.md`
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`

### 4. BFS-004 - Define analytics taxonomy and success funnel

- Project: `PRO AI Body Fat Scan`
- Epic: `EP-03 Analytics, QA & Launch Readiness`
- Suggested cycle: `C1 - Scope + Contract Freeze`
- Priority: `P0`
- Labels: `area/analytics`, `area/data`, `type/story`, `ready/defined`
- Descripcion: Especificar la taxonomia de eventos para medir exposure, upgrade, bloqueos, ejecucion, resultado y errores del feature.
- Acceptance criteria:
  - Existe taxonomia para `entrypoint_viewed`, `upgrade_clicked`, `preflight_blocked`, `scan_started`, `scan_completed`, `scan_failed` y `result_viewed`.
  - El funnel permite medir uso PRO vs bloqueos por entitlement o tokens.
  - Se definen propiedades minimas para origen, estado y motivo de bloqueo.
- Related docs:
  - `docs/strategy/PRO_AI_BODY_FAT_SCAN_LINEAR_PLAN.md`
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`

### 5. BFS-005 - Wire PRO entitlement and token preflight for scan execution

- Project: `PRO AI Body Fat Scan`
- Epic: `EP-02 Scan Flow, AI Execution & Result UX`
- Suggested cycle: `C2 - PRO Scan Build`
- Priority: `P0`
- Labels: `area/backend`, `area/ai`, `type/story`, `risk/dependency`, `ready/defined`
- Descripcion: Conectar la ejecucion del scan con la politica real de entitlement y tokens usando la capa compartida de preflight AI.
- Acceptance criteria:
  - La ejecucion no corre sin pasar entitlement, estimacion y validacion de balance.
  - El comportamiento bloqueado por plan o tokens es visible y consistente.
  - La regla se implementa como consumo de la capa compartida, no como logica ad hoc del page flow.
- Related docs:
  - `docs/strategy/PRO_AI_BODY_FAT_SCAN_LINEAR_PLAN.md`
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`
  - `docs/strategy/COACH_BODYSCAN_MEALPHOTO_CHECKPOINT_2026-04-10.md`

### 6. BFS-006 - Finalize insufficient-data and validation rules for scan input

- Project: `PRO AI Body Fat Scan`
- Epic: `EP-02 Scan Flow, AI Execution & Result UX`
- Suggested cycle: `C2 - PRO Scan Build`
- Priority: `P1`
- Labels: `area/product`, `area/frontend`, `type/story`, `risk/data-quality`, `ready/defined`
- Descripcion: Definir el umbral minimo de datos y fotos para correr el scan y la orientacion visible cuando el input no alcanza.
- Acceptance criteria:
  - Quedan definidas validaciones minimas de fotos y contexto requerido.
  - Existe comportamiento visible para input incompleto o no valido.
  - La UI puede orientar al usuario sin inventar resultados.
- Related docs:
  - `docs/strategy/PRO_AI_BODY_FAT_SCAN_LINEAR_PLAN.md`
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`

### 7. BFS-007 - Build PRO entrypoints, locked states, and upgrade path

- Project: `PRO AI Body Fat Scan`
- Epic: `EP-02 Scan Flow, AI Execution & Result UX`
- Suggested cycle: `C2 - PRO Scan Build`
- Priority: `P1`
- Labels: `area/frontend`, `area/product`, `type/story`, `surface/home`, `surface/trust`, `ready/defined`
- Descripcion: Definir y construir entrypoints del feature, estados locked y CTA de upgrade para usuarios no elegibles.
- Acceptance criteria:
  - Existe al menos un entrypoint primario y uno secundario definidos.
  - Los estados locked muestran expectativa correcta y CTA de upgrade.
  - El feature no parece disponible para usuarios no elegibles.
- Related docs:
  - `docs/strategy/PRO_AI_BODY_FAT_SCAN_LINEAR_PLAN.md`
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`

### 8. BFS-008 - Build AI execution orchestration and persisted scan lifecycle

- Project: `PRO AI Body Fat Scan`
- Epic: `EP-02 Scan Flow, AI Execution & Result UX`
- Suggested cycle: `C2 - PRO Scan Build`
- Priority: `P0`
- Labels: `area/frontend`, `area/backend`, `area/ai`, `type/story`, `ready/defined`
- Descripcion: Implementar el lifecycle visible y persistido del scan desde validacion hasta completion o failure.
- Acceptance criteria:
  - Existe flujo consistente `idle -> validating -> blocked/running -> completed/failed`.
  - El resultado o estado final queda persistido y rehidratable.
  - El usuario no pierde contexto si sale y vuelve a entrar.
- Related docs:
  - `docs/strategy/PRO_AI_BODY_FAT_SCAN_LINEAR_PLAN.md`
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`

### 9. BFS-009 - Build scan results UX with confidence and next actions

- Project: `PRO AI Body Fat Scan`
- Epic: `EP-02 Scan Flow, AI Execution & Result UX`
- Suggested cycle: `C2 - PRO Scan Build`
- Priority: `P0`
- Labels: `area/frontend`, `area/design`, `area/ai`, `type/story`, `surface/decision`, `ready/defined`
- Descripcion: Construir la experiencia de resultados con estimacion, confidence, limitations y siguiente accion clara.
- Acceptance criteria:
  - El resultado muestra estimacion, confidence y limitations en el mismo surface.
  - El copy no usa framing medico ni promesas garantizadas.
  - Existe siguiente accion clara despues del resultado.
- Related docs:
  - `docs/strategy/PRO_AI_BODY_FAT_SCAN_LINEAR_PLAN.md`
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`

### 10. BFS-010 - Add retry, failure, and support states for blocked scans

- Project: `PRO AI Body Fat Scan`
- Epic: `EP-02 Scan Flow, AI Execution & Result UX`
- Suggested cycle: `C2 - PRO Scan Build`
- Priority: `P1`
- Labels: `area/frontend`, `area/trust-safety`, `type/story`, `surface/trust`, `ready/defined`
- Descripcion: Cubrir estados de bloqueo, error tecnico, baja confianza y soporte sin mostrar fallback enganoso como si fuera resultado real.
- Acceptance criteria:
  - Existen estados diferenciados para bloqueo por eligibility, bloqueo por tokens, error tecnico y baja confianza.
  - Cada estado tiene CTA coherente: retry, upgrade, corregir fotos o soporte.
  - No se muestra fallback enganoso como si fuera un resultado real.
- Related docs:
  - `docs/strategy/PRO_AI_BODY_FAT_SCAN_LINEAR_PLAN.md`
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`
  - `docs/strategy/COACH_BODYSCAN_MEALPHOTO_CHECKPOINT_2026-04-10.md`

### 11. BFS-011 - Create end-to-end QA matrix and release checklist

- Project: `PRO AI Body Fat Scan`
- Epic: `EP-03 Analytics, QA & Launch Readiness`
- Suggested cycle: `C3 - QA + Launch Readiness`
- Priority: `P0`
- Labels: `area/product`, `area/analytics`, `type/story`, `ready/defined`
- Descripcion: Dejar lista la validacion funcional, de policy y de instrumentacion antes de abrir rollout del feature.
- Acceptance criteria:
  - Existe matriz QA para casos felices, bloqueos, errores y baja confianza.
  - El checklist incluye entitlement, tokens, persistencia, analytics y copy de trust.
  - Se define criterio de go/no-go para rollout.
- Related docs:
  - `docs/strategy/PRO_AI_BODY_FAT_SCAN_LINEAR_PLAN.md`
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`

### 12. BFS-012 - Define launch dashboard, alerts, and post-launch review

- Project: `PRO AI Body Fat Scan`
- Epic: `EP-03 Analytics, QA & Launch Readiness`
- Suggested cycle: `C3 - QA + Launch Readiness`
- Priority: `P1`
- Labels: `area/analytics`, `area/product`, `type/story`, `ready/defined`
- Descripcion: Preparar la operacion del feature en produccion con funnel, alertas y retro post-launch.
- Acceptance criteria:
  - Existe dashboard minimo para funnel, errores y bloqueos.
  - Existen alertas o checks para fallos anormales del flujo.
  - Queda definida una retro post-launch con preguntas concretas de decision.
- Related docs:
  - `docs/strategy/PRO_AI_BODY_FAT_SCAN_LINEAR_PLAN.md`
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`

## Nota practica

- Si Linear importa bien el CSV, usa `docs/strategy/PRO_AI_BODY_FAT_SCAN_LINEAR_IMPORT.csv`.
- Si la importacion requiere mas control, copia estas issues manualmente en este mismo orden.
- Para creacion directa por API sigue bloqueando la falta de `LINEAR_API_KEY` en este entorno.
