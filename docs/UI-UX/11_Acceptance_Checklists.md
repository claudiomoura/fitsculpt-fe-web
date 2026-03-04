# Acceptance Criteria & DoD (para tickets) – v1

## Checklist UX por pantalla
- [ ] Un CTA principal visible sin scroll
- [ ] Jerarquía clara (título → estado → acción)
- [ ] Estados: loading/empty/error/success implementados
- [ ] Touch targets ≥ 44px
- [ ] Contraste AA (light + dark)
- [ ] Copys cortos y consistentes
- [ ] Navegación “back” coherente

## Checklist técnico (DoD)
- [ ] Build pasa
- [ ] Lint pasa
- [ ] Typecheck pasa
- [ ] Sin errores en consola en flujos principales
- [ ] No rompe rutas
- [ ] No rompe auth/sesión (`fs_token`)
- [ ] No rompe llamadas BFF `/api/*`
- [ ] Error handling consistente

