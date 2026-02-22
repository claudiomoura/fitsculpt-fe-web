# Postmortem Template (P0)

**Uso:** completar en < 30 minutos para cualquier incidente P0 una vez estabilizado.

## 1) Datos básicos

- Incident ID:
- Fecha/hora inicio (UTC):
- Fecha/hora resolución (UTC):
- Duración total:
- IC:
- Owner técnico:
- Severidad: P0

## 2) Resumen ejecutivo

- Qué falló:
- Impacto usuario/negocio:
- Estado final:

## 3) Timeline (UTC)

- HH:MM — detección
- HH:MM — clasificación P0
- HH:MM — mitigación aplicada
- HH:MM — servicio estable
- HH:MM — validación final

## 4) Causa raíz (breve)

- Causa raíz confirmada:
- Factores contribuyentes:
- Cómo se detectó:

## 5) Mitigación y validación

- Mitigación inmediata:
- ¿Hubo rollback?: sí/no
- Validación ejecutada:
  - Smoke: `docs/demo-smoke-test.md`
  - E2E/suite afectada: `docs/e2e.md`
  - CI/job: `.github/workflows/pr-quality-gates.yml`

## 6) Acciones preventivas

| Acción | Owner | Fecha objetivo | Estado |
|---|---|---|---|
|  |  |  | Open |

## 7) Comunicación

- Canal de incidentes:
- Link ticket:
- Link PR/hotfix:
