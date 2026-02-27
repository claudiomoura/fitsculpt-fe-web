# DEMO_SETUP

## Objetivo

Sembrar un entorno demo **reproducible e idempotente** para beta venta con:
- 1 gym
- 1 admin/manager
- 1 trainer
- 2 miembros
- 1 plan asignado a un miembro

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

El script usa `upsert` para gym, usuarios, memberships y plan. Se puede correr varias veces sin romper ni duplicar datos clave.

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
