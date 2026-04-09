# Linear: Primeras Issues para Crear

Este documento sirve para cargar la primera tanda de trabajo en Linear sin depender de integraciones automaticas ni de secretos pegados en chat.

Uso recomendado:

1. Crear las issues exactamente en este orden.
2. No intentes cargar todo el backlog de una sola vez.
3. Empieza por esta tanda, valida el workflow una semana y luego amplia.

Convenciones usadas aqui:

- Project: nombre sugerido en Linear.
- Cycle: ciclo sugerido inicial.
- Priority: `P0` o `P1` segun criticidad.
- Labels: copiar tal cual si ya creaste las labels del checklist.

## Orden exacto de creacion

### 1. FS-001 - Congelar objetivo y promesa MVP

- Project: `Phase 0 - Foundations`
- Suggested cycle: `C1 - Foundations Freeze`
- Priority: `P0`
- Labels: `area/product`, `phase-0`, `type/story`, `surface/trust`, `ready/defined`, `segment/initial`
- Descripcion: Documentar de forma cerrada para quien es el MVP, para quien no es, y cual es la promesa exacta del `Weekly Adaptive Coach` para evitar scope creep desde el inicio.
- Acceptance criteria:
  - Existe una definicion unica de objetivo, usuario objetivo y promesa del MVP.
  - Queda explicitado el non-target para esta primera version.
  - El resto de issues P0 pueden referenciar esta definicion como fuente comun.
- Related docs:
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_MVP_PRD.md`
  - `docs/strategy/EXECUTION_BACKLOG_V1_LINEAR.md`
  - `docs/strategy/LINEAR_INITIAL_LOAD_PLAN.md`

### 2. FS-002 - Cerrar scope in/out del MVP

- Project: `Phase 0 - Foundations`
- Suggested cycle: `C1 - Foundations Freeze`
- Priority: `P0`
- Labels: `area/product`, `phase-0`, `type/story`, `risk/scope`, `ready/defined`, `segment/initial`
- Descripcion: Listar que entra y que no entra en el MVP por surface para reducir ambiguedad y frenar discusiones repetidas durante planning y build.
- Acceptance criteria:
  - Existe una lista clara de surfaces y funcionalidades dentro del MVP.
  - Existe una lista clara de exclusiones para launch.
  - Las decisiones de alcance quedan alineadas con la promesa definida en FS-001.
- Related docs:
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_BLUEPRINT.md`
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_MVP_PRD.md`
  - `docs/strategy/EXECUTION_BACKLOG_V1_LINEAR.md`

### 3. FS-003 - Definir release gates del MVP

- Project: `Phase 0 - Foundations`
- Suggested cycle: `C1 - Foundations Freeze`
- Priority: `P0`
- Labels: `area/product`, `phase-0`, `type/story`, `area/trust-safety`, `ready/defined`, `segment/initial`
- Descripcion: Fijar criterios minimos de release funcional, safety y analytics para que el equipo pueda decidir go/no-go sin reinterpretar el plan.
- Acceptance criteria:
  - Existe una lista cerrada de gates de release del MVP.
  - Los gates incluyen criterios funcionales, de seguridad y de medicion.
  - Se define quien valida cada gate antes de marcar release-ready.
- Related docs:
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_MVP_PRD.md`
  - `docs/strategy/LINEAR_INITIAL_LOAD_PLAN.md`
  - `docs/strategy/EXECUTION_BACKLOG_V1_LINEAR.md`

### 4. FS-005 - Definir entidades del loop semanal

- Project: `Phase 0 - Foundations`
- Suggested cycle: `C1 - Foundations Freeze`
- Priority: `P0`
- Labels: `area/backend`, `phase-0`, `type/story`, `area/data`, `ready/defined`, `segment/initial`
- Descripcion: Cerrar el modelo minimo de entidades y estados del loop semanal para que producto, app e inteligencia construyan sobre el mismo sistema mental.
- Acceptance criteria:
  - Se definen entidades minimas como perfil, semana, check-in, decision y adaptacion.
  - Cada entidad tiene campos obligatorios y estados base.
  - Quedan claras las relaciones entre entidades y transiciones principales.
- Related docs:
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_DATA_CONTRACTS.md`
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_IMPLEMENTATION_MAP.md`
  - `docs/strategy/EXECUTION_BACKLOG_V1_LINEAR.md`

### 5. FS-006 - Definir contrato app <-> decision engine

- Project: `Phase 0 - Foundations`
- Suggested cycle: `C1 - Foundations Freeze`
- Priority: `P0`
- Labels: `area/backend`, `area/ai`, `phase-0`, `type/story`, `risk/dependency`, `ready/defined`
- Descripcion: Versionar los payloads de entrada y salida entre app y motor de decision para evitar suposiciones distintas entre frontend, backend y decisioning.
- Acceptance criteria:
  - Existe un contrato de entrada y salida versionado.
  - El contrato cubre campos requeridos, opcionales y fallback esperado.
  - El equipo puede usar ejemplos de payload para build y QA.
- Related docs:
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_DATA_CONTRACTS.md`
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_API_PLAN.md`
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_IMPLEMENTATION_MAP.md`

### 6. FS-007 - Definir taxonomia de eventos analytics

- Project: `Phase 0 - Foundations`
- Suggested cycle: `C1 - Foundations Freeze`
- Priority: `P0`
- Labels: `area/analytics`, `area/data`, `phase-0`, `type/story`, `ready/defined`, `segment/initial`
- Descripcion: Especificar los eventos y propiedades minimas para medir onboarding, plan, check-in, decision y aceptacion de adaptacion de punta a punta.
- Acceptance criteria:
  - Cada surface core tiene al menos un evento principal definido.
  - Cada evento incluye actor, trigger y propiedades minimas.
  - La taxonomia permite reconstruir el funnel semanal end-to-end.
- Related docs:
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_DATA_CONTRACTS.md`
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_IMPLEMENTATION_MAP.md`
  - `docs/strategy/LINEAR_INITIAL_LOAD_PLAN.md`

### 7. FS-010 - Definir reglas MVP de decision

- Project: `Phase 0 - Foundations`
- Suggested cycle: `C1 - Foundations Freeze`
- Priority: `P0`
- Labels: `area/ai`, `phase-0`, `type/story`, `surface/decision`, `ready/defined`, `segment/initial`
- Descripcion: Bajar a reglas operativas y conservadoras las decisiones `mantener`, `ajustar`, `simplificar` y `rediseniar` para que el motor sea explicable y auditable.
- Acceptance criteria:
  - Existe una sola decision principal posible por check-in.
  - Cada decision tiene reglas de activacion y limites claros.
  - Quedan definidos outputs permitidos para el MVP.
- Related docs:
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_TECH_ARCHITECTURE.md`
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_IMPLEMENTATION_MAP.md`
  - `docs/strategy/EXECUTION_BACKLOG_V1_LINEAR.md`

### 8. FS-014 - Definir triggers de seguridad y deferencia

- Project: `Phase 0 - Foundations`
- Suggested cycle: `C1 - Foundations Freeze`
- Priority: `P0`
- Labels: `area/trust-safety`, `phase-0`, `type/story`, `risk/safety`, `ready/defined`, `segment/initial`
- Descripcion: Explicitar cuando el sistema no debe adaptar normalmente y debe usar un comportamiento conservador o de deferencia.
- Acceptance criteria:
  - Existe una lista aprobada de triggers de riesgo MVP.
  - Cada trigger define el comportamiento esperado del sistema.
  - Queda claro cuando se congela una adaptacion agresiva.
- Related docs:
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_MVP_PRD.md`
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_TECH_ARCHITECTURE.md`
  - `docs/strategy/EXECUTION_BACKLOG_V1_LINEAR.md`

### 9. FS-011 - Definir reason codes internos y visibles

- Project: `Phase 0 - Foundations`
- Suggested cycle: `C2 - UX + Contracts`
- Priority: `P0`
- Labels: `area/ai`, `phase-0`, `type/story`, `surface/decision`, `ready/defined`, `segment/initial`
- Descripcion: Crear una taxonomia corta y reusable de reason codes para que las decisiones del coach puedan explicarse con consistencia al equipo y al usuario.
- Acceptance criteria:
  - Cada decision principal tiene reason codes asociados.
  - Los reason codes existen en version interna y version visible para usuario.
  - La taxonomia evita lenguaje generico o contradictorio.
- Related docs:
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_DATA_CONTRACTS.md`
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_IMPLEMENTATION_MAP.md`
  - `docs/strategy/EXECUTION_BACKLOG_V1_LINEAR.md`

### 10. FS-015 - Definir UX de safety y fallback

- Project: `Phase 0 - Foundations`
- Suggested cycle: `C2 - UX + Contracts`
- Priority: `P0`
- Labels: `area/design`, `area/trust-safety`, `phase-0`, `type/story`, `surface/trust`, `ready/defined`
- Descripcion: Definir el mensaje, CTA y comportamiento visible cuando el sistema entra en modo conservador, con tono seguro y no diagnostico.
- Acceptance criteria:
  - Existe copy base para estados de safety y fallback.
  - Se define CTA o siguiente accion esperada para el usuario.
  - El comportamiento visible queda alineado con los triggers de FS-014.
- Related docs:
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_MVP_UX_CHECKLIST.md`
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_MVP_PRD.md`
  - `docs/strategy/EXECUTION_BACKLOG_V1_LINEAR.md`

### 11. FS-017 - Disenar flujo de onboarding coach-level

- Project: `Phase 1 - Weekly Adaptive Coach MVP`
- Suggested cycle: `C2 - UX + Contracts`
- Priority: `P0`
- Labels: `area/design`, `phase-1`, `type/story`, `surface/onboarding`, `ready/defined`, `segment/initial`
- Descripcion: Estructurar el onboarding para capturar contexto suficiente sin generar fatiga, con una progresion que ya prepare la generacion del plan inicial.
- Acceptance criteria:
  - El flujo tiene pasos claros, orden y objetivo por bloque.
  - Se define una progresion razonable sin apariencia de formulario infinito.
  - El flujo cubre los inputs necesarios para semana 1.
- Related docs:
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_MVP_UX_CHECKLIST.md`
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_MVP_PRD.md`
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_IMPLEMENTATION_MAP.md`

### 12. FS-018 - Especificar campos obligatorios del onboarding

- Project: `Phase 1 - Weekly Adaptive Coach MVP`
- Suggested cycle: `C2 - UX + Contracts`
- Priority: `P0`
- Labels: `area/product`, `phase-1`, `type/story`, `surface/onboarding`, `ready/defined`, `segment/initial`
- Descripcion: Bajar el onboarding a nivel de campos, validaciones minimas y optionalidad para que producto, UX y app trabajen con el mismo contrato.
- Acceptance criteria:
  - Cada campo obligatorio del onboarding esta definido.
  - Se define optionalidad y validacion minima por campo.
  - El set de campos permite generar una semana 1 sin integraciones externas.
- Related docs:
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_MVP_UX_CHECKLIST.md`
  - `docs/strategy/WEEKLY_ADAPTIVE_COACH_DATA_CONTRACTS.md`
  - `docs/strategy/EXECUTION_BACKLOG_V1_LINEAR.md`

## Nota practica

Si el equipo recien empieza con Linear, crea solo estas 12 issues, asigna `Backlog` o `Ready` segun corresponda, y evita cargar las demas hasta cerrar el primer ciclo.
