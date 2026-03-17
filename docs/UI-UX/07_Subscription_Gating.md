# Suscripción & Gating (backend‑driven) – v1

## Regla de oro
**La UI nunca adivina**. Se basa en `auth/me` y entitlements reales.

## Planes detectados (fuente backend)
- FREE
- STRENGTH_AI
- NUTRI_AI
- PRO

## Reglas UX
- Si una acción está bloqueada:
  - Mostrar card “Locked” con beneficio + CTA a Billing
  - No mostrar botones que fallen “al final”
- Al desbloquear:
  - Volver al punto de bloqueo con estado actualizado

## Lugares de gating
- Generación IA (fitness/nutri) si aplica
- Edición avanzada si aplica

