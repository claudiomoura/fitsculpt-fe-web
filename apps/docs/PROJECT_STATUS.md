# FitSculpt – Project Status (Atualizado)
Data: 2026-02-14  
Branch de referência: `work` (reportado como consolidado após PR-1A..PR-5)  
Owner: Founder/PM (FitSculpt)

> Nota de rigor: este status reflete o que foi concluído nos PRs mencionados por ti (PR-1A, PR-1B, PR-2, PR-3, PR-4, PR-5). Se quiseres que eu marque “VALIDADO” com evidência, pede-me e eu preparo um checklist de comandos e outputs para colares aqui.

---

## 0) Changelog recente (o que mudou desde a última versão)
### P0 (Release e demo)
- Build web voltou a ficar verde ao corrigir i18n (suporte a interpolação em `t(key, values)`), desbloqueando `next build`.
- Biblioteca: correção de keys duplicadas em badges (dedupe de músculos) para eliminar warnings e instabilidade de render.
- Tab bar mobile: removido overflow horizontal em ecrãs pequenos (320px), melhorando demo mobile.
- Admin/dev: neutralização de navegação para features “sem backend”, evitando páginas “broken” durante demo.

### Gym Pilot (vendível ASAP)
- Backend: adicionado suporte real a Gyms, membership, join (pedido ou código), revisão de pedidos e listagem de membros.
- Frontend: fluxo completo de join + painel admin/trainer com estados de loading/empty/error.
- Atribuição de plano: admin atribui plano existente a membro, e o membro passa a ver o plano na experiência “Plan/Hoy”.

---

## 1) Visão (North Star)
FitSculpt é uma web app mobile-first de treino e nutrição, com UX premium, progressão clara e experiência comparável a líderes como FitnessAI ou Dr. Muscle.

### Objetivo do MVP
- Demonstrar valor real a utilizadores finais
- Ter qualidade visual e UX suficiente para demos a utilizadores, investidores e ginásios pequenos
- Garantir base técnica sólida para evoluir para app nativa e white-label mais tarde

---

## 2) Estado atual do produto (snapshot executivo)

### Release readiness (hoje)
- **Build web**: esperado PASS (`npm run build`) após PR-1A.
- **DoD base (demo)**: login, `/app` protegido, tab bar mobile estável, Hoje + 1 ação rápida, tracking persistente, biblioteca lista + detalhe.
- **Regra de ouro**: zero “unsupported” em rotas do Gym Pilot (agora substituído por fluxo real).

### Gym Pilot readiness (vendível para gym pequeno)
**Estado**: **MVP Gym Pilot pronto para demo end-to-end**, com operação em < 2 minutos (meta de venda).

Fluxo vendível:
1) Utilizador entra no gym (pedido de aprovação ou código).
2) Admin/Trainer vê pedidos e aceita (se aplicável).
3) Admin/Trainer atribui plano existente ao membro.
4) Membro vê o plano no seu “Plan” (e acesso claro no “Gym/Hoy”).

---

## 3) Estado atual do produto (detalhado por módulo)

### 3.1 Autenticação e sessão
- Login funcional, sessão via cookie `fs_token`.
- Rotas `/app/*` protegidas.
- Restrições mantidas: não quebrar `fs_token`, nem middleware/proxy BFF.

**Estado**: Implementado, estável.

---

### 3.2 Onboarding e Perfil
- Onboarding base implementado.
- i18n: ES e EN, agora com interpolação suportada em mensagens (ex: “Passo X de Y”).

**Estado**: Implementado, com melhoria crítica de build (i18n).

---

### 3.3 Hoje (Home)
- “Hoje” com quick actions e estados explícitos (loading/empty/error).
- Integração com tracking e entry points para ações essenciais.

**Estado**: Implementado.  
**Em progresso**: polish transversal e consistência total de feedback (toasts, retry).

---

### 3.4 Tracking (Seguimento)
- Tracking end-to-end via BFF `/api/tracking` (GET/PUT).
- Persistência funcional, sem dados inventados.
- UI adaptativa por capacidades do payload (quando aplicável).

**Estado**: Implementado e demo-safe.

---

### 3.5 Biblioteca (Exercícios, Receitas, Planos)
- Lista e detalhe funcionais.
- Media viewer e layout avançado em detalhe, quando disponível.
- Seções condicionais, sem placeholders fake.
- Correção recente: dedupe em badges para evitar keys duplicadas.

**Estado**: Implementado.  
**Em progresso**: polish final de UX premium e performance percebida (skeletons consistentes).

---

### 3.6 Treino (B2C)
- Planos e vistas relacionadas existentes.
- IA (se aplicável) permanece fora do “Gym Pilot” nesta fase de venda, mas pode coexistir.

**Estado**: Implementado (base).  
**Nota**: Gym Pilot usa atribuição manual simples de planos existentes, sem depender de IA.

---

### 3.7 Nutrição (B2C)
- Plano base e integração no dashboard.
- Meal cards, detalhe de refeição com macros e instruções (quando existe conteúdo).

**Estado**: Implementado (base).  
**Em progresso**: consistência total dos estados e loop “semana → lista compra → ajustes” (se for objetivo futuro).

---

## 4) Gym Pilot (novo core B2B MVP)

### 4.1 Capabilities (o que existe agora)
- Gyms e membership com estados (ex: pending/active/rejected).
- 2 formas de entrar:
  - pedido com aprovação
  - código com auto-join
- Painel admin/trainer:
  - ver pedidos pendentes
  - aceitar/rejeitar
  - ver membros ativos
- Atribuir plano existente a membro (manual e simples).
- Visibilidade para membro: plano atribuído aparece na experiência de treino e há CTA claro no contexto do gym.

**Estado**: Implementado para demo vendível.

### 4.2 O que NÃO entrou de propósito (para não matar prazo)
- White-label enterprise multi-tenant avançado (branding por tenant, temas, subdomínios)
- Nutrição do gym como módulo completo
- IA do gym, variantes automáticas e ajustes inteligentes
- Billing e entitlements modulares por módulo (nutrição vs fitness) como produto final

---

## 5) Snapshot técnico (arquitetura real hoje)

### Frontend
- Next.js App Router em `apps/web`.
- BFF via `apps/web/src/app/api/*` com proxy ao backend.
- UI client-side com estados explícitos.

### Backend
- Fastify + Prisma.
- Backend é fonte de verdade para regras e persistência.
- Novo domínio Gym Pilot implementado no backend.

### i18n
- Baseado em JSON (ES/EN).
- Agora com interpolação de placeholders suportada por `t(key, values?)`.

---

## 6) Linhas vermelhas (regras absolutas)
- Não quebrar auth/sessão (`fs_token`), cookies e rotas protegidas.
- Frontend consome exclusivamente `/api/*` (BFF), sem chamadas diretas ao backend no browser.
- Não inventar dados. Se faltar, esconder ou estado neutro.
- Features incompletas não podem parecer “quase reais”. Ou ficam hidden, ou “não disponível”, sem chamadas falhadas.
- PRs pequenos, focados, reversíveis.
- Qualquer regressão em build ou sessão é P0.

---

## 7) Qualidade e gates (o que tem de passar sempre)
### Obrigatório para “vendível”
- `apps/web`: `npm run build` PASS
- Zero erros no console em fluxos principais:
  - Login
  - `/app` protegido sem sessão
  - Tab bar mobile sem overflow
  - Hoje + 1 ação rápida
  - Tracking persistente
  - Biblioteca lista + detalhe
  - Gym Pilot end-to-end (join → accept → assign plan → member view)

### Recomendado (próximo passo)
- `lint` e `typecheck` explícitos (se existirem scripts dedicados)
- Smoke tests mínimos (web e api) e checklist de regressão

---

## 8) Riscos e dependências abertas
- Modularidade comercial (Nutrição Premium vs Fitness Premium vs Bundle vs Gym) ainda não está completa como produto final. Para a venda do gym pequeno, o piloto já é suficiente, mas o pricing e packaging “limpos” virão depois.
- Consistência i18n: novas strings devem manter chaves e placeholders alinhados entre ES e EN.
- Dados reais e seed: demos ficam melhores se houver seed controlado para gym, planos e membros.

---

## 9) Foco atual (próximas 2 a 4 semanas)
### Prioridade máxima (curto prazo)
- Estabilizar UX do Gym Pilot e reduzir fricção (tempo < 2 minutos na demo).
- Fechar polish mobile: estados, feedback, skeletons, acessibilidade.
- Consolidar navegação e reduzir duplicados (rotas e variantes linguísticas), sem quebrar compatibilidade.

### Objetivo de Sprint (sugestão)
> “Gym Pilot polished” + “Core loop Today/Tracking rock-solid” para demos repetíveis.

---

## 10) O que NÃO é prioridade agora
- White-label enterprise avançado
- App mobile nativa
- Billing completo e modularidade por módulo como produto final
- Growth, SEO, marketing profundo (após piloto vendável)

---
Fim do documento.
