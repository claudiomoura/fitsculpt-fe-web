# SPRINT 01 – Architecture Notes (Frontend/UI only)

Este documento é derivado de:
- SPRINT_01_PLAN.md
- ARCHITECTURE_OVERVIEW.md
- AI_RULES.md
- DO_NOT_TOUCH.md
- DEFINITION_OF_DONE.md

Linhas vermelhas:
- Não mexer em auth / fs_token / OAuth Google
- Não criar endpoints nem alterar backend
- Frontend chama sempre via `/api/*` (BFF)
- Não inventar dados/campos, esconder secções vazias

---

## 1) Impacto técnico

- Backend: sem alterações
- Base de dados / Prisma: sem alterações
- Frontend: impacto alto na UI/UX da Biblioteca (lista + detalhe), estados e mobile-first

---

## 2) Áreas do repo a tocar

Nota: no repo real, estas pastas vivem em `apps/web/src/`.

- `apps/web/src/app/`: rotas/layouts da Biblioteca (lista + detalhe como página ou modal)
- `apps/web/src/components/`: componentes reutilizáveis (cards, placeholders, skeletons, empty/error states)
- `apps/web/src/lib/`: helpers UI e utilitários para lidar com dados opcionais
- Camada de API client: usar a pasta já existente no repo (se houver `apps/web/src/services/`, usar; se não houver, usar o client já existente em `lib/`)

---

## 3) O que NÃO fazer agora

- Não introduzir lógica de domínio no cliente
- Não criar “shapes” alternativos por screen nem inventar campos
- Não tocar em auth, cookies, guards, login, OAuth
- Não alterar comportamento do BFF nem criar novas rotas `/api/*`

---

## 4) Contratos e dados

- Todas as chamadas passam por `/api/*`
- Apenas endpoints existentes
- Se campos vierem ausentes (media/descrição/grupo muscular), UI resolve com:
  - placeholder consistente
  - esconder secções vazias

---

## 5) Ordem recomendada de implementação

1. Localizar a rota atual da Biblioteca e o service/api client usado hoje (sem alterar comportamento)
2. Criar/ajustar componentes base:
   - ExerciseCard (imagem/placeholder + nome + grupo muscular)
   - MediaPlaceholder
   - Skeletons (lista/detalhe)
   - EmptyState e ErrorState (mensagem + CTA neutro)
3. Implementar lista com estados (US1, US3, US4)
4. Implementar detalhe (US2) como página ou modal, sem campos vazios visíveis
5. Esconder secções sem conteúdo real (US5)
6. Polir navegação mobile (US6)
7. Validar Definition of Done (build/lint/typecheck e teste manual mínimo)

---

## 6) Riscos e mitigação

- Risco crítico: quebrar sessão/auth tocando em cookies/login/guards
  - Mitigação: tratar como intocável, não alterar
- Risco: inventar dados para fechar UI
  - Mitigação: placeholders + esconder secções vazias
- Risco: violar regra `/api/*`
  - Mitigação: garantir chamadas via camada existente de API client, sem chamadas diretas ao backend

---

## 7) Checklist técnico final

- build/lint/typecheck OK
- Biblioteca: lista + detalhe abre para 1 exercício
- estados loading/empty/error presentes
- sem regressões em auth e navegação
- zero “coming soon” e zero campos vazios/fake visíveis