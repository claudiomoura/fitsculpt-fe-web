# Weekly Review — Protocolo de evaluación (dissertação)

## Dependency statement

This PR depends on PR-03 being merged

## Objetivo

Evaluar si **Weekly Review** mejora adherencia temprana y toma de acciones en el loop core, sin claims clínicos y sin capturar PII.

## Hipótesis

- **H1 (engagement):** usuarios que abren Weekly Review muestran mayor tasa de `core action` semanal (WCAA proxy) que usuarios comparables sin uso de Weekly Review.
- **H2 (acción):** entre quienes abren Weekly Review, la tasa de recomendaciones `accepted` supera a `dismissed` en al menos una categoría de recomendación.
- **H3 (no regresión):** la introducción de Weekly Review no degrada el core loop (`/app/hoy`) en smoke/E2E lite.

## Variables y definición operacional

### Variable independiente

- Exposición a Weekly Review (`weekly_review_opened`).

### Variables dependientes

- **WCAA proxy** (definición base en Sprint 6/8): usuario con >=1 core action en semana ISO.
- **Activation D0–D2** (cohorte nuevos): >=1 core action en 72h.
- **W1 proxy**: retorno D6–D8 para activados D0–D2.
- **Weekly Review decisions:** conteo de `weekly_review_recommendation_decision` por `decision=accepted|dismissed`.

### Covariables sugeridas (agregadas)

- Tipo de plan/entitlement (FREE vs premium/gym), en agregado semanal.
- Semana calendario ISO y TZ fija de reporte.

## Instrumentación mínima (sin plataforma nueva)

Dado que no hay provider analytics dedicado en esta base:

- Se instrumenta proxy local en frontend con eventos:
  - `weekly_review_opened`
  - `weekly_review_recommendation_decision` (`accepted|dismissed`, `recommendationId`)
- Persistencia de evidencia en `localStorage` (`fitsculpt.weeklyReview.events`, buffer últimos 50).
- Revisión QA por DevTools/localStorage + E2E lite de carga.

> Esta instrumentación es de producto y **no** usa datos de salud identificables ni PII.

## Métricas y criterios de éxito/fracaso

### Éxito mínimo (MVP medible)

- Existe captura verificable de apertura Weekly Review y decisiones accept/ignore (proxy local verificable).
- E2E lite de Weekly Review PASS (carga pantalla + regreso a `/app/hoy` sin ruptura).
- Smoke/runbook actualizado con paso Weekly Review.

### Señales cuantitativas esperadas (primer ciclo)

- `weekly_review_opened` presente en >=1 sesión de prueba por release candidate.
- Ratio `accepted / (accepted + dismissed)` reportable semanalmente (aunque sea proxy manual).
- Sin caída material visible en WCAA proxy en semana inmediatamente posterior al release (monitoreo, no causalidad fuerte).

### Fracaso/alerta

- No hay evidencia reproducible de eventos de apertura/decisión.
- E2E lite falla de forma sistemática en carga de Weekly Review.
- Weekly Review rompe navegación del core loop o aumenta incidencias críticas en smoke.

## Diseño de observación y periodo

- **Tipo:** observacional pre/post con cohortes semanales (no A/B formal en este PR).
- **Periodo mínimo recomendado:** 2 semanas cerradas (Week N vs Week N+1).
- **Unidad de análisis:** usuario-semana (agregado), con corte ISO semanal.
- **Interpretación:** resultados son proxy operativos; no afirmar causalidad clínica.

## Ética y privacidad

- No registrar PII (email, nombre, ids externos sensibles, texto libre de salud).
- Mantener datos agregados para reporte semanal y debugging local restringido.
- No emitir recomendaciones médicas ni claims clínicos; IA es asistiva de hábitos.
- En documentación/demo, evitar lenguaje de diagnóstico/tratamiento.

## Plan de verificación QA

1. Ejecutar reset demo/dataset.
2. Login demo, abrir `/app/weekly-review`.
3. Verificar en localStorage evento `weekly_review_opened`.
4. Ejecutar `Accept`/`Not now` y validar eventos de decisión.
5. Navegar a `/app/hoy` y confirmar core loop operativo.
6. Ejecutar E2E lite de Weekly Review en local/CI.

## Evidencia requerida en PR

- Link a este protocolo (`docs/research/weekly-review-protocol.md`).
- Output del E2E lite PASS (o warning explícito si entorno no disponible).
- Evidencia de eventos/proxy (`fitsculpt.weeklyReview.events` en localStorage).
