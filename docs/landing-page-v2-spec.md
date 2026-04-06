# FitSculpt Landing Page V2 - Specification

## Overview
Complete redesign of the landing page to match premium 2025 aesthetics. Replaces the basic 2020-style landing with a modern, luxury-inspired design featuring dark mode, gold accents, and professional UI components.

---

## Design System

### Colors
```css
:root {
  /* Backgrounds */
  --bg-primary: #0b0e13;      /* Deep charcoal - main bg */
  --bg-surface: #1a1a1c;      /* Surface for cards */
  --bg-elevated: #242426;     /* Elevated surfaces */
  
  /* Text */
  --text-primary: #f5f5f0;    /* Warm off-white */
  --text-secondary: #6e6e70;  /* Secondary text */
  --text-muted: #4a4a4c;     /* Muted/disabled */
  --text-tertiary: #3a3a3c;  /* Very muted */
  
  /* Accents */
  --accent-gold: #c9a962;    /* Primary gold accent */
  --accent-gold-deep: #8b7845; /* Gold gradient end */
  --accent-sage: #6e9e6e;    /* Success/positive metrics */
  
  /* Borders */
  --border-subtle: #3a3a3c;
  --border-default: #2a2a2c;
}
```

### Typography
- **Headings**: Inter, weights 300-800
- **Body**: Inter, weight 400-500
- **Display/Metrics**: Cormorant Garamond (optional for premium feel)
- **Type Scale**:
  - Hero Title: 56px / 800 weight
  - Section Title: 42px / 300 weight
  - Card Title: 18px / 600 weight
  - Body: 16px / 400 weight
  - Caption: 13px / 400 weight

### Spacing
- Section padding: 80px vertical, 80px horizontal
- Card padding: 24px
- Gap between elements: 16-24px
- Border radius: 20px (cards), 26px (buttons), 40px (phone mockup)

---

## Component Specifications

### 1. Hero Section

**Layout**: Two-column grid (left content, right phone mockup)
- Desktop: 60/40 split with 60px gap
- Mobile: stacked vertically

**Left Content**:
- Title: "Tu Entrenador IA" - 56px, #f5f5f0
- Subtitle: "Transforma tu cuerpo con planes de entrenamiento y nutrición personalizados generados por inteligencia artificial." - 18px, #6e6e70
- CTAs: Two buttons side by side
  - Primary (gold): "Empezar Gratis" - #c9a962 bg, #0b0e13 text
  - Secondary: "Ver Demo" - #242426 bg, #f5f5f0 text, 1px border #3a3a3c

**Right Content - Phone Mockup**:
- Device: 280px × 560px, 40px border-radius
- Frame: #1a1a1c fill, 2px #3a3a3c border
- Screen: 256px × 536px, 32px border-radius, #0b0e13 fill
- App UI mockup showing:
  - "FITSCULPT" header (14px, #c9a962)
  - "HOY" title (32px, #f5f5f0)
  - Stats: "450 kcal" "45 min" in sage green
  - CTA button: "Iniciar Entrenamiento"

**Floating Badge**:
- Position: bottom-right of phone (overlapping)
- Content: ⭐ "4.8 App Store"
- Style: #242426 bg, 18px radius, 140px × 36px

**Background**:
- Solid #0b0e13 with subtle radial gradient overlay
- Optional: animated mesh gradient in gold/blue

---

### 2. Social Proof Bar

**Layout**: Centered row
- Height: 120px
- Background: #0b0e13

**Content**:
- Label: "Más de 10,000 usuarios confían en FitSculpt" - 14px, #6e6e70
- Logos: FORBES, WIRED, TECHCRUNCH, MEN'S HEALTH (16px, #4a4a4c)

**Styling**:
- Grayscale logos, subtle opacity
- Even spacing: 60px gap between logos

---

### 3. Features Section

**Layout**: 4-column grid (4 cards in row)
- Desktop: 4 columns × 280px each, 24px gap
- Tablet: 2 columns × 2 rows
- Mobile: 1 column

**Card Style**:
- Size: 280px × 280px
- Background: #242426 (glassmorphism-ready)
- Border-radius: 20px
- Padding: 24px
- Gap between icon/title/desc: 16px

**Card Content**:
- Icon: 32px emoji or Lucide icon
- Title: "IA Personalizada" - 18px, #f5f5f0, font-weight 600
- Description: 13px, #6e6e70, line-height 1.5

**Features List**:
1. 🤖 IA Personalizada - "Algoritmos que adaptan tu plan a tu progreso real y preferencias."
2. 🍎 Nutrición Inteligente - "Planes de comida personalizados basados en tus objetivos y gustos."
3. 📊 Seguimiento Real - "Métricas detalladas y analytics para entender tu evolución."
4. 👥 Comunidad Activa - "Retos mensuales, leaderboards y soporte de otros atletas."

**Hover Effects**:
- Scale: 1.02
- Box-shadow: 0 8px 32px rgba(201, 169, 98, 0.1)
- Transition: 0.3s ease

---

### 4. Testimonial Section

**Layout**: Two-column card (image left, content right)
- Card size: 900px × 320px
- Gap: 40px
- Background: #242426, 24px radius

**Left Column** (400px):
- Image placeholder: 400px × fill, 16px radius, #1a1a1c bg
- Shows 📸 or user photo

**Right Column** (flex):
- Quote mark: "“" - 64px, #c9a962
- Quote text: 18px, #f5f5f0, line-height 1.6
- Author: 14px, #6e6e70
- Stars: 5×⭐, 18px each, #c9a962

**Quote**: "FitSculpt cambió completamente mi forma de entrenar. En 3 meses logré resultados que no había conseguido en 1 año."
**Author**: "— Carlos M., Usuario Premium"

---

### 5. Final CTA Section

**Layout**: Centered vertical stack
- Padding: 80px all sides
- Background: #0b0e13

**Title**: "¿Listo para transformar tu cuerpo?" - 48px, #f5f5f0, font-weight 300

**Subtitle**: "Únete hoy y obtén tu primer mes gratis" - 18px, #6e6e70

**Form** (500px wide):
- Input: 320px × 52px, #242426 bg, 1px #3a3a3c border, 26px radius
  - Placeholder text: "tu@email.com" - 14px, #4a4a4c
- Button: 160px × 52px, #c9a962 bg, 26px radius
  - Text: "Empezar" - 16px, #0b0e13, font-weight 600
- Gap: 12px

**App Store Badges**:
- Two buttons side by side: " App Store" and "▶ Google Play"
- Style: 48px height, 12px radius, #242426 bg, 1px #3a3a3c border
- Gap: 16px

---

### 6. Footer

**Layout**: Centered single line
- Height: 60px
- Background: #0b0e13
- Text: "© 2026 FitSculpt. Todos los derechos reservados." - 12px, #4a4a4c

---

## Animations & Interactions

### CSS Transitions
```css
.feature-card {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.feature-card:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 32px rgba(201, 169, 98, 0.15);
}

.cta-button {
  transition: background 0.3s ease, transform 0.2s ease;
}

.cta-button:hover {
  background: linear-gradient(180deg, #d4b472, #c9a962);
  transform: translateY(-2px);
}
```

### Scroll Animations (optional)
- Fade-in-up on scroll for each section
- Staggered animation for feature cards

### Loading States
- Skeleton loaders for images
- Subtle shimmer effect on cards

---

## Responsive Breakpoints

```css
/* Desktop: 1120px+ */
.hero-inner { grid-template-columns: 1.05fr 0.95fr; }
.features-grid { grid-template-columns: repeat(4, 1fr); }

/* Tablet: 768px - 1119px */
.hero-inner { grid-template-columns: 1fr; }
.features-grid { grid-template-columns: repeat(2, 1fr); }
.testimonial-card { grid-template-columns: 1fr; }

/* Mobile: < 768px */
.features-grid { grid-template-columns: 1fr; }
.cta-form { flex-direction: column; }
.hero-ctas { flex-direction: column; }
```

---

## Implementation Priority

### Phase 1: Core Styling (High Priority)
1. Update CSS variables in globals.marketing.css
2. Implement Hero section with phone mockup
3. Implement Features grid with glassmorphism

### Phase 2: Social & Testimonials (Medium Priority)
4. Add Social Proof bar with logos
5. Implement Testimonial card
6. Add Final CTA section

### Phase 3: Polish (Lower Priority)
7. Add animations and hover effects
8. Implement responsive breakpoints
9. Add loading states

---

## Files to Modify

| File | Changes |
|------|---------|
| `apps/web/src/app/globals.marketing.css` | Add new CSS variables and component styles |
| `apps/web/src/components/landing/LandingHomePage.tsx` | Update component structure |
| `apps/web/src/components/landing/Button.tsx` | Update button variants |
| `apps/web/src/components/landing/Card.tsx` | Add glassmorphism card style |
| `public/branding/` | Add phone mockup screenshot, update logos |

---

## Success Metrics

- Lighthouse Performance: > 90
- Mobile responsiveness: Pass all breakpoints
- Accessibility: AA compliant
- Conversion: Track CTA click-through rate
