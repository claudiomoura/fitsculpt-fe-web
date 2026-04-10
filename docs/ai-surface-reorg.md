# Reorganizacion incremental de superficies IA

## Objetivo

Separar la IA conversacional del `Feed` para que el feed quede como superficie ligera de consumo y descubrimiento, mientras que la experiencia de preguntas y seguimiento viva en una superficie mas adecuada tipo `Coach`.

## Implementado

- `Feed` mantiene:
  - resumen/generacion de contenido
  - `daily tip` IA
  - CTA visible hacia `FitSculpt Coach`
- Nueva superficie `Coach` en `/app/coach`:
  - reutiliza el endpoint contextual existente `/api/ai/chat/contextual`
  - cambia el `surface` enviado al backend de `feed` a `coach`
  - conserva gating Pro/tokens y el modal de agotamiento
- `Settings > Support` ahora enlaza tambien a `FitSculpt Coach`, dejando una integracion clara con ayuda/soporte incluso cuando no exista `NEXT_PUBLIC_SUPPORT_URL`.
- `Quick Log` mantiene el analisis de foto de comida como una capacidad separada de nutricion, pero ahora depende de la misma politica backend de IA (`nutrition entitlement -> token precheck -> quota -> charge`) que el resto de superficies premium.

## Decision de producto/UX

- `Feed` pasa a ser una superficie de lectura ligera y activacion pasiva.
- `Coach` concentra la interaccion de alta intencion con IA.
- La migracion es incremental porque no cambia contratos backend ni elimina el `daily tip`.
- El analisis por foto no se mueve a `Coach`, pero queda alineado con el mismo modelo de gobernanza IA/tokens para evitar una superficie premium paralela sin control.

## Como probar

- Ir a `/app/coach` y validar que la experiencia conversacional sigue usando la superficie `coach` y conserva gating/token exhaustion.
- Ir a `Quick Log` desde Today/Feed, adjuntar una foto de comida y ejecutar `Analizar foto` con un usuario `NUTRI_AI` con tokens.
- Repetir la prueba con usuario sin entitlements o sin tokens y validar que backend devuelve `403/429` en vez de caer a fallback silencioso.
- Confirmar que errores upstream/timeout/contract drift siguen devolviendo respuesta editable degradada para no bloquear el registro.

## Riesgos conocidos

- El backend sigue aceptando multiples valores de `surface`; la personalizacion especifica para `coach` depende de como se evolucione el prompt server-side.
- No se migro todavia analitica/eventing de uso por superficie, si existiera fuera de este flujo.
- `Quick Log` todavia muestra un mensaje compacto cuando la politica IA bloquea la operacion; si producto quiere CTA comercial o modal de compra, hay que conectarlo explicitamente en frontend.
