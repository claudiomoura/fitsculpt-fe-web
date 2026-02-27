# Auditoría completa FitSculpt (producto + UX + arquitectura + contratos + calidad)

Fecha: **2026-02-27**
Autor/a auditoría: **Senior Staff Architects (GPT)**
Solicitado por: Founder/PM (FitSculpt)
Modo: **Solo lectura** (auditoría estática de zips: `front` en `/mnt/data/.zip`, `back` en `/mnt/data/scripts.zip`, `docs` en `/mnt/data/docs.zip`)

> Nota crítica: este documento separa claramente: **Implementado en código**, **Validado end-to-end**, **Vendible sin supervisión**.
> En esta auditoría no se ejecutaron builds ni tests. Todo lo runtime queda como **No Validado**.

---

## Delta vs auditoría 2026-02-26 (cambios reales detectados)

### Mejoras confirmadas en código

1. **Se corrigió el “P0 contrato Admin gym-role”**
   - El BFF ahora hace `POST` a `.../admin/users/:id/assign-gym-role` (no a `/gym-role`).
   - Backend expone `POST /admin/users/:userId/assign-gym-role` (y también `POST /admin/gyms/:gymId/users/:userId/assign-role`).

2. **Se corrigió el bug de thumbnails en biblioteca** (backend)
   - `normalizeExercisePayload` ahora prioriza `exercise.imageUrl` y si no existe cae a `imageUrls[0]`.

3. **Se endureció `/app/admin/gym-requests`**
   - En **production** hace `notFound()` y además requiere `ADMIN` incluso en no-prod.
   - Ya no es una ruta “no vendible” abierta por URL en producción.

4. **Se añadió guard de IA por dominio en backend**
   - Existe `createAiDomainGuard("nutrition" | "strength")` que exige `modules.ai` y además `modules.nutrition` o `modules.strength`.

### Lo importante que NO cambió

- `/app/gym` sigue gated por `FeatureGate feature="strength"`.
- Persisten stubs / endpoints “no soportados” en BFF (ej. acciones que devuelven 501/405).
- No hay evidencia de CI que bloquee merges por build/tests.

---

# 1) Executive Summary (actualizado)

- **Estado general (B2C): NO Release-ready.**
  Razones: falta evidencia ejecutada de gates (build, typecheck, tests), hay stubs accesibles desde UI, y hay fricción de gating en dominios clave.

- **Estado MVP modular: Parcial pero mejor alineado.**
  Backend ya tiene entitlements con módulos (`strength`, `nutrition`, `ai`) y ahora también guard de IA por dominio. Aun queda alinear UX y rutas.

- **Estado Gym Pilot: Parcial.**
  Dominio Gym existe, admin/trainer UI existe, pero **el entrypoint `/app/gym` está atado a strength**, lo que rompe la lógica B2B para Free/Nutri-only.

## Top 5 riesgos (prioridad)

1. **P0 Gating incorrecto Gym:** `/app/gym` atado a `strength` en vez de membership/rol.
2. **Tokens: no hay evidencia clara de decremento real del balance tras usar IA.** Se ve logging/costing, pero no aparece una resta explícita del `aiTokenBalance` en el flujo de ejecución (en este snapshot).
3. **Stubs y capacidades incompletas** (501/405) siguen existiendo. Si la UI expone acciones, genera frustración y ruido.
4. **No hay “release gates” ejecutados** ni evidencia de pipeline obligatorio.
5. **Superficie de rutas duplicadas** (trainer vs treinador, entreno vs entrenamientos vs workouts) mantiene coste de QA y analytics.

## Top 5 quick wins (alto impacto, bajo riesgo)

1. **Desacoplar `/app/gym` de `FeatureGate strength`** y gatear por `gymMembershipState` y rol.
2. **Cerrar el loop de tokens**: decrementar balance o aplicar cuota diaria real de forma transaccional al registrar `AiUsageLog`.
3. **Ocultar acciones que dependen de stubs 501/405** en UI, o implementar mínimo viable.
4. **Poner gate automático mínimo**: build + typecheck + tests (aunque sea solo smoke + e2e core loop) antes de merge.
5. **Unificar rutas canonical** (`/app/trainer` como canonical, redirect desde `/app/treinador`).

---

# 2) Hallazgos priorizados (actualizados)

| ID     | Severidad | Área             | Hallazgo                                                               | Estado vs 26        | Recomendación                                       | Esfuerzo |
| ------ | --------- | ---------------- | ---------------------------------------------------------------------- | ------------------- | --------------------------------------------------- | -------- |
| P0-02  | P0        | Entitlements/Gym | `/app/gym` gated por `strength`                                        | Sigue               | Gate por `gymMembershipState` + rol (B2B)           | S        |
| P0-03  | P0        | Billing/Tokens   | No se observa decremento explícito de `aiTokenBalance` en ejecución IA | Nuevo foco          | Hacer charge transaccional: log + decrement o quota | M        |
| P1-01  | P1        | UX/Producto      | Stubs 501/405 existentes pueden salir al usuario                       | Sigue               | UI no debe mostrar acciones no soportadas           | S-M      |
| P1-02  | P1        | Calidad          | No hay evidencia de CI bloqueante                                      | Sigue               | GitHub Actions mínimo con build+typecheck+e2e smoke | M        |
| P1-03  | P1        | Rutas            | Duplicación `/trainer` y `/treinador`                                  | Sigue               | Canonical + redirect                                | M        |
| FIX-01 | Resuelto  | Contratos        | Admin assign gym-role mismatch                                         | Resuelto            | Mantener contract test simple en BFF                | -        |
| FIX-02 | Resuelto  | Biblioteca       | Thumbnails placeholder por normalize bug                               | Resuelto            | Mantener test de contrato exercises                 | -        |
| FIX-03 | Resuelto  | Producto         | `/app/admin/gym-requests` no vendible accesible en prod                | Resuelto            | OK, mantener notFound prod                          | -        |
| FIX-04 | Resuelto  | IA               | Gating IA cross-domain                                                 | Resuelto en backend | Alinear FE messaging con domain guard               | -        |

---

# 3) Arquitectura, estado real

## Backend (scripts.zip)

- Entitlements versionados (`2026-02-01`) con módulos claros.
- IA con normalización, retry y validación.
- Guard de IA por dominio implementado en `src/index.ts`.

Riesgo estructural que queda:

- El backend sigue con un `src/index.ts` grande (no es P0 si hay disciplina, pero frena velocidad y testabilidad).

## Frontend (front.zip)

- BFF con proxies y normalización de errores.
- Correcciones de contrato en admin gym-role ya aplicadas.
- Protecciones mejores para rutas no vendibles (ej. gym-requests).

Riesgo UX:

- Gym sigue vendiéndose como B2B pero gateado como B2C strength.

---

# 4) Conclusión estratégica (actualizada)

FitSculpt dio un salto de estabilidad real respecto a 2026-02-26:

- Se cerró un P0 de contrato admin.
- Se corrigió un bug visible de biblioteca.
- Se endurecieron rutas no vendibles.
- La IA ya está mejor modularizada por dominio (al menos en backend).

Ahora el bloqueo no es “arquitectura base”.
El bloqueo es “producto operable”:

- entrypoint Gym,
- tokens,
- stubs,
- gates automáticos.
