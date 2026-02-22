# Post-release monitoring plan (Week 1)

**Dependency statement:** This PR can run now on origin/dev

## Alcance y estado de tooling

- Estado actual: **no hay plataforma de observabilidad integrada** en este repo (ej. Sentry/Logflare/PostHog).
- Decisión: no se introduce tooling nuevo en este PR.
- Resultado: se usa un **proxy operativo manual temporal** basado en señales ya existentes y revisión diaria disciplinada.
- Estado: **Requiere implementación** (observabilidad automatizada futura).

Referencias base:
- Runbook GO/NO-GO: `docs/rc-runbook-go-no-go.md`
- Métricas/eventos Sprint 6: `docs/metrics-rc.md`, `docs/metrics-definition.md`

## Indicadores mínimos (obligatorios)

> Objetivo: detectar degradación del core en primeras 24–72h.

1. **Auth/session failures**
   - Qué mirar: fallas de login/sesión expirada inesperada/errores de acceso a `/app`.
   - Proxy actual: revisión de incidencias reportadas + smoke operativo rápido diario.

2. **Core action failures**
   - Qué mirar: fallas al completar acción core con persistencia.
   - Proxy actual: validación funcional sobre flujos de tracking en app + contraste con escrituras esperadas vía `/api/tracking`.

3. **Tracking write failures**
   - Qué mirar: requests fallidos (4xx/5xx) en `/api/tracking` y discrepancias de persistencia.
   - Proxy actual: chequeo manual en DevTools/QA smoke y revisión de estado backend.

4. **Gated attempts / upgrade CTA (si aplica)**
   - Qué mirar: intentos de features bloqueadas, clics en CTA upgrade y señales indirectas de checkout.
   - Proxy actual: contraste de superficies premium + señales en `/api/billing/status` y `/api/billing/checkout`.

## Rutina diaria (primera semana)

- **Ventana recomendada:** 09:30 y 16:30 (2 checks/día) durante D+1 a D+7.
- **Responsable primario:** QA owner del sprint.
- **Backups:** FE on-call + BE on-call.
- **Canal oficial:** `#release-war-room` (o equivalente activo del equipo).

### Checklist operativo diario

1. Ejecutar smoke corto del core (`login -> /app -> acción core persistida -> validación gating/plan`).
2. Revisar indicadores mínimos (auth/session, core action, tracking writes, gated/CTA).
3. Registrar resultado en bitácora diaria:
   - hora,
   - estado (OK/Investigate),
   - impacto estimado,
   - owner.
4. Si hay anomalía, abrir triage según `docs/release/triage.md`.

## Qué mirar + qué hacer si pasa X (mitigación rápida)

| Señal detectada | Umbral práctico | Acción inmediata |
|---|---:|---|
| Fallas repetidas de login/sesión | >=3 reportes válidos en 2h | Abrir incidente P1, activar FE/BE on-call, validar auth guard y sesiones activas. |
| Acción core no persiste | >=2 repros consecutivos en smoke | Abrir P0/P1 según alcance, freeze parcial de release, rollback si afecta flujo principal. |
| `/api/tracking` con errores | ratio de fallos visible en smoke/repro | Revisar backend y payload, aplicar hotfix mínimo, revalidar persistencia end-to-end. |
| Aumento de intentos gated sin conversión | tendencia anómala 24h | Revisar copy/CTA/entitlements; si rompe UX core, tratar como P2 con fix priorizado. |

## Proxy manual temporal (hasta observabilidad real)

- Ejecutar un mini-runbook diario basado en:
  - `docs/demo-smoke-test.md`
  - `docs/rc-checklist.md`
  - señales de `docs/metrics-rc.md`
- Consolidar hallazgos en un único hilo/canal para preservar trazabilidad.
- Escalar severidad con la tabla de `docs/release/triage.md`.
