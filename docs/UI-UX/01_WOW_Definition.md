# FitSculpt “WOW” – Definición de producto (v1)

> Objetivo: convertir FitSculpt en una experiencia **premium, mobile‑first, clara y simple**,
> con un **core loop diario** que maximice adherencia (hábito) y percepción de valor.
> Este documento NO inventa funcionalidades: **reordena, simplifica y estandariza** lo que ya existe
> en rutas y capacidades detectadas en la auditoría.

## 1) Qué significa “WOW” (en 10 frases medibles)
1. En **<10s** el usuario entiende *qué hacer hoy* y tiene **1 CTA principal**.
2. Completar el “día” requiere **≤3 acciones** (Entreno, Nutrición, Check‑in).
3. Cada acción termina con **feedback**: guardado, progreso del día, racha.
4. El usuario nunca ve “pantalla vacía” sin una **explicación + CTA**.
5. Errores siempre son **humanos** y con **Reintentar** (sin códigos crudos).
6. El calendario/plan existe, pero es **secundario** frente a ejecutar “Hoy”.
7. Tracking es **rápido**: 1 tarea por pantalla, confirmación inmediata.
8. La suscripción se entiende: **lo bloqueado coincide con el entitlement** (backend‑driven).
9. La app se siente consistente: mismos spacing, cards, tipografías, estados.
10. “WOW” también es fiabilidad: sin roturas de auth/sesión, sin consola roja, sin regressions.

## 2) Principios UX (mobile‑first)
- **Una decisión por pantalla**.
- **CTA sticky** cuando haya formulario o progreso (Guardar / Siguiente).
- **Jerarquía fija**: Título → estado → acción → detalle.
- **Menos texto, más estructura** (chips, bullets, labels).
- **Nada de features a medias visibles**: si no está listo, no se muestra.

## 3) Core loop diario (North Star)
**Hoy → Acción → Confirmación → Hoy**
- Acción 1: Entrenar (si hay sesión asignada hoy)
- Acción 2: Nutrición (registrar o seguir plan)
- Acción 3: Check‑in (peso/energía/sueño/notas)

KPI de hábito:
- % usuarios que completan 1 acción en primeras 24h
- % usuarios que completan 2/3 acciones en 7 días
- Retención D1/D7 y racha media

## 4) Arquitectura mental (para el usuario)
- **HOY** = ejecutar (corto)
- **ENTRENO** = plan + calendario + sesión (estructura)
- **NUTRICIÓN** = hoy + plan semanal (estructura)
- **PROGRESO** = resumen, no edición pesada
- **PERFIL** = ajustes, cuenta, billing, logout

## 5) Definición de “premium”
Premium = consistencia + velocidad + claridad + micro‑feedback + control.
No es “más pantallas”; es **menos fricción**.

