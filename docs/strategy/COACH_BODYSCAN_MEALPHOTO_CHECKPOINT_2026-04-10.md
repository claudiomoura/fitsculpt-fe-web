# Checkpoint 2026-04-10: Coach, Body Scan, Meal Photo

## Estado

- `Coach` ya es la superficie principal de interaccion conversacional IA de alta intencion.
- `Feed` queda mas ligero y actua como superficie de descubrimiento + `daily tip` + entrypoint hacia `Coach`.
- `Body Scan` entra en una fase mas madura: ya no es solo captura guiada, sino una capacidad modular con contrato persistido, analytics y consumo reutilizable desde varias superficies.
- `Meal photo analysis` queda endurecido en dos capas:
  - resiliencia de producto: fallback editable para timeout, upstream o contract drift;
  - gobernanza IA: entitlement de nutricion, precheck de tokens, quota diaria y cobro real tras ejecucion.

## Implementado en este checkpoint

### 1. Coach surface

- Ruta activa: `/app/coach`.
- Reusa el chat contextual existente.
- Mantiene gating premium/tokens y desacopla la conversacion IA del `Feed`.

### 2. Body Scan maturity

- La capacidad ya dispone de contrato persistido y `status envelope`.
- El rollout actual permite tratar Body Scan como capability reutilizable y no como UI aislada dentro de Tracking.
- La fase actual debe entenderse como `estimation-ready`: capture + orchestration + fallback + analytics, lista para evolucionar su inteligencia sin rehacer la arquitectura.

### 3. Meal photo hardening

- Endpoint backend: `POST /meals/analyze-photo`.
- Nueva politica aplicada:
  1. `aiNutritionDomainGuard`
  2. estimacion minima de tokens para `meal-photo-analysis`
  3. validacion de balance suficiente
  4. control de quota diaria
  5. cobro de uso tras ejecucion exitosa del proveedor
- El fallback degradado se mantiene solo para fallos del modelo/contrato/upstream y no para saltarse la politica premium.

## Como probar

### Backend contract

- Ejecutar `node --import tsx apps/api/src/tests/mealPhotoAnalyze.contract.test.ts`.
- Cobertura esperada:
  - respuesta AI valida;
  - fallback por baja confianza;
  - fallback por upstream;
  - fallback por contract drift;
  - bloqueo `403` por entitlement/auth;
  - bloqueo `429` por politica de tokens/quota.

### Web/BFF contract

- Ejecutar `npm --prefix apps/web run test -- mealPhotoAnalyzeBff.contract.test.ts`.
- Cobertura esperada:
  - 5xx del backend cae a fallback editable estable;
  - `422` se propaga tal cual;
  - `429` de politica IA se propaga sin convertirlo en fallback;
  - abort/timeout cae a fallback editable.

### UI smoke

- Abrir `Quick Log` y adjuntar una foto.
- Con usuario premium de nutricion y tokens: la foto debe autocompletar comida/macros/items.
- Con usuario sin acceso o sin tokens: debe aparecer error de indisponibilidad IA, no una estimacion falsa.
- Con fallo upstream/controlado: debe devolverse una estimacion editable degradada para no bloquear el registro manual.

## Riesgos abiertos

- `Quick Log` todavia no abre un modal comercial/de compra cuando el bloqueo viene por tokens; hoy muestra mensaje compacto.
- La politica usa estimacion minima por feature (`meal-photo-analysis`) y no reserva previa estricta; queda alineada con el patron backend actual, pero no con una futura reserva transaccional completa.
