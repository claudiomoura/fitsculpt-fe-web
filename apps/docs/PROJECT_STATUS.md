# FitSculpt – Project Status

## 1. Visão (North Star)

FitSculpt é uma **web app mobile-first de treino e nutrição**, focada em UX premium, progressão clara e experiência comparável a apps líderes como FitnessAI ou Dr. Muscle.

### Objetivo do MVP
- Demonstrar valor real a utilizadores finais
- Ter qualidade visual e UX suficiente para demos a utilizadores e investidores
- Criar uma base sólida para futura evolução para app mobile nativa

---

## 2. Estado atual do produto

### Implementado
- Autenticação funcional (email e Google OAuth)
- Gestão de sessão estável via cookie (`fs_token`)
- Perfil de utilizador e onboarding base
- Dashboard com secções principais
- Treino:
  - Planos
  - Calendário
  - Vistas de dia, agenda, semana e mês
- Nutrição:
  - Plano base
  - Integração no dashboard
- Biblioteca de exercícios (funcional, UX ainda básica)
  - **Estados (loading/empty/error) mais consistentes na lista e no detalhe (parcial)**
  - **Skeletons mais consistentes para melhorar performance percebida (parcial)**
  - **Detalhe: comportamento melhorado de loading + secções condicionais (parcial)**
- Design system próprio:
  - Button, Card, Badge, Skeleton, Modal, Toast, etc.
- i18n (ES e EN)
- Dark mode
- Layout mobile-first já implementado
- the favorites/recents item is now implemented and should be reflected
- the full-screen media viewer and advanced detail layout polish are now implemented and should be reflected in the status doc.
- Media viewer (GIF e vídeo) em full screen (implementado)
- Página de detalhe com layout avançado (implementado)
- Sistema de favoritos e recentes (implementado)

### Não implementado ou incompleto
- UX premium da Biblioteca de Exercícios (**em progresso**)
- Polimento consistente de estados:
  - empty
  - error
  - loading
  - (**parcial** — base padronizada em lista+detalhe, falta cobertura total e polish final)
- Performance percebida (skeletons consistentes, feedback imediato) (**parcial**)

---

## 3. Stack técnica (não alterar sem decisão explícita)

### Frontend
- Next.js (App Router)
- React + TypeScript
- Tailwind CSS
- i18n interno baseado em ficheiros JSON

### Backend
- Backend já existente
- Fonte única da verdade
- Contratos e endpoints **não devem ser alterados neste momento**

### Infraestrutura
- Monorepo
- `apps/web` é o foco atual
- `apps/api` **não deve ser tocado neste sprint**

---

## 4. Linhas vermelhas (regras absolutas)

- Não tocar em autenticação, `fs_token`, OAuth, cookies ou middleware
- Não criar nem alterar endpoints
- Não mudar o shape das APIs existentes
- Frontend consome **exclusivamente** `/api/*`
- Não inventar dados que não venham do backend
- Todas as strings visíveis passam por i18n
- PRs pequenos, focados e facilmente reversíveis

Qualquer violação destas regras é considerada regressão.

---

## 5. Foco atual

### Sprint 01: Biblioteca de Exercícios (UI e UX)

Prioridade máxima:
- UX premium e consistente
- Mobile-first impecável
- Estados bem resolvidos:
  - loading
  - empty
  - error
- Zero risco técnico
- Nenhuma alteração de backend

Progresso (parcial):
- **Estados (loading/empty/error) padronizados na lista e no detalhe**
- **Skeletons mais consistentes para reduzir “layout jumps”**
- **Detalhe: secções condicionais (mostrar apenas conteúdo real) e loading melhorado**

Objetivo do sprint:
> Tornar a Biblioteca de Exercícios uma secção “wow”, pronta para demo.

---

## 6. O que NÃO é prioridade agora

- Novas features de backend
- Pagamentos e billing
- App mobile nativa
- Growth, SEO ou marketing