# Flujos (End‑to‑End) – v1

## Flow 0: Primera sesión (onboarding mínimo)
`/register` → `/verify-email` → `/app/onboarding` → `/app/hoy`

Requisitos UX:
- Progreso 1/3, 2/3, 3/3 (máximo)
- Preguntas mínimas (objetivo, nivel, preferencias básicas)
- Final: “Tu semana está lista” o “Tu plan está listo” (según lo que exista)
- CTA: “Ir a Hoy”

## Flow 1: Loop diario (North Star)
`/app/hoy`
1) CTA Entrenar → detalle → start → sesión → finalizar → confirmación
2) CTA Nutrición → registrar o revisar → guardado → confirmación
3) CTA Check‑in → guardar → confirmación
→ vuelve a `/app/hoy` con progreso 1/3, 2/3, 3/3

## Flow 2: Plan semanal de entreno (calendario)
`/app/entrenamientos` (o `/app/dashboard`)
- Vista Semana (default) → toque día → detalle sesión → start

## Flow 3: Registro de comida rápido
`/app/nutricion` → “Registrar” → buscar/añadir → guardar → vuelve a Nutrición con macros actualizadas

## Flow 4: Biblioteca (consulta → acción)
`/app/biblioteca` → buscar/filtrar → detalle → “Guardar” o “Usar en entreno” (solo si ya existe)

## Flow 5: Billing / Paywall (backend‑driven)
Cualquier acción premium → gating → `/app/settings/billing` (o paywall existente)
- Mensaje: qué se desbloquea
- CTA: “Mejorar plan”
- Tras pago: volver al punto de bloqueo

## Flow 6: Gym pilot (si aplica)
`/app/gym` → unirse → confirmación → acceso a gestión permitida por rol

