# PRO AI Body Fat Scan: Linear Load Plan

## 1. Objetivo

Este documento deja una carga de backlog lista para Linear para el feature `PRO AI Body Fat Scan` sin depender de API auth ni de automatizaciones externas.

Reglas de uso:

- `docs/strategy/` sigue siendo la fuente de verdad de estrategia.
- `Linear` pasa a ser la fuente de verdad de secuenciacion, ownership y estado.
- Esta carga asume que la base modular de `Body Scan` ya existe y que el trabajo nuevo es de productizacion, gating PRO, ejecucion AI y release.

## 2. Contexto ya resuelto en el repo

El backlog no arranca de cero. Se apoya en trabajo ya documentado en `BODY_SCAN_LINEAR_EPIC.md` y el checkpoint del 2026-04-10.

Base disponible:

- capacidad modular de `Body Scan` ya existente;
- contrato persistido y `status envelope`;
- captura guiada ya integrada;
- analytics base de capability ya presentes;
- politica AI fail-closed ya establecida;
- gating de planes y tokens ya existente a nivel plataforma.

Implicacion:

- no crear historias que vuelvan a discutir arquitectura ya cerrada;
- enfocar el backlog en feature delivery real de `PRO AI Body Fat Scan`.

## 3. Proyecto recomendado en Linear

| Campo | Valor recomendado |
| --- | --- |
| Project | `PRO AI Body Fat Scan` |
| Team owner | `App` |
| Supporting teams | `Product`, `Intelligence` |
| Horizonte | 3 ciclos cortos |
| Goal | lanzar un flujo PRO-only de body fat scan con UX confiable, politica AI consistente y release controlado |

## 4. Epics a crear

### EP-01 PRO Scope, Entitlements & Trust

Objetivo: congelar la promesa de producto, las reglas de elegibilidad PRO, el contrato AI y las reglas de confianza/compliance.

Incluye:

- promesa exacta del feature;
- quien puede usarlo y quien no;
- contrato de request/result;
- politicas de confianza, disclaimer y baja confianza;
- taxonomia analytics para medir adopcion y calidad.

### EP-02 Scan Flow, AI Execution & Result UX

Objetivo: implementar el flujo visible de entrada, ejecucion, persistencia, resultados y estados de error/reintento.

Incluye:

- entrypoints y estados bloqueados/upgrade;
- preflight PRO/tokens;
- orquestacion AI y lifecycle persistido;
- resultados con confianza y siguiente accion;
- manejo visible de errores y reintentos.

### EP-03 Analytics, QA & Launch Readiness

Objetivo: asegurar que el feature se pueda lanzar, medir y operar sin ambiguedad.

Incluye:

- funnel y dashboard de lanzamiento;
- alertas y monitoreo;
- QA matrix E2E;
- checklist de release;
- retro post-launch.

## 5. Ciclos recomendados

| Cycle | Objetivo |
| --- | --- |
| `C1 - Scope + Contract Freeze` | definicion, contrato, trust, analytics |
| `C2 - PRO Scan Build` | build del flujo visible y la ejecucion AI |
| `C3 - QA + Launch Readiness` | QA, observabilidad, rollout, seguimiento |

Regla:

- no abrir mas de estos 3 ciclos al inicio;
- cerrar `C1` antes de comprometer rollout serio en `C2`.

## 6. Backlog de issues listo para Linear

### BFS-001 - Freeze PRO AI Body Fat Scan promise and eligibility

- Epic: `EP-01 PRO Scope, Entitlements & Trust`
- Cycle: `C1 - Scope + Contract Freeze`
- Priority: `P0`
- Labels: `area/product`, `area/ai`, `phase-1`, `type/story`, `surface/trust`, `ready/defined`
- Outcome: deja cerrada la promesa del feature, el segmento elegible y el non-target para que el resto del backlog no discuta alcance otra vez.
- Acceptance criteria:
  - existe una definicion unica de que hace exactamente `PRO AI Body Fat Scan`;
  - queda explicito que el feature es `PRO-only` y bajo que condiciones de elegibilidad corre;
  - quedan listados los casos fuera de alcance para esta primera entrega.
- Dependencies: ninguna.
- Related docs:
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`
  - `docs/strategy/COACH_BODYSCAN_MEALPHOTO_CHECKPOINT_2026-04-10.md`

### BFS-002 - Define AI body-fat scan request and result contract

- Epic: `EP-01 PRO Scope, Entitlements & Trust`
- Cycle: `C1 - Scope + Contract Freeze`
- Priority: `P0`
- Labels: `area/backend`, `area/ai`, `type/story`, `risk/dependency`, `ready/defined`
- Outcome: versiona el contrato para request/result y evita suposiciones distintas entre UI, orquestacion y persistencia.
- Acceptance criteria:
  - existe payload versionado de request con inputs requeridos y opcionales;
  - existe payload versionado de resultado con estado, confidence, limitations y metadata visible;
  - el contrato define `insufficient-data`, `blocked` y `completed` de forma consistente.
- Dependencies: `BFS-001`.
- Related docs:
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`

### BFS-003 - Define trust, disclaimer, and low-confidence policy

- Epic: `EP-01 PRO Scope, Entitlements & Trust`
- Cycle: `C1 - Scope + Contract Freeze`
- Priority: `P0`
- Labels: `area/product`, `area/trust-safety`, `type/story`, `risk/safety`, `surface/trust`, `ready/defined`
- Outcome: cierra el lenguaje permitido y el comportamiento cuando el scan no es suficientemente confiable.
- Acceptance criteria:
  - existe copy base no medico y no diagnostico;
  - los estados `low-confidence` e `insufficient-data` tienen comportamiento visible definido;
  - queda claro cuando mostrar retry, guidance adicional o deferencia.
- Dependencies: `BFS-001`, `BFS-002`.
- Related docs:
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`

### BFS-004 - Define analytics taxonomy and success funnel

- Epic: `EP-03 Analytics, QA & Launch Readiness`
- Cycle: `C1 - Scope + Contract Freeze`
- Priority: `P0`
- Labels: `area/analytics`, `area/data`, `type/story`, `ready/defined`
- Outcome: deja medible el feature desde exposure hasta resultado, upgrade y errores.
- Acceptance criteria:
  - existe taxonomia para `entrypoint_viewed`, `upgrade_clicked`, `preflight_blocked`, `scan_started`, `scan_completed`, `scan_failed` y `result_viewed`;
  - el funnel permite medir uso PRO vs bloqueos por entitlement o tokens;
  - se definen propiedades minimas para origen, estado y motivo de bloqueo.
- Dependencies: `BFS-001`, `BFS-002`, `BFS-003`.
- Related docs:
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`

### BFS-005 - Wire PRO entitlement and token preflight for scan execution

- Epic: `EP-02 Scan Flow, AI Execution & Result UX`
- Cycle: `C2 - PRO Scan Build`
- Priority: `P0`
- Labels: `area/backend`, `area/ai`, `type/story`, `risk/dependency`, `ready/defined`
- Outcome: conecta el feature con la politica real de entitlement y tokens sin abrir bypasses especificos del screen.
- Acceptance criteria:
  - la ejecucion no corre sin pasar entitlement, estimacion y validacion de balance;
  - el comportamiento bloqueado por plan o tokens es visible y consistente;
  - la regla se implementa como consumo de la capa compartida, no como logica ad hoc del page flow.
- Dependencies: `BFS-002`, `BFS-003`.
- Related docs:
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`
  - `docs/strategy/COACH_BODYSCAN_MEALPHOTO_CHECKPOINT_2026-04-10.md`

### BFS-006 - Finalize insufficient-data and validation rules for scan input

- Epic: `EP-02 Scan Flow, AI Execution & Result UX`
- Cycle: `C2 - PRO Scan Build`
- Priority: `P1`
- Labels: `area/product`, `area/frontend`, `type/story`, `risk/data-quality`, `ready/defined`
- Outcome: define exactamente cuando el usuario tiene datos suficientes para correr el scan y como guiamos la correccion.
- Acceptance criteria:
  - quedan definidas validaciones minimas de fotos y contexto requerido;
  - existe comportamiento visible para input incompleto o no valido;
  - la UI puede orientar al usuario sin inventar resultados.
- Dependencies: `BFS-002`, `BFS-003`.
- Related docs:
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`

### BFS-007 - Build PRO entrypoints, locked states, and upgrade path

- Epic: `EP-02 Scan Flow, AI Execution & Result UX`
- Cycle: `C2 - PRO Scan Build`
- Priority: `P1`
- Labels: `area/frontend`, `area/product`, `type/story`, `surface/home`, `surface/trust`, `ready/defined`
- Outcome: deja claro donde se entra al feature, como se ve bloqueado si no eres PRO y cual es el upgrade path.
- Acceptance criteria:
  - existe al menos un entrypoint primario y uno secundario definidos;
  - los estados locked muestran expectativa correcta y CTA de upgrade;
  - el feature no parece disponible para usuarios no elegibles.
- Dependencies: `BFS-001`, `BFS-003`.
- Related docs:
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`

### BFS-008 - Build AI execution orchestration and persisted scan lifecycle

- Epic: `EP-02 Scan Flow, AI Execution & Result UX`
- Cycle: `C2 - PRO Scan Build`
- Priority: `P0`
- Labels: `area/frontend`, `area/backend`, `area/ai`, `type/story`, `ready/defined`
- Outcome: entrega el lifecycle visible y persistido de una corrida real del scan.
- Acceptance criteria:
  - existe flujo consistente `idle -> validating -> blocked/running -> completed/failed`;
  - el resultado o estado final queda persistido y rehidratable;
  - el usuario no pierde contexto si sale y vuelve a entrar.
- Dependencies: `BFS-002`, `BFS-005`, `BFS-006`.
- Related docs:
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`

### BFS-009 - Build scan results UX with confidence and next actions

- Epic: `EP-02 Scan Flow, AI Execution & Result UX`
- Cycle: `C2 - PRO Scan Build`
- Priority: `P0`
- Labels: `area/frontend`, `area/design`, `area/ai`, `type/story`, `surface/decision`, `ready/defined`
- Outcome: vuelve el resultado entendible, accionable y honesto sobre confianza y limitaciones.
- Acceptance criteria:
  - el resultado muestra estimacion, confidence y limitations en el mismo surface;
  - el copy no usa framing medico ni promesas garantizadas;
  - existe siguiente accion clara despues del resultado.
- Dependencies: `BFS-003`, `BFS-008`.
- Related docs:
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`

### BFS-010 - Add retry, failure, and support states for blocked scans

- Epic: `EP-02 Scan Flow, AI Execution & Result UX`
- Cycle: `C2 - PRO Scan Build`
- Priority: `P1`
- Labels: `area/frontend`, `area/trust-safety`, `type/story`, `surface/trust`, `ready/defined`
- Outcome: evita callejones sin salida cuando el scan no puede ejecutarse o falla.
- Acceptance criteria:
  - existen estados diferenciados para bloqueo por eligibility, bloqueo por tokens, error tecnico y baja confianza;
  - cada estado tiene CTA coherente: retry, upgrade, corregir fotos o soporte;
  - no se muestra fallback engañoso como si fuera un resultado real.
- Dependencies: `BFS-003`, `BFS-005`, `BFS-008`, `BFS-009`.
- Related docs:
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`
  - `docs/strategy/COACH_BODYSCAN_MEALPHOTO_CHECKPOINT_2026-04-10.md`

### BFS-011 - Create end-to-end QA matrix and release checklist

- Epic: `EP-03 Analytics, QA & Launch Readiness`
- Cycle: `C3 - QA + Launch Readiness`
- Priority: `P0`
- Labels: `area/product`, `area/analytics`, `type/story`, `ready/defined`
- Outcome: deja lista la validacion funcional, de policy y de instrumentacion antes de abrir rollout.
- Acceptance criteria:
  - existe matriz QA para casos felices, bloqueos, errores y baja confianza;
  - el checklist incluye entitlement, tokens, persistencia, analytics y copy de trust;
  - se define criterio de go/no-go para rollout.
- Dependencies: `BFS-004`, `BFS-005`, `BFS-008`, `BFS-009`, `BFS-010`.
- Related docs:
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`

### BFS-012 - Define launch dashboard, alerts, and post-launch review

- Epic: `EP-03 Analytics, QA & Launch Readiness`
- Cycle: `C3 - QA + Launch Readiness`
- Priority: `P1`
- Labels: `area/analytics`, `area/product`, `type/story`, `ready/defined`
- Outcome: deja al equipo listo para observar el feature en produccion y decidir iteraciones rapidas.
- Acceptance criteria:
  - existe dashboard minimo para funnel, errores y bloqueos;
  - existen alertas o checks para fallos anormales del flujo;
  - queda definida una retro post-launch con preguntas concretas de decision.
- Dependencies: `BFS-004`, `BFS-011`.
- Related docs:
  - `docs/strategy/BODY_SCAN_LINEAR_EPIC.md`

## 7. Orden recomendado de carga en Linear

1. Crear el proyecto `PRO AI Body Fat Scan`.
2. Crear los 3 epics.
3. Cargar primero `BFS-001` a `BFS-004`.
4. Revisar si el workspace ya tiene labels equivalentes; si no, crearlas.
5. Cargar `BFS-005` a `BFS-010` cuando `C1` quede cerrado.
6. Dejar `BFS-011` y `BFS-012` en `Backlog` o `Ready` hasta que el build exista.

## 8. Bloqueador para creacion directa por API

Hoy el repo deja listo el material de carga, pero no resuelve creacion directa en Linear desde este entorno.

Bloqueador actual:

- no hay `LINEAR_API_KEY` disponible en este entorno;
- no hay CLI `linear` ni script del repo para crear issues automaticamente;
- por lo tanto, la carga debe hacerse por UI manual o import CSV.
