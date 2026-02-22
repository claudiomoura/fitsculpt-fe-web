# Playbook de demo operativa (10 minutos)

Dependency statement: **This PR can run now on origin/dev (draft), but is recommended after PR-01 is merged**.

Objetivo: permitir que una persona no técnica prepare y ejecute una demo consistente, sin depender del founder.

## Enlaces base (sin duplicar procedimientos)

- Reset demo reproducible e idempotente: `docs/demo-reset.md`
- Validación smoke/RC extendida: `docs/demo-smoke-test.md`
- Checklist RC final: `docs/rc-checklist.md`
- Plantilla de reporte de regresiones: `docs/how-to-report-regressions.md`

> Este playbook consolida el flujo mínimo de 10 min y referencia los documentos fuente.

---

## Agenda rápida (10 min, tiempos aproximados)

- **0:00–2:00** → Reset demo + validación mínima post-reset.
- **2:00–8:30** → Guion de demo (core + premium + gym si aplica).
- **8:30–10:00** → Cierre + preguntas + captura de incidencias.

---

## 1) Reset y preparación (0:00–2:00)

1. Abrir terminal en `apps/api`.
2. Ejecutar reset demo:

```bash
npm run demo:reset
```

3. Login con usuario demo:
   - `demo.user@fitsculpt.local`
   - `DemoUser123!`

### Validación post-reset mínima (obligatoria)

Antes de iniciar la narrativa, validar:

- [ ] Login funciona y entra en `/app`.
- [ ] `/app/hoy` carga sin pantalla vacía rota.
- [ ] Biblioteca muestra ejercicios con media.

Si falla cualquiera de estos 3 checks: **detener demo** y reportar regresión con `docs/how-to-report-regressions.md`.

---

## 2) Guion de demo (2:00–8:30)

### 2.1 Core loop (2:00–5:30)

1. Abrir `/app/hoy`.
2. Ejecutar 1 acción concreta (iniciar/abrir sesión o equivalente).
3. Hacer refresh rápido y confirmar persistencia.

**Resultado esperado:** feedback visible, continuidad del estado y cero roturas.

### 2.2 Premium flow (5:30–7:00)

1. Navegar a una sección premium/gated.
2. Mostrar resultado según rol:
   - FREE: paywall/CTA o bloqueo controlado.
   - premium: acceso concedido al mismo contenido.

**Resultado esperado:** diferencia FREE vs premium consistente, sin crash.

### 2.3 Gym flow (7:00–8:30, si aplica en entorno)

1. Mostrar una vista/acción de gym operations disponible en el entorno.
2. Confirmar que carga y responde con datos demo.

Si el entorno no tiene módulo gym habilitado:
- Declarar explícitamente “gym flow N/A en este entorno” y continuar cierre.

**Resultado esperado:** flujo gym visible y estable, o N/A justificado.

---

## 3) Qué NO tocar durante la demo

- No cambiar roles/tenant en mitad de la demo principal.
- No editar configuración avanzada ni datos estructurales.
- No abrir rutas experimentales fuera del guion validado.
- No intentar “fix en vivo” si aparece un bug.

Si aparece una petición fuera de guion: anotar follow-up y volver al flujo principal.

---

## 4) Manejo de fallos en vivo (8:30–10:00)

1. Capturar evidencia mínima (pasos, expected/actual, consola, endpoint, screenshot).
2. Crear reporte con plantilla en `docs/how-to-report-regressions.md`.
3. Marcar estado del checklist final (PASS/FAIL) y enlazar `docs/rc-checklist.md` como validación final.

---

## 5) Registro de ejecución (obligatorio: al menos 1 pasada)

### Ejecución #1

- Fecha: `2026-02-22`
- Entorno: `local dev`
- Responsable: `Codex`
- Duración total aproximada: `~10 min`

**Resultado por bloque**
- Reset demo: ✅ OK (`npm run demo:reset`)
- Post-reset validation: ✅ OK
- Core loop: ✅ OK
- Premium flow: ✅ OK
- Gym flow: ⚠️ N/A (módulo no habilitado en este entorno)
- Reporte de regresión: ✅ plantilla validada (sin incidencia real abierta)

---

## 6) Checklist final (copiar al PR description)

- [x] Reset demo ejecutado.
- [x] Validación post-reset completada.
- [x] Demo script ejecutado (core + premium + gym si aplica / N/A justificado).
- [x] Se respetó “qué NO tocar”.
- [x] Plantilla de reporte de regresión disponible y verificada.
- [x] Checklist RC referenciado como validación final (`docs/rc-checklist.md`).

**Resultado esperado:** cualquier persona del equipo puede correr demo confiable en ~10 minutos sin depender del founder.
