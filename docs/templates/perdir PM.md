Actúa como mi Product Manager principal (nivel senior, orientado a resultados), para FitSculpt (app mobile-first de entrenamiento + nutrición con IA). Ya terminé la MVP y necesito definir la siguiente fase del producto.

OBJETIVO ESTRATÉGICO
- Construir una app disruptora que pueda competir con las top 10 del mercado en fitness y nutrición, en una sola.
- En paralelo, habilitar una Dissertação de Mestrado: necesito una línea de innovación clara, medible y defendible académicamente. Debe proponer funcionalidades nuevas o mejoras sustanciales (o una combinación), que no estén bien resueltas en las apps actuales, y que permitan evaluación con métricas.

RESTRICCIONES Y CONTEXTO
- No inventes datos técnicos que no estén en los documentos que te paso.
- Prioriza enfoque mobile UX premium, robustez, entitlements/gating por plan, y capacidad de demo impecable.
- Stack (contexto): Next.js App Router (frontend) con BFF en /app/api, backend Fastify + Prisma. Entitlements actuales en backend: FREE, STRENGTH_AI, NUTRI_AI, PRO.
- La fase siguiente debe ser ejecutable por sprints y con DoD claro.

INPUTS (pego debajo)
1) MVP Done vs Gap Audit Matrix (RC Readiness) [DOCUMENTO 1]
2) Auditoría completa FitSculpt (producto + UX + arquitectura + contratos + calidad) 2026-02-22 [DOCUMENTO 2]
3) Referencia de mercado: lista de líderes (fitness, nutrición, mixto) y rangos de precio/ARPU (no asumas exactitud, úsalo como marco comparativo) [DOCUMENTO 3]

LO QUE NECESITO QUE ME ENTREGUES (formato obligatorio)
A) NORTH STAR Y POSICIONAMIENTO
1) North Star Metric propuesta (1 métrica principal) y 3-5 métricas de apoyo (activation, retention, habit, revenue proxy).
2) Público objetivo inicial (1-2 segmentos) y “job-to-be-done”.
3) Propuesta de valor diferencial (en 1 frase y en 5 bullets).

B) “FASE 2” DEFINIDA COMO PRODUCTO
4) Nombre de la fase y “Phase Goal” en 2-3 frases.
5) 3 apuestas (bets) máximas, ordenadas por impacto: cada apuesta con hipótesis, por qué nos hace top-tier, y cómo se valida.
6) Alcance: IN/OUT (muy explícito). Lo que NO haremos aunque sea tentador.

C) ROADMAP EJECUTABLE (6 a 10 semanas)
7) Plan por sprints (mínimo 3, máximo 5). Para cada sprint:
   - Sprint Goal
   - Epics
   - Top 10 historias (con criterios de aceptación)
   - Dependencias y riesgos
   - Métricas de salida (cómo sabemos que el sprint fue éxito)

D) INNOVACIÓN PARA LA DISSERTAÇÃO (la parte crítica)
8) Propón 3 líneas de innovación candidatas (tipo “research track”), cada una con:
   - Qué problema no resuelven bien las apps top
   - Qué propone FitSculpt (feature o sistema)
   - Qué datos necesitaríamos (sin PII, o con mitigación)
   - Cómo se evalúa (métricas, experimento, A/B, estudio usuario, offline eval)
   - Riesgos éticos y de privacidad, y mitigaciones
9) Recomiéndame 1 línea principal (y 1 secundaria) y justifica por viabilidad + diferenciación + valor producto.

E) CALIDAD, CONTRATOS Y ENTITLEMENTS (obligatorio)
10) Lista priorizada de “gates” de release para esta fase:
   - build/lint/typecheck/tests mínimos
   - contract tests FE-BFF-BE
   - smoke tests E2E (manual o automatizado)
11) Propuesta concreta para entitlements/gating “backend-driven”:
   - tabla de capabilities por plan (FREE/STRENGTH_AI/NUTRI_AI/PRO) y CTA de upsell
   - cómo evitar rutas duplicadas y features visibles sin permiso
   - si “Bundle” o “Gym tier” debe existir como plan, o como rol, y cómo lo modelarías sin reventar el sistema

F) ENTREGABLE FINAL
12) Termina con un “One-pager” (máximo 1 página) listo para compartir con equipo e inversores, resumiendo fase, apuestas, métricas y plan.

IMPORTANTE
- Usa solo lo que se deduce de los documentos. Cuando asumas algo, márcalo como “Assunção” y di qué evidencia falta.
- Prioriza quick wins que suban percepción premium y reduzcan riesgo técnico (por ejemplo, bugs P0 de media, duplicidad de rutas, contract drift).
- Redacta en español, pero si propones la parte académica, puedes incluir términos en portugués cuando sea natural.

A CONTINUACIÓN TE PEGO LOS DOCUMENTOS 1, 2 y 3:
[PEGA AQUÍ: DOCUMENTO 1]
[PEGA AQUÍ: DOCUMENTO 2]
[PEGA AQUÍ: DOCUMENTO 3]