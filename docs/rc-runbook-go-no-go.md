# RC Runbook — GO/NO-GO operativo (Sprint 6 cierre)

**Dependency statement:** This PR depends on PR-01 and PR-02 being merged (and PR-03 if applicable).

Objetivo: que la decisión de release/demo sea objetiva, repetible y auditable en una sola pasada (`reset → smoke → checklist`).

## 1) Freeze scope (obligatorio)

Durante RC **no entran cambios de producto**. Solo se permiten:
- fixes críticos de release (bloqueantes de GO),
- ajustes de configuración/entorno,
- documentación/evidencia de ejecución.

Todo lo demás va a backlog post-demo.

## 2) Responsables

- **Release owner (decisión final GO/NO-GO):** Tech Lead / QA Lead de guardia.
- **Ejecutor runbook:** QA owner del sprint.
- **Soporte fixes rápidos:** Backend + Frontend on-call.
- **Aprobación de rollback:** Release owner + responsable técnico del módulo afectado.

## 3) Entradas y links obligatorios

- CI gates: `.github/workflows/pr-quality-gates.yml`
- Contract tests (API): `docs/prs/sprint-01-pr-02-contract-test-exercises-imageurl.md`
- E2E lite: `docs/e2e.md`
- Checklist RC (mobile): `docs/rc-checklist.md`
- Demo playbook: `docs/demo-playbook.md`
- Smoke + reset operativo: `docs/demo-smoke-test.md`, `docs/demo-reset.md`

## 4) Ejecución (1 pasada real)

### Paso A — Reset (stop the line)
Desde `apps/api` ejecutar 2 veces:

```bash
npm run demo:reset
npm run demo:reset
```

Si no hay 2/2 OK: **NO-GO**.

### Paso B — Smoke (stop the line)
Ejecutar recorrido completo en `docs/demo-smoke-test.md`.

Si falla login, guard `/app`, persistencia o entitlements FREE/premium: **NO-GO**.

### Paso C — RC checklist (stop the line)
Completar `docs/rc-checklist.md` en `375x812` y `390x844`.

Si cualquier check aplicable queda FAIL: **NO-GO**.

### Paso D — Consola limpia (stop the line)
Durante toda la corrida: **0 console errors**.

Si aparece 1 error: **NO-GO**.

## 5) Criterio GO / NO-GO

### GO
- Reset demo idempotente: 2/2 OK.
- Smoke RC en PASS.
- RC checklist PASS en ambos viewports.
- Consola limpia (0 errors).
- CI gates en PASS + pruebas relevantes en verde (contract + e2e lite si aplica).

### NO-GO
- Falla cualquier paso stop-the-line.
- CI en rojo.
- Falta evidencia mínima en PR.

## 6) Qué hacer si NO-GO (plan de fixes + rollback)

1. **Freeze inmediato de merge** a release branch.
2. Abrir incidencia con evidencia mínima: pasos, expected/actual, consola, captura, commit/PR.
3. Aplicar fix mínimo de release (sin ampliar scope).
4. Re-ejecutar runbook completo desde Paso A.
5. Si no hay fix seguro en ventana RC: **rollback** al último commit/tag estable validado.

## 7) Evidencia requerida en PR (obligatoria)

Pegar este bloque en la descripción del PR:

```md
## RC Evidence
- Reset demo (2x): PASS/FAIL + salida terminal
- Smoke RC: PASS/FAIL + notas
- RC checklist mobile: PASS/FAIL (375x812, 390x844)
- Console: 0 errors (captura)
- CI gates: <link>
- Contract tests: <link>
- E2E lite: <link>
- RC checklist doc: <link>
- Demo playbook: <link>
```

## 8) Evidencia de 1 ejecución real (esta PR)

Fecha: `2026-02-22`  
Entorno: `local`  
Ejecutor: `Codex`

- Reset demo (intento #1): **FAIL**
- Resultado runbook: **NO-GO**
- Razón bloqueante: error de runtime al ejecutar `npm run demo:reset`.

Salida relevante de consola:

```text
/workspace/fitsculpt-fe-web/apps/api/src/prismaClient.ts:1
import { Prisma, PrismaClient } from "@prisma/client";
         ^
SyntaxError: The requested module '@prisma/client' does not provide an export named 'Prisma'
```

Acción siguiente recomendada:
- Corregir incompatibilidad `@prisma/client`/runtime en API.
- Repetir runbook completo desde Paso A y adjuntar nuevas capturas/evidencia limpia.
