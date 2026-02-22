# Demo Smoke Test (manual, 1 página, <10 min)

Objetivo: validar 5 flujos core de demo sin tocar `fs_token`, `/api/*` ni rutas existentes.

## Pre-requisitos (copy/paste)
1. API en `http://localhost:4000` y Web en `http://localhost:3000`.
2. Variables de entorno mínimas:
   - Web: `BACKEND_URL`, `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_API_BASE_URL` → `http://localhost:4000`.
   - API: `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `CORS_ORIGIN=http://localhost:3000`, `APP_BASE_URL=http://localhost:3000`, `ALLOW_SEED=1`.
3. Seed demo aplicada (si existe en el entorno):
   - `cd apps/api && npm run db:seed`
4. Usuario demo (si existe por seed):
   - Email: `demo-admin@fitsculpt.local`
   - Password: `DemoAdmin123!`
5. Ejecutar en ventana incógnito con DevTools abierto (Console visible todo el recorrido).

## Regla global obligatoria
- **0 console errors** durante todo el smoke. Si aparece 1 error, el smoke queda en **FAIL**.

## Smoke script (5 checks)
1) **Login**
- Paso: entrar a `/login` e iniciar sesión con usuario demo.
- Expected result: login exitoso y navegación a `/app` (o `next` correcto).

2) **`/app` protegido**
- Paso: en otra ventana incógnito sin sesión, abrir `/app` directo.
- Expected result: no permite acceso directo; redirige a `/login?next=%2Fapp` (o equivalente de login).

3) **Tab bar mobile (navegación)**
- Paso: en viewport mobile (ej. 390x844), tocar 3 tabs (ej. Hoy, Biblioteca, Perfil).
- Expected result: navega entre tabs sin pantalla rota, sin overlap ni overflow crítico.

4) **Hoy + 1 acción**
- Paso: abrir `/app/hoy` y ejecutar 1 acción rápida (ej. abrir entrenamiento/seguimiento y volver).
- Expected result: la acción responde, cambia estado o navega correctamente, y vuelve sin error.

5) **Biblioteca: lista + detalle**
- Paso: abrir `/app/biblioteca`, seleccionar un item y abrir detalle.
- Expected result: lista visible, detalle abre, y si el item tiene imagen real se renderiza correctamente.

## Checklist final (marcar ejecución)
> Aprobación demo: **5/5 PASS** + **0 console errors**

- [ ] 1. Login — PASS
- [ ] 2. `/app` protegido sin sesión — PASS
- [ ] 3. Tab bar mobile navega bien — PASS
- [ ] 4. Hoy + 1 acción — PASS
- [ ] 5. Biblioteca lista + detalle — PASS
- [ ] Regla global: 0 console errors — PASS

**Resultado final:** `__/5 PASS` (debe ser `5/5 PASS`)

## Evidencia mínima para PR
- Link a este doc: `docs/demo-smoke-test.md`
- Checklist completado (5/5 PASS + 0 console errors)
- Opcional: 2–3 capturas (Biblioteca lista, Biblioteca detalle, Console limpia)


## Related smoke (entitlements)
- Para validación FREE vs PRO/GYM y gating premium: `docs/entitlements-smoke.md`.

## Gym Pilot (E2E, 4 pasos)

Objetivo: validar flujo demo sin callejones: **user join → admin accept → assign plan → user sees plan**.

### Preparación mínima
- Tener 2 sesiones activas (ideal incógnito en navegadores/perfiles separados):
  - **Usuario miembro** (quien solicita ingreso y valida plan).
  - **Admin/Trainer de gimnasio** (quien aprueba y asigna plan).
- Abrir DevTools en ambas sesiones y mantener **Console visible** durante todo el flujo.

### Flujo
1) **Usuario solicita ingreso**
- Paso: abrir `/app/gym`, seleccionar gym o usar código, y enviar solicitud.
- Expected result: estado del usuario cambia a `PENDING` y no hay pantallas en blanco.

2) **Admin/Trainer revisa y acepta**
- Paso: abrir `/app/gym/admin` (o `/app/admin/gym-requests` si aplica al rol) y aceptar solicitud pendiente.
- Expected result: solicitud desaparece de pendientes o queda reflejada como procesada.

3) **Admin/Trainer asigna plan**
- Paso: en el panel de miembros del gym, usar **Asignar plan** para el usuario aceptado.
- Expected result: asignación exitosa y feedback de éxito visible (sin dead-end).

4) **Usuario confirma plan visible**
- Paso: volver a sesión de usuario, refrescar `/app/gym` y abrir `Ir a mi plan`.
- Expected result: usuario con membresía `ACTIVE`, navegación correcta a su plan y sin errores.

### Evidencia requerida para PR
- 4 screenshots (uno por cada paso).
- 1 screenshot con consola limpia (sin errores) durante el flujo.
