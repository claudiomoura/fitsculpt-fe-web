# IA + Navegación (Information Architecture) – v1

## 1) Tab bar (5 ítems, fijo)
1. **Hoy** (`/app/hoy`)
2. **Entreno** (entry a calendario/plan: usar rutas existentes `/app/entrenamientos` o `/app/workouts` / `/app/dashboard` según implementación)
3. **Nutrición** (`/app/nutricion`)
4. **Progreso** (`/app/seguimiento`)
5. **Perfil** (`/app/profile`)

> Nota: Biblioteca es secundaria y se accede desde Entreno/Nutrición (no como tab principal) para reducir ruido.

## 2) Mapa de rutas (sin inventar, solo “re‑entry points”)
### Core usuario final
- Auth: `/login`, `/register`, `/verify-email`
- App: `/app` (redirect a `/app/hoy`)
- Hoy: `/app/hoy`
- Entreno:
  - Lista/plan: `/app/entrenamientos` (o `/app/workouts`)
  - Detalle: `/app/entrenamientos/[workoutId]` o `/app/entrenamiento/[workoutId]`
  - Start: `/app/entrenamientos/[workoutId]/start`
  - Dashboard/semana: `/app/dashboard` (si ya existe)
  - Biblioteca entrenos: `/app/biblioteca/entrenamientos`
- Nutrición:
  - Hoy: `/app/nutricion`
  - Editar: `/app/nutricion/editar` (si aplica)
  - Dietas/planes: `/app/dietas`, `/app/dietas/[planId]`
  - Macros: `/app/macros`
  - Biblioteca recetas: `/app/biblioteca/recetas`
- Progreso: `/app/seguimiento`, `/app/weekly-review` (si existe)
- Perfil/Settings: `/app/profile`, `/app/settings`, `/app/settings/billing`
- Gym pilot: `/app/gym`

## 3) Reglas de navegación
- “Back” siempre vuelve a la pantalla anterior lógica, no a rutas inesperadas.
- Desde “Hoy”, entrar y salir de una tarea debe volver a “Hoy” con estado actualizado.
- Entreno/Nutrición: siempre ofrecer “Ir a hoy” como atajo.

## 4) Menú de Perfil (orden recomendado)
1. Cuenta
2. Suscripción/Billing
3. Preferencias (idioma/unidades)
4. Privacidad
5. Ayuda/Soporte
6. Logout

