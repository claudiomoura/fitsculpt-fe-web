Fase X — “Premium Foundations” (Stability + Gating + Demo-Grade)

Qué era: convertir el MVP “frágil” en producto demo-estable, premium y verificable, con contratos mínimos y gating real por entitlements.

Incluye sprints 1–4 — DONE ✅

Sprint 1 (DONE): P0 Demo Stability

Fix imageUrl en biblioteca (placeholder solo si no hay imagen)

Contract test GET /exercises

Smoke test manual 5 flows + 0 console errors

Sprint 2 (DONE): Entitlements backend-driven + gating UX

Entitlements efectivos expuestos y usados por FE

UI oculta/bloquea features según plan + CTA coherente

Sprint 3 (DONE): Core loop E2E medible

Tracking write confirmado/implementado + FE conectado desde “Hoy”

Persistencia real + estados UI correctos

Ruta canonical de entrenamiento + redirects suaves

Sprint 4 (DONE): Gym pilot E2E + contract tests críticos + release gates

Join → accept → assign plan → user sees plan

CI gates mínimos (build/lint/typecheck FE + build/test BE)

Contract tests gym + smoke actualizado + 0 console errors

En qué punto estamos ahora (estado actual):

App está demo-ready (B2C core + entitlements + gym pilot)

Hay gates mínimos para evitar regressions

Contratos críticos están protegidos (pelo menos exercícios + gym)

Fase Y — “Release Candidate” (B2C ou Gym Piloto Real)

Qué es: pasar de “demo impecable” a “release real” con estabilidad operacional, datasets reproducibles y automatización mínima.

Incluye Sprint 5–6 — ACTUAL (próximo ciclo a iniciar)

Sprint 5 (propuesto) — “Release Candidate Hardening”

Estabilizar seed/dataset demo (reproducible, no accidental)

Expandir contract tests a endpoints críticos adicionais:

auth/me

tracking write

billing/status (si aplica)

E2E automation ligera (1–2 flows) para “no romper demo”

Sprint 6 (propuesto) — “Observabilidad + Performance + RC Checklist”

Telemetría mínima (errores, funnels core, eventos de gating) (si no existe hoy)

Checklist RC: performance mobile, estados vacíos, errores, edge cases básicos

Documentación operativa (cómo demoear, cómo resetear seed, cómo validar)

Decisión que desbloqueia Fase Y: escoger el foco:

Y1: Release Candidate B2C (métricas, estabilidad, performance, billing listo)

Y2: Piloto Gym real (1 gym) (onboarding operativo, roles, playbook de operación)

Fase Z — “Differentiation / Research Track” (Dissertação + Top-tier)

Qué es: construir la innovación medible (dissertação) encima de una base sólida, sin comprometer calidad.

Incluye Sprint 7–9 — TO BE DONE

Track principal recomendado (de lo anterior): Adherencia inteligente (Weekly Review)

Ajuste semanal basado en señales (workouts completados, tracking, food log)

Evaluación: WCAA, W1, %≥3 días/semana, completion rate

Track secundario: IA confiable (robustez del pipeline JSON validado)

Métricas de schema-pass, fallback rate, retries, impacto en completion/satisfacción

Resumen ultra-ejecutivo (1 minuto)

Hemos hecho: 4 sprints que convierten FitSculpt en demo premium: fix P0 de media, entitlements reales, core loop con tracking persistente, gym pilot E2E, contract tests y CI gates mínimos.

Dónde estamos: Phase X DONE ✅ (demo y estructura sólida).

Siguientes pasos: iniciar Phase Y (Release Candidate) eligiendo dirección (B2C release o Gym piloto real) y ejecutar Sprint 5–6 de hardening (seed reproducible, más contract tests, 1–2 E2E automatizados, checklist RC). Luego Phase Z para innovación/dissertação.