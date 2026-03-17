# Beta readiness smoke pack

Este documento define el smoke pack mínimo y reproducible para validar que FitSculpt está **listo para demo** (beta vendible) sin ampliar alcance de infraestructura.

## Qué significa “listo para demo”

Se considera listo cuando, sobre entorno local/demo con datos seed:

1. El smoke pack pasa completo sin errores:
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - `pnpm --filter web e2e -- playwright test e2e/gym-nutrition-flow.spec.ts --reporter=line`
   - `pnpm build`
2. Journey crítico B2C validado manualmente (login → plan visible → gating FREE/PRO correcto → IA con estados esperados).
3. Journey crítico Gym validado con e2e existente + checklist manual (join → accept → assign nutrition plan → member lo ve y navega días).
4. No hay bloqueantes visuales/funcionales en rutas canónicas de demo.

## Cómo correr smoke local

### Comando único (desde raíz)

```bash
pnpm --filter web smoke
```

### Comandos equivalentes (paso a paso)

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter web e2e -- playwright test e2e/gym-nutrition-flow.spec.ts --reporter=line
pnpm build
```

> Nota: el smoke usa **solo** `gym-nutrition-flow.spec.ts` para evitar lentitud y flakiness por correr toda la suite e2e.

## Checklist B2C (5 pasos)

1. Ir a `http://localhost:3000/login`.
2. Iniciar sesión con usuario B2C demo.
3. Abrir `http://localhost:3000/app/dietas` y verificar que existe plan/tarjeta visible.
4. Validar gating por plan:
   - cuenta FREE muestra CTA/bloqueo de upgrade donde aplica,
   - cuenta PRO no muestra bloqueo indebido para funcionalidad premium.
5. Si aplica IA, abrir flujo IA en ruta canónica (`/app/nutricion` o `/app/entrenamiento`) y verificar estados:
   - loading estable,
   - éxito con resultado,
   - error mapeado (sin crash de pantalla).

## Checklist Gym (7 pasos)

1. Manager: login en `http://localhost:3000/login`.
2. Member: solicitar join al gym (flujo de membresía).
3. Manager: abrir requests y aceptar la solicitud.
4. Manager: abrir `http://localhost:3000/app/trainer/nutrition-plans`.
5. Manager: crear plan nutricional y asignarlo al member.
6. Member: abrir `http://localhost:3000/app/dietas` y comprobar que el plan asignado aparece.
7. Member: navegar a `http://localhost:3000/app/nutricion` y cambiar entre días (day nav) sin errores.

## Qué mirar durante la validación

- **Plan visible:** tarjetas/listas cargan y reflejan asignaciones reales.
- **Tokens/gating:** consumo y límites FREE/PRO coherentes con CTA de billing.
- **CTA billing:** redirección/estado correcto, sin dead-ends.
- **IA error states:** manejo de errores con feedback al usuario, sin `Application error` ni pantalla en blanco.
