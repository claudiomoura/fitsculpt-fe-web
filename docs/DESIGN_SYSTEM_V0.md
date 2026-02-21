# Design System v0 (pragmático)

Esto no es un design system pesado. Es un set mínimo para que TODO se vea consistente.

## 1) Tokens actuales
Definidos en `src/app/globals.css` (`:root` y `.theme-dark`):
- Colores base (bg, card, text, muted, border)
- Accent (`--accent`, `--accent-strong`, `--accent-soft`)
- Sombras y radios
- Badges, botones, inputs

## 2) Decisiones v0 (para look premium)
- Escala tipográfica:
  - H1: 28-32 (card titles)
  - H2: 20-22 (section titles)
  - H3: 16-18 (card headings)
  - Body: 14-16
  - Muted: 12-13
- Radios:
  - Card: 16
  - Buttons: 12
  - Pills: 999
- Spacing:
  - 8, 12, 16, 20, 24, 32
- Estados:
  - Empty: card con icon, título, 1 frase, CTA.
  - Loading: skeleton o texto muted.
  - Error: texto muted + CTA “reintentar”.

## 3) Componentes base (a crear)
- `PageHeader` (título, subtítulo, acciones)
- `CardHeader` (h2 + subtítulo + acción a la derecha)
- `StatCard` (valor grande + label muted + pill)
- `EmptyState` (título, texto, CTA)
- `Pill` (estado: under, exact, over)
- `ListItem` (para lista premium en móvil)

## 4) Reglas de implementación
- Evitar estilos inline salvo casos excepcionales.
- No duplicar reglas en CSS (ej: `.segmented-control` aparece 2 veces en `globals.css`).
- Copy siempre por i18n, incluso placeholders y fallbacks.
