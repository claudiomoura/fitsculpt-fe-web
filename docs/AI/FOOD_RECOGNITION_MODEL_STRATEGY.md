# Food Recognition Model Strategy

---

# 1. Opciones Estratégicas

## Opción A: Modelo Externo (API)
Pros:
- Rápido de lanzar
- Sin entrenamiento

Contras:
- Coste alto
- Menor control

---

## Opción B: Modelo Propio
Pros:
- Control total
- Coste a largo plazo menor

Contras:
- Alto coste inicial
- Necesita dataset

---

## Opción C: Híbrido (Recomendado v1)

- Usar modelo externo para detección
- Ajustar macros internamente
- Guardar dataset anonimizado
- Evolucionar a modelo propio en 12–18 meses

---

# 2. Roadmap Modelo

v1:
- Clasificación general alimentos
- Estimación porción básica

v2:
- Segmentación imagen
- Mejor estimación volumen

v3:
- Modelo personalizado por usuario