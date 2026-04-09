# Linear Manual Setup Checklist

Este checklist esta pensado para una persona no experta en Linear.

Objetivo: dejar el workspace listo para trabajar semana a semana sin usar automatizaciones riesgosas ni secretos pegados en chat.

## 1. Regla de seguridad antes de empezar

- No pegues API keys, tokens ni secretos en chats para intentar automatizar Linear.
- Si ya existen secretos en otro sistema, no los reutilices desde una conversacion.
- Para este setup, usa solo carga manual dentro de la UI de Linear.

## 2. Crear o revisar el workspace

1. Entra a Linear.
2. Verifica que el workspace a usar sea `FitSculpt`.
3. Deja una sola timezone operativa para planning.
4. Si Linear pregunta por estimaciones, puedes dejarlas apagadas al inicio.
5. Si existe demasiada configuracion avanzada, ignorala por ahora.

Resultado esperado:

- Tienes un workspace simple, sin configuracion extra innecesaria.

## 3. Crear los teams

Crear exactamente estos 3 teams:

1. `Product`
2. `App`
3. `Intelligence`

Uso practico de cada team:

- `Product`: definicion, UX, scope, QA funcional, release readiness.
- `App`: frontend + backend del producto.
- `Intelligence`: reglas, decisioning, analytics, data quality.

Consejo:

- No crees un team separado de Design al inicio. Usa `Product` para eso.

## 4. Crear los projects

Crear exactamente estos 3 projects:

1. `Phase 0 - Foundations`
2. `Phase 1 - Weekly Adaptive Coach MVP`
3. `Phase 2 - Decision Quality & Trust`

Asignacion sugerida:

- `Phase 0 - Foundations` -> owner team: `Product`
- `Phase 1 - Weekly Adaptive Coach MVP` -> owner team: `App`
- `Phase 2 - Decision Quality & Trust` -> owner team: `Intelligence`

Consejo:

- Si Linear te deja elegir fechas, pon fechas aproximadas. No pierdas tiempo afinandolas demasiado.

## 5. Crear los ciclos iniciales

Crear solo estos 3 ciclos semanales:

1. `C1 - Foundations Freeze`
2. `C2 - UX + Contracts`
3. `C3 - MVP Build Start`

Regla simple:

- No crees 8 ciclos de una vez.
- Crea 3, trabaja, aprende y luego ajusta.

## 6. Crear los estados

Si puedes personalizar estados, usa este workflow simple:

1. `Backlog`
2. `Ready`
3. `In Progress`
4. `In Review`
5. `Blocked`
6. `Done`

Como usarlos:

- `Backlog`: idea aprobada pero aun no lista para ejecutar.
- `Ready`: tiene descripcion, criterio de aceptacion y doc fuente.
- `In Progress`: alguien la esta trabajando de verdad.
- `In Review`: necesita revision funcional o tecnica.
- `Blocked`: depende de otra decision o entregable.
- `Done`: cerrado y validado.

Regla importante:

- No muevas una issue a `Ready` si todavia no tiene acceptance criteria y links a docs.

## 7. Crear las labels

No hace falta crear cien labels. Crea estas primero.

Area:

- `area/product`
- `area/design`
- `area/frontend`
- `area/backend`
- `area/ai`
- `area/data`
- `area/analytics`
- `area/trust-safety`

Fase:

- `phase-0`
- `phase-1`
- `phase-2`

Tipo:

- `type/epic`
- `type/story`
- `type/task`
- `type/spike`
- `type/bug`

Surface:

- `surface/onboarding`
- `surface/plan`
- `surface/home`
- `surface/logging`
- `surface/check-in`
- `surface/decision`
- `surface/history`
- `surface/trust`

Riesgo:

- `risk/safety`
- `risk/dependency`
- `risk/scope`
- `risk/data-quality`

Madurez:

- `ready/defined`
- `ready/blocked`
- `ready/needs-spec`

Segmento:

- `segment/initial`

Consejo:

- Si te parece mucho, crea primero solo las labels que aparecen en `LINEAR_FIRST_ISSUES_COPYPASTE.md`.

## 8. Crear prioridades

Usa este criterio simple:

1. `P0`: bloquea loop core, safety o release.
2. `P1`: necesario para un MVP usable.
3. `P2`: mejora importante pero no bloqueante.
4. `P3`: despues.

Regla:

- Para la primera tanda, casi todo debe ser `P0` o `P1`.

## 9. Crear las primeras issues

Sigue este orden:

1. Abre `docs/strategy/LINEAR_FIRST_ISSUES_COPYPASTE.md`.
2. Crea cada issue exactamente en el orden indicado.
3. Copia titulo, descripcion, project, cycle, priority y labels.
4. Pega los acceptance criteria en el cuerpo de la issue.
5. Pega tambien los `Related docs` al final de la descripcion.
6. Marca status inicial:
   - `Ready` para las que ya tienen definicion suficiente.
   - `Backlog` si todavia no quieres meterlas en ciclo.

Consejo muy practico:

- Crea primero las 8 de `C1 - Foundations Freeze`.
- Revisa que todo quede claro.
- Despues crea las 4 de `C2 - UX + Contracts`.

## 10. Crear la tanda por CSV si te resulta mas facil

Si prefieres importar o adaptar en bloque:

1. Abre `docs/strategy/LINEAR_IMPORT_CSV_DRAFT.csv`.
2. Revisa que las columnas te sirvan.
3. Si tu workspace de Linear usa otros nombres de campos, adapta el CSV manualmente.
4. Importa una tanda chica primero.
5. Verifica que labels, priorities y cycles hayan quedado bien antes de seguir.

Consejo:

- Haz una prueba con 2 o 3 filas antes de importar las 12.

## 11. Como vincular ramas y PRs de GitHub a issues de Linear

Forma simple:

1. Cuando empieces trabajo real, toma el ID de la issue. Ejemplo: `FS-010`.
2. Nombra la rama incluyendo el ID. Ejemplo: `fs-010-decision-rules-v1`.
3. Incluye el ID en el titulo del PR. Ejemplo: `FS-010 Define decision rules v1`.
4. Si el cuerpo del PR tiene campo de issue relacionada, pega el ID o el link de la issue.

Resultado esperado:

- Cualquier persona puede ver rapidamente que rama o PR corresponde a que issue.

Si luego conectas GitHub con Linear desde la UI:

- Mejorara el linkeo automatico.
- Pero el naming con ID igual sigue siendo buena practica.

## 12. Como usar Linear semana a semana

Rutina simple recomendada:

Lunes:

1. Revisa el ciclo actual.
2. Elige pocas issues `Ready`.
3. No metas trabajo extra si no desbloquea algo importante.

Durante la semana:

1. Mueve las issues a `In Progress` solo cuando alguien realmente empiece.
2. Usa `Blocked` si depende de otra definicion.
3. Si una issue genera una decision nueva, actualiza primero el doc fuente en `docs/strategy/`.

Viernes o cierre de ciclo:

1. Revisa que quedo `Done`.
2. Revisa que quedo trabado.
3. Ajusta el siguiente ciclo con aprendizaje real, no con planes viejos.

## 13. Errores comunes a evitar

- Cargar todo el backlog de golpe.
- Crear demasiados estados.
- Crear labels inutiles.
- Meter en una sola issue discovery, UX, backend y analytics al mismo tiempo.
- Marcar `Done` algo que todavia no tiene criterio de aceptacion cumplido.
- Usar Linear como reemplazo de los docs de estrategia.

## 14. Regla final

- `docs/strategy/` sigue siendo la fuente de verdad de estrategia.
- `Linear` se usa para ejecucion, ownership, prioridad y estado.
