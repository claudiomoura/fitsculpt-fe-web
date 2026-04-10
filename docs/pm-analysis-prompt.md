# Prompt de Análisis Profundo para FitSculpt

Este documento es un **prompt executable** que puedes copiar y usar en una sesión de agente con acceso al repositorio de FitSculpt para realizar un análisis profundo desde múltiples perspectivas expertas.

---

## Contexto del Proyecto

**FitSculpt** es una aplicación de fitness y nutrición que incluye:
- Seguimiento de progreso (check-ins, peso, métricas corporales)
- Planes de entrenamiento y nutrición generados por IA
- Body scan y análisis de composición corporal
- Integración con wearables (Google Fit, Apple Health)
- Weekly review con proyección de resultados
- Recomendaciones personalizadas
- Sistema de coaching conversacional

**Stack técnico**: Next.js, React, TypeScript, Node.js API, Prisma, PostgreSQL, AI/ML para planes y análisis.

**Repositorio**: `fitsculpt-fe-web`

---

## Instrucciones para el Agente

Eres un **equipo de expertos en uno** que analiza este proyecto desde 6 perspectivas simultáneas. Tu objetivo es producir un informe ejecutivo accionable.

### Perspectivas requeridas

1. **CEO / Fundador**
   - ¿Qué tiene la app que genera valor real?
   - ¿Dónde está el modelo de negocio?
   - ¿Qué features son diferenciales vs competencia?
   - ¿Qué priorizamos para规模化?

2. **Product Manager**
   - ¿Qué flujos funcionan y cuáles no?
   -¿Dónde está la fricción?
   - ¿Qué métricas importan?
   - ¿Qué está roto o a medio hacer?

3. **Arquitecto de Software**
   - ¿La arquitectura es sostenible?
   - ¿Dónde están los technical debts críticos?
   - ¿El código escala?
   - ¿El patrón de IA está bien implementado?

4. **Fitness & Nutrition Coach**
   - ¿Los planes y recomendaciones tienen sentido físico/deportivamente?
   - ¿Los cálculos de macros, calorías, progresión son correctos?
   - ¿El UX incentiva comportamiento sano?

5. **UI/UX Designer**
   - ¿La experiencia es intuitiva?
   - ¿Los patrones de navegación funcionan?
   - ¿Hay consistencias o caos visual?
   - ¿Mobile-first bien ejecutado?

6. **Analista de Competencia**
   - ¿Cómo se compara con Strava, MyFitnessPal, FitnessAI, Fitbit, Noom?
   - ¿Qué tienen ellos que no tenemos?
   - ¿Qué tenemos yo que ellos no?

---

## Tu Misión

Ejecuta este análisis siguiendo estos pasos:

### Paso 1: Exploración del Códigobase (30 minutos)
Explora las rutas principales:
- `apps/web/src/app/(app)/app/**` - todas las páginas
- `apps/web/src/domains/**` - lógica de dominio
- `apps/web/src/components/**` - componentes
- `apps/api/src/**` - backend

Documente:
- Estructura general y propósito de cada módulo
- Flujos principales de usuario
- Patrones de diseño usados

### Paso 2: Análisis por Perspectiva (cada una dedicada)

Para cada perspectiva, responde las preguntas específicas de arriba con evidencia del código.

### Paso 3: Síntesis y Priorización

Produzca:
- 5 problemas más críticos (con一下 impacto en usuario o negocio)
- 5 oportunidades más claras (donde invertir causa mayor impacto)
- Un roadmap sugerido en 3 fases (inmediato / 3 meses / 6 meses)

---

## Formato de Entrega

El informe debe seguir exactamente esta estructura:

```
# Informe de Análisis FitSculpt

## 1. Resumen Ejecutivo (200 palabras)
[Overview de hallazgos clave]

## 2. Análisis por Perspectiva

### 2.1 CEO / Fundador
[Análisis + puntuación 1-10 + evidencia del código]

### 2.2 Product Manager
[Análisis + puntuación 1-10 + evidencia del código]

### 2.3 Arquitecto de Software  
[Análisis + puntuación 1-10 + evidencia del código]

### 2.4 Fitness & Nutrition Coach
[Análisis + puntuación 1-10 + evidencia del código]

### 2.5 UI/UX Designer
[Análisis + puntuación 1-10 + evidencia del código]

### 2.6 Analista de Competencia
[Análisis + puntuación 1-10 + comparación]

## 3. Los 5 Problemas Más Críticos
[Problema | Evidencia | Impacto | Recomendación]

## 4. Las 5 Oportunidades Más Claras
[Oportunidad | Evidencia | Impacto | Esfuerzo]

## 5. Roadmap Sugerido

### Fase 1: Inmediata (0-4 semanas)
[Qué hacer]

### Fase 2: Crecimiento (1-3 meses)
[Qué hacer]

### Fase 3: Escala (3-6 meses)
[Qué hacer]

## 6. Métricas Recomendadas
[Métricas de producto a trackear]

## 7. Notas Técnicas
[Descubrimientos importantes sobre el código]

## 8. Archivos Clave Revisados
[Lista de archivos analizados]
```

---

## Reglas de Ejecución

1. **Sé riguroso**: Usa evidencia del código, no suposiciones
2. **Sé constructivo**: Enfatiza soluciones, no solo críticas
3. **Sé específico**: Cita archivos y funciones concretas
4. **Sé honesto**: Si no puedes verificar algo, dilo
5. **Sé accionable**: recomendaciones deben ser implementables

---

## Comandos Útiles

Para explorar el código:

```bash
# Ver estructura de páginas
ls -la apps/web/src/app/\(app\)/app/

# Ver dominios
ls -la apps/web/src/domains/

# Ver componentes
ls -la apps/web/src/components/

# Buscar patrones
grep -r "useClient" apps/web/src/app/\(app\)/app/ | head -20

# Contar líneas por módulo
find apps/web/src -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -n | tail -20
```

---

## Nota Importante

Este análisis debe completarse en **una sesión de máximo 2 horas**.

Si durante el análisis descubres algo que requiere implementación inmediata, documentarlo pero no ejecutar cambios de código como parte de este análisis (el objetivo es informar, no construir).

---

## Adjuntos de Contexto

El agente debe revisar también:
- Documentación existente en `docs/`
- Décisions previas en `docs/decisions/`
- Arquitectura en `docs/ARCHITECTURE_OVERVIEW.md`

---

*Usa este prompt tal cual para analizar FitSculpt desde todos los ángulos.*