## A) NORTH STAR Y POSICIONAMIENTO

### 1) North Star Metric

**NSM propuesta:** **“Días activos por semana con 1 acción core completada”** (WCAA = Weekly Core Action Active Days).
**Definición “acción core”:** completar **(a)** inicio+finish de sesión de workout **o** **(b)** registro de comida (user-foods) **o** **(c)** registro de tracking (peso/medidas/etc.).

> Motivo: alinea con el “flujo diario simple” y consistencia (“Hoy”) del brief. 

**Métricas de apoyo (3–5):**

* **Activation:** % usuarios que en D0–D2 completan 1 acción core desde “Hoy”.
* **Retention:** W1 retention (usuarios que vuelven y completan 1 acción core en semana 2).
* **Habit:** % usuarios con **≥3** WCAA (3+ días activos/semana).
* **Premium proxy:** % usuarios que intentan una feature gated (IA plan / módulos) y hacen **upgrade click** (CTA).
* **Robustez demo:** tasa de “flows smoke PASS” (5/5) + **0 errores de consola** en flows core (DoD). 

---

### 2) Público objetivo inicial (1–2 segmentos) + JTBD

**Segmento 1 (principal):** personas que entrenan en gym/casa y quieren progresión clara + guía de técnica. 
**JTBD:** “Quiero saber qué hacer hoy (entreno + comida) y tener feedback claro de progreso sin tener que ‘pensar’ cada día.”

**Segmento 2 (secundario, ya soportado por rutas/endpoints):** “Gym/Trainer pilot” (entrenador/admin que asigna planes a miembros). *(Basado en evidencia de rutas y endpoints gym/trainer/admin en auditoría; No Validado E2E.)*

---

### 3) Propuesta de valor diferencial

**En 1 frase:**
**“FitSculpt convierte tu día en una acción guiada: entrenamiento + nutrición + seguimiento, con IA asistiva validada y gating premium coherente.”**  

**En 5 bullets:**

* **Core loop “Hoy”** como centro: menos fricción, más consistencia diaria. 
* **Biblioteca con técnica + media** (y sin placeholders “fake”): confianza y percepción premium. 
* **IA asistiva con outputs estructurados y validados** (menos “alucinación”/fallos): robustez defendible. 
* **Entitlements backend-driven**: UX limpia (ocultar lo que no corresponde) + upsell en el momento correcto. 
* **BFF fino + contratos estables**: menos “drift” y más capacidad de demo impecable. 

---

## B) “FASE 2” DEFINIDA COMO PRODUCTO

### 4) Nombre de la fase + Phase Goal

**Nombre:** **Phase 2 — “Demo-Grade Premium + Modular Gating”**
**Phase Goal (2–3 frases):**
Hacer que FitSculpt se sienta **premium y confiable** en los flujos core (Hoy → Biblioteca → Entreno/Nutrición → Tracking), eliminando fallos P0/P1 que rompen percepción y demo. Consolidar **contratos** y un modelo de **entitlements backend-driven** consistente con los planes actuales (FREE / STRENGTH_AI / NUTRI_AI / PRO), evitando features visibles sin permiso. Preparar la base para una línea de innovación medible (dissertação) usando datos de adherencia y validación estructurada de IA.   

---

### 5) 3 apuestas (bets) máximas (ordenadas por impacto)

**Bet 1 — “Percepción premium y demo sin vergüenzas (P0/P1 killers)”**

* **Hipótesis:** Si eliminamos placeholders erróneos de media, rutas duplicadas y estados inconsistentes, la confianza sube y la demo deja de “romperse” en vivo.
* **Por qué nos hace top-tier:** la mayoría de apps fallan en “polish” y consistencia cuando crecen; aquí lo convertimos en ventaja. *(Assunção; falta Doc 3)*
* **Cómo se valida:** 5/5 smoke tests PASS (DoD), 0 placeholders en biblioteca con dataset demo, 0 errores de consola en flujos core.  

**Bet 2 — “Entitlements backend-driven + UX de gating impecable”**

* **Hipótesis:** Si el usuario solo ve lo que puede usar (y el upsell aparece donde duele), mejoran activación y conversión sin frustración.
* **Top-tier:** gating coherente y “no te enseño cosas rotas/inaccesibles” es diferencial de producto premium. 
* **Validación:** 100% pantallas core respetan capabilities; 0 accesos a rutas premium sin permiso; CTR de CTA upgrade (proxy) en puntos clave.

**Bet 3 — “Loop ‘Hoy’ medible (adherencia) + IA asistiva confiable”**

* **Hipótesis:** Si “Hoy” empuja 1 acción core diaria y la IA se mantiene estructurada/validada, suben WCAA, W1 y hábito (≥3 días/semana).  
* **Top-tier:** combina entrenamiento+nutrición+seguimiento en un loop único con medición clara.
* **Validación:** +X% activation D0–D2, +Xpp W1 retention, +Xpp usuarios con ≥3 WCAA. *(Assunção: faltan baselines actuales)*

---

### 6) Alcance IN/OUT (explícito)

**IN (sí hacemos):**

* Fix P0 media ejercicios (imageUrl) + test de contrato asociado (para no re-romper). *(Basado en hallazgo FS-P0-01 de auditoría.)*
* Consolidación de rutas duplicadas trainer/treinador con redirecciones (compat). 
* Definir “Capabilities/Entitlements vNext” como **contrato** y aplicarlo en UI (ocultar/gate + CTA).
* Gates de calidad: build/lint/typecheck/tests + smoke tests DoD + contract tests FE↔BFF↔BE. 
* End-to-end core: login → Hoy → Biblioteca → Entreno/Nutrición → tracking/food log, con estados loading/empty/error consistentes. 

**OUT (no hacemos aunque sea tentador):**

* App nativa iOS/Android (RN/Swift/Kotlin). 
* Social completo / red social / marketplace / challenges avanzados. 
* Integraciones profundas con wearables (Apple Health/Google Fit) más allá de lo esencial. 
* “Periodización avanzada con automação total” y sistemas complejos nuevos de programación. 
* Paywall avanzado de contenido premium de vídeo (más allá de billing básico existente). 

---

## C) ROADMAP EJECUTABLE (6 a 10 semanas) — 4 Sprints (8 semanas)

> Nota: cada sprint abajo incluye Goal, Epics, 10 historias y criterios (sí/no), dependencias/risks, y métricas de salida. Todo alineado con DoD y “no inventar estados fake” + BFF fino.   

---

### Sprint 1 (Semanas 1–2) — “Demo stability: P0/P1 polish”

**Sprint Goal:** Que la demo core sea impecable: biblioteca con media correcta, navegación sin duplicidades, estados UI consistentes.

**Epics:**

* E1. Fix media contract (exercises imageUrl)
* E2. Consolidación de rutas trainer/treinador + compat redirect
* E3. Estados UI estándar (loading/empty/error) en pantallas core

**Top 10 historias + criterios de aceptación**

1. **(P0) Biblioteca muestra imagen real cuando existe**

* La lista de ejercicios usa `imageUrl` real si está disponible
* No aparece placeholder si `imageUrl` válido existe
* Caso sin imagen: placeholder aparece de forma consistente

2. **Contrato estable de “Exercise payload” para FE**

* Existe una especificación verificable del shape consumido por la UI (campos usados)
* Si backend cambia, el test falla (no se detecta solo en runtime)

3. **Unificar ruta canonical de Trainer (una sola)**

* Solo una ruta queda como canonical en navegación
* La ruta secundaria redirige y no rompe enlaces existentes 

4. **Eliminar accesos “legacy” confusos**

* `/app/profile/legacy` redirige a la pantalla actual o queda inaccesible para usuario final
* No hay links internos que apunten a legacy

5. **Checklist de estados UI en “Hoy”**

* “Hoy” tiene loading/empty/error definidos y visibles
* No hay pantallas en blanco ante errores

6. **Checklist de estados UI en “Entrenamientos/Workout”**

* Lista y detalle muestran loading/empty/error
* Errores muestran mensaje consistente (no shapes distintos)

7. **Checklist de estados UI en “Nutrición/Macros/Dietas”**

* Loading/empty/error presentes
* Si no hay plan, se muestra empty state (no placeholders fake) 

8. **Estandarizar “error payload” en BFF hacia UI**

* UI recibe `{ code, message, details? }` de forma consistente
* No se exponen tokens/cookies en errores 

9. **Smoke test manual documentado (1 página)**

* Incluye: login, /app protegido, tab bar mobile, Hoy + 1 acción, Biblioteca list+detail 
* Cualquier persona del equipo puede ejecutarlo sin contexto extra

10. **Regresión: 0 errores de consola en flows smoke**

* En los 5 flujos del smoke test, consola sin errores

**Dependencias y riesgos:**

* Dataset de ejercicios con media real para verificar el fix (riesgo demo).
* Decisión de cuál árbol trainer queda canonical (ES vs PT) para no romper copy/navegación.

**Métricas de salida (éxito sprint):**

* 5/5 smoke PASS (DoD)
* 0 placeholders “injustificados” en biblioteca con dataset demo
* 0 errores de consola en flows smoke 

---

### Sprint 2 (Semanas 3–4) — “Entitlements backend-driven + UX de gating”

**Sprint Goal:** El usuario solo ve/usa lo permitido por su plan; upsell limpio; cero rutas premium “visibles” sin permiso.

**Epics:**

* E1. Capabilities por plan como contrato (FREE/STRENGTH_AI/NUTRI_AI/PRO)
* E2. Gating en navegación y pantallas core
* E3. CTA upgrade contextual (sin spam)

**Top 10 historias + criterios de aceptación**

1. **Definir capabilities por plan (contrato único)**

* Existe una tabla/estructura única consumida por UI
* Cambios de plan reflejan cambios de capabilities sin tocar múltiples rutas

2. **Gating en navegación principal (tab / menú)**

* Features no permitidas no aparecen para el usuario
* No se muestran placeholders fake de features bloqueadas 

3. **Gating en acceso directo por URL**

* Si usuario entra a una ruta sin permiso: ve pantalla “sin acceso” con CTA upgrade
* No se filtra data premium en responses UI

4. **CTA upgrade consistente por módulo (Strength/Nutri/Pro)**

* En rutas gated, un CTA claro con el plan correcto
* No hay CTA duplicados por pantalla

5. **Billing/Settings visible solo si está listo**

* Si billing/portal/checkout no está operativo (No Validado): ocultar o bloquear con “en preparación” solo si existe condición real 

6. **Admin override no “contamina” UI user**

* Admin ve lo que corresponde a rol; usuario no ve pantallas admin
* Separación de navegación por rol

7. **Trainer/Gym: capabilities independientes del plan**

* Ser trainer/gym admin no implica PRO automáticamente
* Permisos por rol se aplican sin romper planes

8. **Contrato FE↔BFF↔BE para entitlements**

* Hay test que valida shape de “effective entitlements”
* No hay normalizaciones ad hoc por pantalla 

9. **Estado “bloqueado” accesible y mobile premium**

* Pantalla de bloqueo: copy claro + CTA + retorno atrás
* Botones clicables en mobile; focus visible 

10. **Telemetría mínima de gating (proxy revenue)** *(Assunção: si hay analytics; falta evidencia)*

* Se registra evento “upgrade_click” por módulo y pantalla
* Se puede segmentar por plan actual

**Dependencias y riesgos:**

* Decisión comercial: qué significa “Bundle” (ver sección E).
* Riesgo de drift si el BFF transforma demasiado (mantener BFF fino). 

**Métricas de salida:**

* 100% pantallas core con gating correcto
* 0 accesos exitosos a rutas premium sin entitlement
* CTR de CTA upgrade medible (si existe analytics) *(Assunção)*

---

### Sprint 3 (Semanas 5–6) — “Core loop end-to-end medible (Hoy + Tracking/Food log)”

**Sprint Goal:** Completar y validar end-to-end: desde “Hoy” el usuario puede ejecutar 1 acción core y ver persistencia.

**Epics:**

* E1. Tracking E2E (confirmar/solucionar gap de creación)
* E2. Food log E2E con feedback básico (macros/calorías si ya existe)
* E3. “Hoy” como lanzador de acciones rápidas (sin features nuevas inventadas)

**Top 10 historias + criterios**

1. **Confirmar capacidad de crear tracking y persistir**

* El usuario puede crear 1 registro (peso o similar)
* Al recargar, el registro sigue ahí (persistencia) 
  *(Si hoy no existe POST real, se convierte en trabajo productivo del sprint; audit lo marca como gap.)*

2. **Flujo de food log por gramos end-to-end**

* Se puede crear item de comida
* Se puede borrar item
* UI refleja cambios tras refresh

3. **“Hoy” muestra accesos a acciones core disponibles**

* Acciones visibles dependen de entitlements (Sprint 2)
* No hay acciones que lleven a pantallas sin permisos

4. **Errores de backend en tracking/foods se muestran consistentes**

* Mensaje claro, sin stacktrace
* Botón de reintentar funciona

5. **Dashboard semanal no rompe si hay datos vacíos**

* Empty state correcto cuando no hay registros
* No hay gráficos rotos/NaN

6. **Onboarding no deja al usuario “sin plan” sin explicación** *(Assunção: depende de cómo onboarding conecta con planes; falta doc 1)*

* Si no hay plan activo, se muestra guidance y CTA (manual o IA si permitido)

7. **AI quota visible/usable solo si corresponde**

* Si el plan no tiene IA: no se muestra consumo/acciones IA
* Si tiene IA: feedback básico de cuota (si endpoint existe)

8. **Feed (si se usa) no se muestra si es incompleto**

* Si el contenido es placeholder/No Validado: ocultar al usuario final 

9. **Consistencia de rutas de entrenamiento**

* Navegación principal dirige a una ruta “principal” (evitar /entrenamiento vs /entrenamientos vs /workouts confuso)
* Las otras rutas redirigen o quedan fuera de navegación (compat mantenida) 

10. **Smoke test ampliado a 7 flujos**

* Añade: crear tracking, crear food log
* 7/7 PASS documentado

**Dependencias y riesgos:**

* Si tracking creation realmente no existe, es riesgo de alcance (pero es core para DoD). 
* Definir qué ruta es “principal” para entrenamiento sin romper rutas existentes. 

**Métricas de salida:**

* WCAA medible internamente (aunque sea manual al inicio)
* 7/7 smoke PASS
* 0 errores de consola en flows core

---

### Sprint 4 (Semanas 7–8) — “Gym pilot pulido + contratos + release gates”

**Sprint Goal:** Gym/trainer/admin funcionando de punta a punta en demo, con contratos protegidos y gates de release.

**Epics:**

* E1. Gym join → approve → assign plan → usuario ve plan
* E2. Contract tests críticos en admin/gym/trainer
* E3. Release gates en CI + checklist final

**Top 10 historias + criterios**

1. **Join gym por código**

* Usuario se une con código y ve estado (pendiente/activo)
* Manejo de error (código inválido) consistente

2. **Admin acepta/rechaza join request**

* Acciones funcionan y reflejan estado actualizado
* No requiere hacks manuales

3. **Asignación de training plan a miembro**

* Admin asigna plan
* Usuario ve plan asignado en su área

4. **Roles gym (admin/member) aplican gating de UI**

* Pantallas gym admin solo visibles para rol correcto
* Acceso por URL bloqueado con mensaje

5. **Trainer: listado de clientes funciona (mínimo)**

* Lista carga sin errores
* Detalle de cliente accesible

6. **Eliminar/evitar normalizaciones BFF ad hoc en endpoints críticos**

* Para endpoints críticos, el BFF actúa como passthrough salvo contrato definido 

7. **Contract tests para 5 endpoints críticos**

* exercises list, entitlements, gym join, admin gym members, trainer clients
* Si cambia shape, test falla

8. **Build/lint/typecheck/tests como gate de PR**

* No se puede mergear si falla alguno 

9. **Checklist de seguridad/logs**

* No hay tokens/cookies en logs/responses
* Cumple reglas repo hygiene 

10. **Release candidate demo script (10 min)**

* Guion replicable: login → hoy → biblioteca → plan → gym join/admin → assign → usuario ve plan
* Todo en mobile viewport

**Dependencias y riesgos:**

* Contratos en movimiento (admin/gym) — mitigación: contract tests + BFF fino. 
* Datos demo/seed para que el piloto sea repetible.

**Métricas de salida:**

* Demo script 10 min completado 3 veces seguidas sin incidencias
* 0 drift de contrato en endpoints críticos (tests PASS)
* Gates de CI en verde (build/lint/typecheck/tests)

---

## D) INNOVACIÓN PARA LA DISSERTAÇÃO (3 research tracks)

> Importante: esto propone **líneas** que se pueden construir por incrementos sobre lo que ya existe (IA endpoints + tracking/food log + planes). No asumo que hoy haya telemetría/analytics avanzada: lo marco como Assunção cuando aplique.

### Track 1 — “Adherencia inteligente: ajuste semanal basado en señales de comportamiento”

* **Problema (apps top no resuelven bien):** muchas ajustan planes “por receta” o piden demasiada info; pocas hacen ajuste **medible** usando adherencia real (qué hiciste) sin fricción. *(Assunção; falta Doc 3)*
* **Propuesta FitSculpt:** un **sistema de “Weekly Review”** (resumen) que usa señales ya disponibles: sesiones completadas, food logs, tracking. La IA sugiere micro-ajustes (volumen/selección) y cambios nutricionales en formato JSON validado. 
* **Datos necesarios (sin PII):**

  * Conteos/tiempos de acciones core (workout sessions start/finish, user-foods CRUD, tracking CRUD)
  * Estado de plan activo (training/nutrition plan id)
  * Resultados agregados (semanal), sin texto libre sensible (mitigación)
* **Evaluación:**

  * Experimento A/B: “Weekly Review + recomendaciones” vs control
  * Métricas: WCAA, W1 retention, % usuarios con ≥3 días activos/semana, completion rate de sesión
  * Offline eval: tasa de fallos de validación JSON (robustez) + necesidad de fallback
* **Riesgos éticos/privacidad + mitigación:**

  * Riesgo: inferencias sensibles sobre salud/hábitos → **minimizar** datos, agregar semanal, no guardar prompts por defecto, logs sanitizados 
  * Riesgo: recomendaciones inadecuadas → límites: IA asistiva, validación y fallback, no “diagnóstico” 

### Track 2 — “IA confiable: validación y recuperación de outputs estructurados (robustez académica)”

* **Problema:** LLMs fallan con formatos; muchas apps ocultan errores con UX pobre. *(Assunção; falta Doc 3)*
* **Propuesta FitSculpt:** formalizar y medir un pipeline “texto→JSON→validación→fallback”, con métricas de fiabilidad (parse success, schema pass, retries controlados) y su impacto en UX (errores visibles). Ya hay evidencia de schemas y parse helpers. 
* **Datos necesarios:**

  * Contadores de intentos de generación
  * Resultado validación (pass/fail) y motivo (categorías, no texto)
  * Tiempo de respuesta y tasa de fallback
* **Evaluación:**

  * Offline: tasa de schema-pass, severidad de errores, cobertura de casos límite
  * A/B: fallback UI “explicado” vs fallback silencioso (impacto en completion y satisfacción)
* **Riesgos + mitigación:**

  * Riesgo: logs con prompts → no guardar prompts, solo métricas agregadas y motivos de fallo sanitizados 

### Track 3 — “Gating premium sin frustración: personalización del upsell por contexto”

* **Problema:** upsell suele ser spammy; gating mal hecho genera rechazo y churn. *(Assunção; falta Doc 3)*
* **Propuesta FitSculpt:** un **modelo de “momento correcto”**: mostrar CTA solo cuando el usuario intenta una acción con valor inmediato (generar plan IA, ver módulo premium), con copy y plan correcto (STRENGTH_AI vs NUTRI_AI vs PRO).
* **Datos necesarios:**

  * Eventos: “intentó feature gated”, “vio paywall/CTA”, “clic CTA”, “canceló”
  * Plan actual (FREE/…) y capabilities
  * Sin PII: solo ids internos + timestamps
* **Evaluación:**

  * A/B: CTA contextual vs CTA genérico
  * Métricas: CTR, conversión a checkout (si existe), impacto en W1 retention (para evitar daño)
* **Riesgos + mitigación:**

  * Riesgo: manipulación/oscuro → limitar frecuencia, transparencia, opción “no mostrar ahora”, medir impacto en retención

### 9) Recomendación (1 principal + 1 secundaria)

* **Principal:** **Track 1 (Adherencia inteligente)** — mejor balance entre **valor de producto** (habit/retention), **medible**, y “innovación defendible” sin inventar hardware ni datos nuevos.
* **Secundaria:** **Track 2 (IA confiable)** — es altamente publicable (robustez/validación) y refuerza la promesa de demo premium, usando evidencia de que ya existe validación estructurada. 

---

## E) CALIDAD, CONTRATOS Y ENTITLEMENTS (obligatorio)

### 10) “Gates” priorizados de release (para esta fase)

**Gate 1 — Quality CI mínimo (bloquea merge):**

* `build` PASS (front y back cuando aplique) 
* `lint` PASS 
* `typecheck` PASS 
* Tests mínimos PASS (al menos unit/smoke donde exista) 

**Gate 2 — Contract tests FE↔BFF↔BE (críticos):**

* exercises list payload (incluye imageUrl)
* entitlements/effective capabilities shape
* gym join + admin accept + assign plan (si entra en sprint 4)
* auth/me (no romper sesión `fs_token`) 

**Gate 3 — Smoke tests E2E (manual al inicio, automatizable después):**

* Login email/password
* /app protegido sin sesión
* Navegación mobile tab bar
* “Hoy” + 1 acción rápida
* Tracking: crear 1 registro y persistencia
* Biblioteca: lista + detalle de 1 ejercicio 

**Gate 4 — Reglas de repo/seguridad:**

* No logs con tokens/cookies/PII
* No cambios que rompan rutas sin redirección
* BFF no mete lógica de negocio (solo proxy + adaptaciones mínimas)  

---

### 11) Entitlements/gating “backend-driven” (concreto)

#### a) Tabla de capabilities por plan + CTA de upsell

> Basado en evidencia actual: planes **FREE, STRENGTH_AI, NUTRI_AI, PRO** y funciones `planHasStrength/planHasNutrition/planHasAi`. (Auditoría lo confirma.)

| Capability (ejemplos de producto)    |                            FREE | STRENGTH_AI | NUTRI_AI | PRO | CTA sugerida              |
| ------------------------------------ | ------------------------------: | ----------: | -------: | --: | ------------------------- |
| Ver Biblioteca (lista/detalle)       |                               ✔ |           ✔ |        ✔ |   ✔ | —                         |
| Tracking básico (peso/medidas/notas) | ✔ *(Assunção: existe completo)* |           ✔ |        ✔ |   ✔ | —                         |
| Food log (user-foods)                |        ✔ *(Assunção: definido)* |           ✔ |        ✔ |   ✔ | —                         |
| IA: generar plan de entrenamiento    |                               ✖ |           ✔ |        ✖ |   ✔ | “Desbloquea Strength AI”  |
| IA: generar plan de nutrición        |                               ✖ |           ✖ |        ✔ |   ✔ | “Desbloquea Nutri AI”     |
| “AI daily tip” / cuota IA            |                               ✖ |           ✔ |        ✔ |   ✔ | “Activa IA” (si FREE)     |
| Ajustes IA (regenerar/editar con IA) |                               ✖ |           ✔ |        ✔ |   ✔ | “Pásate a PRO para ambos” |

> **Assunção:** qué features exactas se consideran “premium” en UI, porque no tengo Documento 1. El enfoque correcto es mapear capabilities a **acciones** (generar, regenerar, guardar) más que a pantallas.

#### b) Cómo evitar rutas duplicadas y features visibles sin permiso (producto/UX)

* **Navegación basada en capabilities:** si no está permitido, **no aparece** en tab/menu (regla “no exponer contenido incompleto”). 
* **Bloqueo por URL:** si el usuario accede por deep link, pantalla “Sin acceso” + CTA (no 404) y sin data premium.
* **Fuente única:** UI consume “effective entitlements/capabilities” del backend como verdad (no hardcode por pantalla). 

#### c) ¿“Bundle” o “Gym tier” como plan, o como rol? (sin reventar el sistema)

* **Recomendación:**

  * **Bundle = PRO** (ya existe). Es el “bundle” natural de Strength+Nutri+AI. *(Assunção: si el negocio quería un Bundle separado; falta evidencia Doc 1)*
  * **Gym = rol/organización**, no “plan” B2C. Mantenerlo como dominio (membership/roles) porque ya hay endpoints y pantallas de gym/admin/trainer.
* **Modelo mental (producto):**

  * “Plan” = entitlement de consumidor (FREE/STRENGTH_AI/NUTRI_AI/PRO).
  * “Rol” = permisos por contexto (USER / TRAINER / GYM_ADMIN / ADMIN).
  * Un usuario puede tener ambos: plan PRO + rol TRAINER, etc., sin mezclarlos.

---

## F) ENTREGABLE FINAL — One-pager (máx 1 página)

**FitSculpt — Phase 2: Demo-Grade Premium + Modular Gating (8 semanas / 4 sprints)**
**Objetivo:** hacer que los flujos core (Hoy → Biblioteca → Entreno/Nutrición → Tracking/Food log) sean **premium, consistentes y demo-ready**, con **entitlements backend-driven** y contratos protegidos.

**North Star (NSM):** WCAA — **días activos/semana con 1 acción core** (workout session o food log o tracking).
**Soporte:** Activation D0–D2, W1 retention, %≥3 días activos/semana, CTR upgrade (proxy), 0 errores consola + smoke PASS (robustez). 

**3 Bets (impacto):**

1. **Polish P0/P1 demo:** fix media ejercicios + rutas duplicadas + estados UI consistentes (premium feel).
2. **Entitlements impecables:** gating por capabilities + upsell contextual (FREE/Strength/Nutri/PRO).
3. **Loop “Hoy” medible:** completar tracking/food log E2E y habilitar medición de adherencia; IA asistiva validada.

**Plan por sprints (resumen):**

* **S1:** P0 media + unificar trainer/treinador + estados UI + smoke test 5 flows.
* **S2:** Capabilities backend-driven + gating navegación/URL + CTAs upgrade + contract tests entitlements.
* **S3:** Core loop E2E: tracking create+persistence + food log; smoke 7 flows; coherencia rutas entrenamiento.
* **S4:** Gym pilot E2E (join→approve→assign→user sees plan) + contract tests críticos + CI gates.

**Release gates (no negociables):**

* build/lint/typecheck/tests PASS; no romper `fs_token`; no romper rutas sin redirect; smoke DoD PASS; contract tests FE↔BFF↔BE; logs sanitizados.   

**Innovación (Dissertação) recomendada:**

* **Principal:** “Adherencia inteligente” — ajuste semanal basado en señales de uso (WCAA, completions) + IA validada.
* **Secundaria:** “IA confiable” — medir y mejorar robustez de outputs JSON (schema pass/fallback) y su impacto en UX. 

---

