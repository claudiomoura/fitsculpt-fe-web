# FitSculpt Progress Surfaces Redesign - Wireframe V1

## /app/seguimiento — New Design

### Screen: Progreso (Hub Diario)

---

### A. Hero Section
- **Title**: Progreso
- **Status line** (1 line):
  - "Vas bien esta semana" OR
  - "Necesitas más datos" OR
  - "Toca revisar consistencia"
- **Primary CTA**: [Registrar check-in]

---

### B. Quick Metrics Row
Four metric chips in a row:

| Peso | Cambio | Adherencia | Esta semana |
|------|-------|-----------|-----------|
| 85.0 kg | -0.5 kg | 17% | 3/30 días |

---

### C. Main Trend Module
Tab navigation: Peso | Nutrición | Entreno

**Default view (Peso tab):**
- 1 line chart (30 days)
- 1 insight: "Peso estable"
- Supporting chips: 5 check-ins · -0 kg · 17%

---

### D. Next Best Action Card
**Card title**: Tu mejor siguiente paso  
**Content**: "Completa un check-in más esta semana para mejorar la lectura"  
**Secondary CTA**: [Más info] → expands

---

### E. Secondary Previews

#### 1. Weekly Review Preview
- Status: "Pendiente" / "Lista"
- 3-line summary
- CTA: [Abrir revisión semanal]

#### 2. Body Scan Preview
- Fat: 22.1%
- Confidence: Media
- CTA: [Ver reporte]

---

### F. Details (Collapsed)
Accordion sections:
- Passive health
- Historial detallado
- Análisis profesional
- Metodología

---

## /app/seguimiento/body-scan-report — New Design

### Screen: Body Scan Report

---

### A. Report Header
- **Title**: Body Scan
- **Subtitle**: "Última lectura: 27/04/2026"
- **Sources**: 1 fuente
- **Confidence**: Media
- **Primary CTA**: [Actualizar fotos] or [Nuevo escaneo]

---

### B. Main Result
- **Body fat**: 22.1%
- **Range**: 18.2% - 26.0%
- **Lean mass**: 66.2 kg
- **Fat mass**: 18.8 kg

---

### C. What It Means
3 bullets max:
- "Lectura compatible con objetivo de recomposición"
- "La señal aún es media - faltan más datos"
- "Necesitas más consistencia en logging"

---

### D. Next Step
1 clear action:
- "Completar estimación manual de body fat"

---

### E. Recommended Plan
- **Recommendation**: "Estabiliza consistencia antes de escalar"
- **Priority**: High/Medium/Low
- **CTA**: [Aplicar plan IA]

---

### F. AI Scan Tool (Secondary)
- Title: "Escaneo completo premium"
- **CTA**: [Abrir scan completo]
- Visual: clearly marked as optional tool

---

### G. Details (Collapsed)
- Metodología
- Notas
- Inputs
- Disclaimer
- Model notes

---

## /app/weekly-review — New Design

### Screen: Revisión Semanal

---

### A. Header
- **Title**: Revisión semanal
- **Date range**: "semana del 20/04 al 27/04"
- **Status**: Pendiente | Completada | Necesita decisión

---

### B. Week Summary
4 mini-cards:

| Adherencia | Peso/Cintura | Nutrición | Energía |
|-----------|-------------|-----------|---------|
| 17% | -0.5 kg | 0% | 3.0/3.0 |

---

### C. Decision Cards (Primary)
Max 3 cards:

**Card 1**:
- **Recommendation**: "Aumentar frecuencia de entreno"
- **Why**: "Frecuencia por debajo de referencia del perfil"
- **Evidence chips**: 2 sesiones · objetivo 4 · actual 2
- **Confidence**: 75%
- **Actions**: [Aceptar] [Mantener]

**Card 2** (if applicable):
- ...

---

### D. Supporting Evidence (Collapsed)
- Reasoning detail
- Safety notes
- Metrics breakdown
- Body scan context
- Trend details

---

### E. Optional Support
- Projection summary link
- Coach context link
- Body scan link

---

### F. Research/Admin (Hidden by default)
- RCT panel
- Export options
- Expert mode

---

## Design Principles Summary

### Above the fold (mobile)
- Max 3 major blocks
- Max 1 CTA primary
- Max 1 chart
- Max 1 paragraph per card

### Cards
Each card = ONE of:
- status, OR
- action, OR
- insight, OR
- detail

### Typography
- Max 2 lines of explanatory text per section on mobile
- Use bullets not paragraphs
- Use chips not repeated text

### CTA Hierarchy
- 1 primary per screen
- 1-2 secondary max
- rest as links or collapsed