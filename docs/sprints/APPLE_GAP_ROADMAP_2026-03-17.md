# Apple Gap Roadmap
Fecha: 2026-03-17
Owner: OpenCode
Contexto: roadmap de 4 sprints para cerrar el gap entre el estado premium actual de FitSculpt y un nivel de producto comparable con apps top-tier de consumo.

## North Star
Llevar FitSculpt de "beta premium fuerte" a "producto obsesivamente pulido" en 4 sprints, cerrando 4 gaps:
1. verdad total de producto
2. motion y tactilidad premium
3. editorial quality y narrativa emocional
4. QA/launch confidence al nivel de un producto serio de consumo

---

## Sprint D1 — Truth Lock

### Objetivo
Eliminar cualquier desalineación restante entre lo que el usuario ve y la verdad del sistema.

### Entra
- Cerrar meal completion/logging real en todas las superficies
- Revisar Today, Nutrition, Tracking, Dashboard y Weekly Review para que usen la misma fuente
- Eliminar copy residual heredado del modelo local-only
- Revisar workout completion para asegurar que todos los hubs leen sesiones terminadas reales
- Endurecer contratos runtime de tracking/nutrition

### Entregables
- Una sola fuente de verdad para comidas completadas y progreso nutricional
- Una sola fuente de verdad para entrenos completados
- Contract tests ampliados para tracking snapshot y mealLog
- Today/Tracking/Nutrition alineados visual y funcionalmente

### Acceptance Criteria
- Marcar una comida se refleja igual en Today, Nutrition y Tracking
- Finalizar un entreno se refleja igual en Today, Training y Progress
- No quedan banners o labels que sugieran estado local cuando ya no lo es
- No hay superficies core con datos heurísticos presentados como reales

### Riesgos
- Debt en superficies antiguas que aún lean snapshots parciales
- Need de migración ligera si existen stores locales legacy aún en uso

---

## Sprint D2 — Motion & Delight

### Objetivo
Hacer que la app no solo se vea premium, sino que se sienta premium.

### Entra
- Motion system ligero y consistente para Today, Nutrition, Tracking, Onboarding y Profile
- Staggered reveals en shells premium
- Transiciones entre steps/cards
- Success states con microcelebration sutil
- Transiciones focus mode -> success -> return loop
- Reduced motion compliance

### Entregables
- Shared motion tokens/utilities
- Motion aplicada a hero cards, banners, tabs y step flows
- Check-in success y meal completion con feedback más memorable
- Motion guidelines cortas en docs

### Acceptance Criteria
- Cada pantalla core tiene entrada visual consistente
- Check-in y meal completion tienen feedback visible y elegante
- No hay motion agresiva o gratuita
- `prefers-reduced-motion` queda respetado

### Riesgos
- Sobrecargar la UI con motion innecesaria
- Crear inconsistencias si no se centraliza el patrón

---

## Sprint D3 — Editorial Quality

### Objetivo
Subir el nivel de lenguaje, jerarquía y narrativa emocional a estándar top-tier.

### Entra
- Revisión completa de microcopy en Today, Nutrition, Tracking, Profile, Billing y Onboarding
- Reducir copy genérica o técnica
- Reescribir empty states para que orienten y motiven
- Reforzar mensajes de logro, progreso, consistencia y claridad comercial
- Ajustar headlines/subtitles para móvil

### Entregables
- Copy premium en superficies core
- Empty/error/success states más humanos y claros
- Language consistency en ES/EN/PT donde aplique
- Style guide corta de tono y microcopy

### Acceptance Criteria
- No quedan CTAs ambiguos o genéricos en superficies core
- Los estados vacíos siempre orientan a una acción útil
- Los success states refuerzan progreso, no solo confirman acción
- Billing comunica valor y continuidad sin parecer un flujo transaccional frío

### Riesgos
- Drift de traducciones
- Inconsistencia si solo se cambia una parte del funnel

---

## Sprint D4 — Launch Confidence

### Objetivo
Cerrar el gap de calidad operacional para beta seria y crecimiento medible.

### Entra
- Smoke e2e real del core loop con backend operativo
- QA visual screenshot-by-screenshot de pantallas core
- Analytics reales del funnel y activación
- Route regression checks para aliases/canonical routes
- Go/No-Go checklist final premium

### Entregables
- Smoke journeys verdes:
  - auth -> onboarding -> today
  - today -> workout -> finish
  - today -> nutrition -> meal completion
  - tracking/check-in -> today success return
  - premium block -> billing -> returnTo
- Analytics core conectados a proveedor real
- Checklist final de beta premium

### Acceptance Criteria
- Smoke real estable en CI/local controlado
- Screenshots QA aprobados para Today, Nutrition, Tracking, Profile, Billing, Onboarding
- Eventos core emitidos y documentados
- No quedan rutas core ambiguas sin owner o sin cobertura mínima

### Riesgos
- Infra demo/reset inestable
- Falsos negativos si el entorno local no refleja producción

---

## Orden recomendado de ejecución
1. D1 Truth Lock
2. D2 Motion & Delight
3. D3 Editorial Quality
4. D4 Launch Confidence

## Qué NO hacer antes de D1
- No invertir más tiempo en charts decorativos
- No hacer otro rediseño general de layout
- No añadir nuevas features premium sin cerrar verdad y QA

## Resultado esperado al final de D4
- App con verdad consistente en todas las superficies core
- Feeling premium claramente superior
- Funnel medible y smoke estable
- Beta lista para enseñar, cobrar e iterar con mucha más confianza
