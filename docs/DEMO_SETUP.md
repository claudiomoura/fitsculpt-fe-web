# DEMO_SETUP

## Objetivo

Sembrar un entorno demo **reproducible e idempotente** para beta venta con:
- 1 gym
- 1 admin/manager
- 1 trainer
- 2 miembros
- 1 plan asignado a un miembro

## Demo en 5 min

Desde la raíz del repo:

```bash
npm run seed:demo
```

Checklist rápida:

1. Ejecuta el seed (1 comando).
2. Inicia sesión con cualquiera de las cuentas demo.
3. Valida roles y membresías del gym.
4. Valida que `demo.member1` tiene plan asignado.

> El seed está preparado para correr múltiples veces sin duplicar registros clave.

## Ejecutar seed

Desde la raíz del repo:

```bash
npm run seed:demo
```

También se puede ejecutar desde `apps/api`:

```bash
npm run seed:demo
```

## Cuentas demo creadas

- Manager (ADMIN app + ADMIN gym)
  - `demo.manager@fitsculpt.local` / `DemoManager123!`
- Trainer (USER app + TRAINER gym)
  - `demo.trainer@fitsculpt.local` / `DemoTrainer123!`
- Member 1 (USER app + MEMBER gym, con plan asignado)
  - `demo.member1@fitsculpt.local` / `DemoMember123!`
- Member 2 (USER app + MEMBER gym)
  - `demo.member2@fitsculpt.local` / `DemoMember123!`

Gym demo:
- `code`: `DEMO-BETA`
- `activationCode`: `DEMO-BETA-ACT`
- `name`: `FitSculpt Demo Beta Gym`

## Idempotencia

El script usa `upsert` para gym, usuarios, memberships y plan. Además limpia membresías de estas cuentas demo en gyms distintos al gym demo para evitar estados inconsistentes si se reutiliza una base compartida.

También utiliza fecha fija para el día del plan asignado, garantizando reproducibilidad en validaciones e2e.

## Overrides por variables de entorno

Se pueden sobreescribir emails/passwords/nombre y gym:

- `DEMO_GYM_CODE`
- `DEMO_GYM_ACTIVATION_CODE`
- `DEMO_GYM_NAME`
- `DEMO_MANAGER_EMAIL`, `DEMO_MANAGER_PASSWORD`, `DEMO_MANAGER_NAME`
- `DEMO_TRAINER_EMAIL`, `DEMO_TRAINER_PASSWORD`, `DEMO_TRAINER_NAME`
- `DEMO_MEMBER_1_EMAIL`, `DEMO_MEMBER_1_PASSWORD`, `DEMO_MEMBER_1_NAME`
- `DEMO_MEMBER_2_EMAIL`, `DEMO_MEMBER_2_PASSWORD`, `DEMO_MEMBER_2_NAME`

## Verify

1. Ejecutar seed dos veces seguidas:

```bash
npm run seed:demo
npm run seed:demo
```

2. Login con cuentas demo y validar:
- acceso correcto por rol
- gym membership activo
- Member 1 con plan de entrenamiento asignado
