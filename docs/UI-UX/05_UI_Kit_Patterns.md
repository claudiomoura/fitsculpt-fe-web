# UI Kit & Patterns (mobile) – v1

## 1) Tokens (design system mínimo)
- Spacing: 4, 8, 12, 16, 24
- Radius: 12 (cards), 10 (inputs), 999 (chips)
- Tipografía (jerarquía):
  - H1 (pantalla)
  - H2 (sección)
  - Body
  - Caption (labels)

## 2) Componentes base
- AppHeader (título + acciones)
- Card (con estado: pending/done/locked)
- PrimaryButton (sticky)
- SecondaryButton
- ChipFilter
- ListRow (icono + título + meta + chevron)
- Skeleton (card/list)
- Toast (success)
- InlineError (con reintentar)

## 3) Patrones
### CTA Sticky
Siempre visible al hacer scroll en:
- Start workout (Siguiente / Guardar)
- Formularios (Guardar)

### Empty State (plantilla)
- Título: “Aún no hay X”
- 1 línea: beneficio
- 1 CTA: acción concreta

### Error State (plantilla)
- “Algo salió mal”
- 1 línea: “No pudimos cargar…”
- CTA: Reintentar
- Link opcional: Soporte

## 4) Dark mode (reglas)
- Fondo: near‑black
- Superficie card: dark gray
- Texto: off‑white
- Acento: 1 color
- Contraste AA mínimo en texto y chips

