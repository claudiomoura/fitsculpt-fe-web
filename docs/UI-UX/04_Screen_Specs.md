# Screen Specs (mobile) – v1
Formato por pantalla:
- Objetivo
- Layout (jerarquía)
- Acciones
- Estados (loading/empty/error/success)
- Copy (microcopy)
- Analítica (eventos)
- DoD específico (checklist)

---

## 1) /app/hoy – Hub diario
**Objetivo:** en <10s el usuario entiende qué hacer hoy y ejecuta una acción.

### Layout
1. Header: saludo + racha (si existe)
2. Card 1 (primaria): Entrenar (si hay sesión)
3. Card 2: Nutrición (pendientes / CTA registrar)
4. Card 3: Check‑in rápido (peso/energía/sueño)
5. Progreso del día (1/3)

### Acciones
- Empezar entreno
- Registrar comida
- Completar check‑in

### Estados
- Loading: skeleton de 3 cards
- Empty: si no hay plan → CTA “Configurar plan” (link a onboarding/entrenos)
- Error: “No pudimos cargar tu día” + Reintentar
- Success: toast “Guardado” y card marcada “Hecho”

### Copy clave
- “Hoy te toca: …”
- “Completa 1 acción para mantener tu racha”

### Eventos
- hoy_view
- hoy_cta_entreno_click
- hoy_cta_nutricion_click
- hoy_cta_checkin_click

---

## 2) Entreno – vista Semana (entrypoint: /app/entrenamientos o /app/dashboard)
**Objetivo:** ver semana y entrar a la sesión del día.

### Layout
- Selector Semana (default)
- Grid L‑D con estado (hecho/pendiente/descanso)
- Lista “Próximo” (1 item)
- CTA: start del próximo entreno (si aplica)

### Estados
- Empty: “No hay plan aún” + CTA “Generar/Seleccionar plan”
- Error: “No pudimos cargar tu plan” + Reintentar

### Eventos
- workout_week_view
- workout_day_open
- workout_start_from_week

---

## 3) Entreno – detalle día (workout detail)
(entrypoints existentes: `/app/entrenamientos/[workoutId]` o `/app/entrenamiento/[workoutId]`)
**Objetivo:** revisar ejercicios y empezar.

### Layout
- Título + duración
- Lista ejercicios (nombre + sets/reps)
- CTA sticky “Empezar sesión”

### Estados
- Loading: skeleton lista
- Error: “No pudimos cargar tu sesión” + Reintentar

---

## 4) Entreno – start (modo focus)
`/app/entrenamientos/[workoutId]/start`
**Objetivo:** registrar series sin fricción.

### Layout
- Header: nombre + timer
- Bloque ejercicio actual
- Inputs kg/reps por serie
- CTA: Siguiente (sticky)
- Descanso (opcional si ya existe)

### Estados
- Offline/error: “Guardaremos al recuperar conexión” (solo si existe soporte; si no, bloquear con mensaje simple)

---

## 5) /app/nutricion – Nutrición hoy
**Objetivo:** registrar rápido y ver macros.

### Layout
- Objetivo del día
- Listado comidas con CTA “Registrar”
- Resumen macros (compacto)
- Link a plan semanal (si existe en `/app/dietas`)

### Estados
- Empty: “Crea tu plan semanal” + CTA
- Error: “No pudimos cargar nutrición” + Reintentar

---

## 6) /app/seguimiento – Progreso (3 tabs)
**Objetivo:** ver tendencia y completar check‑ins.

Tabs:
- Check‑in (inputs rápidos + Guardar)
- Nutrición (promedios)
- Entreno (completados, tiempo)

---

## 7) /app/biblioteca – biblioteca
**Objetivo:** descubrir y guardar.
- Search + filtros
- Lista
- Detalle (`/app/biblioteca/[exerciseId]`)

Empty state: “Guarda 3 favoritos”.

---

## 8) /app/profile + /app/settings
**Objetivo:** control y confianza.
- Cuenta
- Preferencias
- Billing (`/app/settings/billing`)
- Logout

---

## 9) Auth screens
/login, /register, /verify-email
**Objetivo:** cero fricción y confianza.
- Errores claros
- CTA principal único
- Validación inline

