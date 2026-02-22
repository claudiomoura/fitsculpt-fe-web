# Playbook de demo operativa (10 minutos)

Dependency statement: **This PR can run now on origin/dev (draft), but is recommended after PR-01 is merged**.

Objetivo: permitir que cualquier persona del equipo prepare y ejecute una demo consistente sin depender del founder.

## Enlaces base (no duplicar procedimientos)

- Reset demo reproducible e idempotente: `docs/demo-reset.md`
- Smoke/recorrido RC extendido (si hace falta más profundidad): `docs/demo-smoke-test.md`
- Flujo de demo para inversionista (mensaje narrativo): `docs/INVESTOR_DEMO_FLOW.md`
- Reporte de regresiones (plantilla): `docs/how-to-report-regressions.md`

---

## Agenda rápida (10 min)

- **Min 0:00–2:00** → Reset demo + confirmación mínima post-reset.
- **Min 2:00–8:30** → Recorrido recomendado de producto.
- **Min 8:30–10:00** → Cierre + preguntas + captura de incidencias.

---

## 1) Preparación y reset (0:00–2:00)

1. Abrir terminal en `apps/api`.
2. Ejecutar reset demo:

```bash
npm run demo:reset
```

3. Login con usuario demo:
   - `demo.user@fitsculpt.local`
   - `DemoUser123!`

### Post-reset validation mínima (obligatoria)

Antes de empezar la demo, validar solo esto (rápido):

- El login funciona y entra en `/app`.
- En `/app/hoy` existe contenido utilizable (no pantalla vacía rota).
- En biblioteca hay ejercicios con media visible.

> Si cualquiera de estos 3 puntos falla, parar demo y registrar regresión usando `docs/how-to-report-regressions.md`.

---

## 2) Recorrido recomendado de demo (2:00–8:30)

### 2.1 /app/hoy (2:00–4:00)

**Qué mostrar**
- Resumen diario.
- Una acción concreta (ej.: abrir/iniciar sesión o interacción equivalente).
- Confirmar feedback visual y continuidad tras refresh rápido.

**Qué decir (guion corto)**
- “El usuario tiene su operación diaria en una sola vista”.
- “No es solo plan estático: hay loop de ejecución y seguimiento”.

### 2.2 Plan de entrenamiento (4:00–5:30)

**Qué mostrar**
- Vista de plan y un día con ejercicios.

**Qué decir**
- “El plan es accionable y aterrizado al día a día”.

### 2.3 Nutrición (5:30–7:00)

**Qué mostrar**
- Registro/seguimiento nutricional y progreso visible.

**Qué decir**
- “Nutrición y entrenamiento viven en el mismo flujo operativo”.

### 2.4 Biblioteca o detalle de ejercicio (7:00–8:30)

**Qué mostrar**
- Ejercicio con media y detalles útiles.

**Qué decir**
- “La biblioteca soporta ejecución correcta, no solo catálogo”.

---

## 3) Qué NO tocar durante la demo

Para reducir riesgo en vivo:

- No editar configuraciones avanzadas ni datos estructurales.
- No cambiar de rol/tenant en mitad de la demo.
- No abrir features experimentales o rutas fuera del flujo validado.
- No improvisar con datos no reseteados.

Si piden algo fuera de guion: anotar como follow-up y seguir con el recorrido principal.

---

## 4) Manejo de fallos en vivo

Si aparece bug o comportamiento inconsistente:

1. No intentar “arreglar en vivo”.
2. Capturar evidencia mínima (pasos + expected/actual + consola + screenshot).
3. Registrar de inmediato con la plantilla en `docs/how-to-report-regressions.md`.

---

## 5) Checklist final (completar en PR / ejecución)

- [ ] Reset demo ejecutado correctamente (≈1 min).
- [ ] Post-reset validation mínima completada (≈1 min).
- [ ] Recorrido principal `/app/hoy` + plan + nutrición + biblioteca (≈6.5 min).
- [ ] Se respetó “qué NO tocar” (≈0 min extra).
- [ ] Se documentó cualquier issue con plantilla de regresiones (≈1.5 min si aplica).

**Resultado esperado:** cualquier persona del equipo puede ejecutar una demo confiable en 10 minutos.
