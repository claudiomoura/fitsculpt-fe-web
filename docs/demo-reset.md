# Demo reset (backend) — reproducible + idempotent

Dependency statement: **This PR can run now on origin/dev**.

## Estado demo mínimo

El reset deja siempre este estado:

- 1 usuario demo reproducible:
  - email: `demo.user@fitsculpt.local` (override con `DEMO_USER_EMAIL`)
  - password: `DemoUser123!` (override con `DEMO_USER_PASSWORD`)
- Biblioteca de ejercicios demo con media real (5 ejercicios con `imageUrls` + `imageUrl` + `mediaUrl`).
- 2 recetas demo con ingredientes.
- 1 plan de entrenamiento activo con día de hoy y ejercicios.
- 1 plan de nutrición activo con día de hoy y una comida.
- 1 workout “sesión de hoy” para completar flujo Hoy → acción.

## Cómo ejecutar

Desde `apps/api`:

```bash
npm run demo:reset
```

También existe endpoint dev (no producción):

```bash
POST /dev/reset-demo
```

## Idempotencia

El reset es idempotente porque elimina y recrea las entidades demo (por IDs y prefijos controlados):

- user demo por email configurable
- training/nutrition/workout demo por IDs fijos
- ejercicios demo por `source = demo-seed`
- recetas demo por prefijo `DEMO:`

Correr 2 veces consecutivas devuelve un estado consistente y sin colisiones de unicidad.

## Verificación recomendada

1. Ejecutar reset dos veces:

```bash
npm run demo:reset
npm run demo:reset
```

Esperado: ambos comandos finalizan OK.

2. Validar dataset mínimo en DB/API:

- Biblioteca:
  - existen al menos 5 ejercicios con `source=demo-seed`
  - todos tienen media URL real (`imageUrls[0]` no vacío)
- Core loop Hoy → acción:
  - existe workout demo del día
  - puede iniciarse una sesión vía `/workouts/:id/start` autenticado como usuario demo

## Checklist de resultados esperados

- [x] Seed/reset determinista para demo.
- [x] Procedimiento idempotente documentado.
- [x] Datos mínimos para Biblioteca y flujo Hoy → acción.

