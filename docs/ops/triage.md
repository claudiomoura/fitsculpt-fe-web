# Triage Workflow (P0/P1/P2)

**Dependency statement:** This PR can run now on origin/dev.

Objetivo: responder incidentes sin caos, con SLAs y responsables claros, sin dependencia del founder.

## Canal oficial

- Canal único: `#incidents` (Slack/Teams) para coordinación en tiempo real.
- Ticket obligatorio por incidente (Jira/Linear/Issue) enlazado desde el tracker.
- IC publica updates en el canal según SLA.

## Roles

- **Incident Commander (IC):** coordina clasificación, asignación y comunicación.
- **FE on-call:** problemas UI/session/routing `/app`.
- **BE on-call:** problemas API/auth/persistencia/billing.
- **Release Owner:** decide rollback/freeze/release-forward.

## Severidad y SLA objetivo

| Sev | Definición | Respuesta inicial (ack) | Mitigación objetivo | Cadencia de updates |
|---|---|---:|---:|---:|
| P0 | Core roto para mayoría o caída total | **mismo día (<=15 min)** | <= 60 min (workaround o rollback) | cada 30 min |
| P1 | Degradación severa parcial con impacto alto | <= 30 min | <= 4 h | cada 60 min |
| P2 | Incidencia menor con workaround | <= 4 h hábiles | <= 2 días hábiles | 1-2 veces/día |

## Flujo operativo

1. **Detectar**
   - Fuente: soporte, monitoring o QA.
2. **Clasificar**
   - Aplicar P0/P1/P2 en <=5 min.
3. **Asignar**
   - Owner técnico (FE o BE) + IC.
4. **Mitigar**
   - Hotfix mínimo o rollback controlado.
5. **Verificar**
   - Ejecutar smoke (`docs/demo-smoke-test.md`) y checks e2e (`docs/e2e.md`) según impacto.
6. **Cerrar**
   - Actualizar tracker y cerrar ticket con evidencia.

## Criterios rápidos de severidad

- **P0**: login masivamente caído, app no usable, error crítico generalizado.
- **P1**: falla relevante en auth/persistencia/tracking con impacto parcial alto.
- **P2**: falla no bloqueante del core con workaround seguro.

## Escalado

- Si P1 supera SLA de mitigación o amplía impacto, escalar a P0.
- Si no hay fix seguro en ventana RC, ejecutar rollback y mantener estado `Monitoring`.
