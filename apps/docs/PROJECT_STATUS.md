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
  - **Módulo de progresso de peso no Dashboard (parcial — depende de existirem registos de peso)**
- Treino:
  - Planos
  - Calendário
  - Vistas de dia, agenda, semana e mês
- Nutrição:
  - Plano base
  - Integração no dashboard

- Biblioteca de exercícios (funcional; UX premium **em progresso**)
  - **Media viewer (GIF e vídeo) em full screen (implementado)**
  - **Página de detalhe com layout avançado (implementado)**
    - **Secção “overview” no detalhe (implementado)**
    - **Entry points condicionais para abrir media em full screen (implementado)**
    - **Fallback de erro consistente quando o exercício não existe (ID em falta/inválido) (implementado)**
    - **Secções condicionais (mostrar apenas conteúdo real) (implementado/melhorado)**
    - **Acessibilidade melhorada nas tabs (implementado/melhorado)**
  - **Sistema de favoritos e recentes (implementado)**
    - **Estados loading/empty/error consistentes + feedback de ação + disabled states (implementado)**
    - **Hooks de storage expõem loading/error/refresh para estados consistentes (implementado)**
  - **Skeletons mais consistentes e mais próximos do layout final (melhorado)**
  - **Touch targets e sizing ajustados para estabilidade percebida (melhorado)**

- Tracking básico (peso)
  - **Entrada de peso + último registo + histórico com estados completos (parcial — frontend; dependente de backend/dados reais)**

- Ecrã Hoje
  - **Shell do Hoje com quick actions / CTA (parcial — frontend)**
  - **“Resumo do dia” (treino/nutrição/peso) com loading/empty/error/skeleton (parcial — frontend; dependente de dados)**

- Design system próprio:
  - Button, Card, Badge, Skeleton, Modal, Toast, etc.
- i18n (ES e EN)
- Dark mode
- Layout mobile-first já implementado

### Não implementado ou incompleto
- UX premium da Biblioteca de Exercícios (**em progresso** — falta polish final e fechar edge cases restantes)
- Tracking (peso) end-to-end (**em progresso** — UI pronta; falta confirmar integração completa com dados reais e persistência)
- Polimento consistente de estados:
  - empty
  - error
  - loading
  - (**em progresso** — cobertura avançou na Biblioteca e também no Hoje/Tracking/Dashboard; falta cobertura total e polish final em superfícies remanescentes)
- Performance percebida (skeletons consistentes, feedback imediato) (**em progresso** — melhorias em Biblioteca e Hoje; falta consistência total)

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

### Sprint 02: Tracking (peso) + Hoje/Dashboard (MVP)

Prioridade máxima:
- Tracking de peso **end-to-end** (valor real demonstrável)
- Ecrã Hoje com bloco de peso + CTA (uso diário)
- Dashboard com progresso de peso (leitura semanal rápida)
- Estados consistentes (loading/empty/error) e feedback claro
- Mobile-first premium (dark mode, a11y, i18n)
- Zero risco técnico: **sem alterações de backend**

Progresso (parcial):
- **Tracking (peso): UI de entrada + último registo + histórico com estados completos (parcial; dependente de dados reais)**
- **Hoje: shell + “Resumo do dia” com loading/empty/error/skeleton (parcial; dependente de dados)**
- **Dashboard: módulo de progresso de peso (parcial; depende de existirem registos)**
- **Estados/skeletons já avançaram na Biblioteca e começaram a expandir para outras superfícies**

Objetivo do sprint:
> Tornar o Tracking de peso utilizável de ponta a ponta e integrar no Hoje/Dashboard com estados consistentes, pronto para demo.

---

## 6. O que NÃO é prioridade agora

- Novas features de backend
- Pagamentos e billing
- App mobile nativa
- Growth, SEO ou marketing