# Support/Triage plan (post-release week 1)

## Objetivo

Estandarizar respuesta a incidentes del core durante 24–72h iniciales y primera semana post-release.

## Roles y responsabilidad

- **Incident Commander (IC):** QA owner del sprint (o su backup).
- **Frontend on-call:** diagnóstico UI, sesión y superficie `/app`.
- **Backend on-call:** diagnóstico API/persistencia (`/api/tracking`, billing, auth backend).
- **Release owner:** decide freeze/release forward/rollback.

## Severidades y SLAs objetivo

| Severidad | Definición | Tiempo de ack | Objetivo de mitigación | Objetivo de actualización |
|---|---|---:|---:|---:|
| **P0** | caída total o bloqueo del flujo core para mayoría de usuarios | <= 15 min | <= 60 min (workaround o rollback) | cada 30 min |
| **P1** | degradación severa parcial (auth/session/core action con impacto relevante) | <= 30 min | <= 4 h | cada 60 min |
| **P2** | incidencia menor, workaround disponible, sin bloqueo crítico del core | <= 4 h hábiles | <= 2 días hábiles | 1-2 updates/día |

## Flujo de triage

1. **Detectar** (monitoring checklist diario o reporte soporte).
2. **Clasificar** (P0/P1/P2).
3. **Asignar owner** (IC + FE/BE on-call).
4. **Mitigar** (hotfix mínimo o rollback controlado).
5. **Comunicar** estado en canal oficial.
6. **Cerrar** con evidencia + acciones de prevención.

## Plantilla de incidente (usar en cada P0/P1/P2)

```md
# Incident <ID> - <P0|P1|P2>

- Fecha/hora detección:
- Reportado por:
- Canal:
- Estado: Investigating | Mitigated | Monitoring | Resolved

## Resumen
- Qué pasó:
- Impacto usuario/negocio:
- Superficies afectadas:

## Timeline
- HH:MM - detección
- HH:MM - clasificación
- HH:MM - mitigación aplicada
- HH:MM - verificación

## Diagnóstico técnico
- Hipótesis:
- Evidencia (logs/repros/capturas):
- Causa raíz (si aplica):

## Mitigación
- Acción inmediata:
- ¿Se aplicó rollback?: sí/no
- Riesgos residuales:

## Seguimiento
- Owner:
- Próxima actualización:
- Postmortem requerido: sí/no
```

## Criterios de escalado

- Escalar a **P0** si el core no puede completarse de forma confiable.
- Escalar a **P1** si auth/sesión o persistencia falla intermitentemente con impacto visible.
- Mantener en **P2** si no compromete flujo core y existe workaround seguro.

## Definición de “resuelto”

Una incidencia solo cierra cuando:
- smoke funcional vuelve a PASS,
- no se observan regresiones en checks consecutivos,
- estado y evidencia quedan documentados en canal + ticket.
