# Backlog (Epics → Stories → Sprints) – v1

## EPIC 1: Core loop “Hoy” premium
### Story 1.1 – Hoy con 3 cards y progreso 1/3
- Como usuario, quiero ver qué hacer hoy y hacerlo rápido.
**AC**
- Solo 3 cards (Entreno/Nutrición/Check‑in)
- Cada card: estado + CTA único
- Progreso del día visible

### Story 1.2 – Estados UI estandarizados en Hoy
**AC**
- Loading skeleton
- Empty con CTA a configurar plan
- Error con Reintentar
- Success toast

## EPIC 2: Entreno (Semana → Día → Sesión → Cierre)
### Story 2.1 – Vista Semana ligera
### Story 2.2 – Detalle día + CTA sticky “Empezar”
### Story 2.3 – Start workout focus mode (inputs + siguiente)
### Story 2.4 – Finalizar sesión + confirmación

## EPIC 3: Nutrición (Hoy + registro rápido)
### Story 3.1 – Nutrición hoy con macros compactas
### Story 3.2 – Registro rápido (1 pantalla) + confirmación

## EPIC 4: Progreso simplificado (3 tabs)
### Story 4.1 – Tab Check‑in rápido
### Story 4.2 – Resumen Nutrición
### Story 4.3 – Resumen Entreno

## EPIC 5: Biblioteca secundaria (descubrir → guardar)
### Story 5.1 – Lista con search/filtros (si ya existe)
### Story 5.2 – Detalle + CTA guardar

## EPIC 6: Gating y billing coherente
### Story 6.1 – Locked states backend‑driven
### Story 6.2 – Retorno post-upgrade al punto de bloqueo

## EPIC 7: Calidad (DoD) y flujos principales sin regressions
- Tests smoke: login → hoy → entreno start → guardar → back
- Sin errores consola en flujos core

