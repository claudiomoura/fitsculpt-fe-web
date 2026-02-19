Perfecto. Te lo actualizo con una postura más exigente, separando claramente **“lo que creemos que está listo”** de **“lo que está realmente validado como vendible y estable”**, alineado con lo que ya vimos en auditoría previa (mismatches FE↔BE, entitlements, gym requests, etc.).

---

# FitSculpt – Project Status (Atualizado Estratégico)

Data: 2026-02-19
Branch de referência: `work` (assumido consolidado após PR-1A..PR-5)
Owner: Founder/PM (FitSculpt)

> Nota de rigor: este status separa “Implementado” de “Validado end-to-end”. Quando não há evidência de execução real (build clean + fluxo testado), fica como **Assunção**.

---

# 1) Executive Snapshot Realista

## Release Readiness (produto B2C geral)

**Estado: PARCIALMENTE PRONTO PARA DEMO CONTROLADA**

✔ Login + `/app` protegido
✔ Tab bar mobile estável
✔ Biblioteca lista + detalhe
✔ Tracking persistente (assumido funcional E2E)
✔ Build corrigido após i18n

⚠ Entitlements ainda inconsistentes (FE vs BE)
⚠ Alguns endpoints admin aparentam não existir no backend
⚠ Duplicidades estruturais (trainer/treinador, helpers backend URL)

**Conclusão:** Demo funcional, mas ainda não “production-grade”.

---

## Gym Pilot Readiness (B2B pequeno gym)

**Estado: MVP funcional para demo, NÃO ainda “operacional robusto”**

Fluxo teórico completo:

1. User entra via pedido ou código
2. Admin vê pedidos
3. Admin aceita
4. Admin atribui plano
5. User vê plano no contexto do gym

⚠ Pontos críticos conhecidos:

* Criação de gym já teve mismatch de contrato (`code` obrigatório no backend).
* Gym requests estavam desativados no sidebar.
* Entitlements não refletem modelo modular real.

**Conclusão:** Vendível em demo assistida, ainda frágil para uso real sem supervisão.

---

# 2) Estado Atual por Domínio

## 2.1 Autenticação e Sessão

* Cookie `fs_token`
* Middleware protege `/app`
* BFF obrigatório via `/api/*`

**Estado:** Estável
**Risco:** Qualquer regressão aqui é P0 absoluto.

---

## 2.2 Onboarding & Perfil

* Base implementada
* i18n ES/EN funcional
* Interpolação corrigida

**Estado:** Implementado
**Polish pendente:** consistência total de chaves entre idiomas.

---

## 2.3 Hoje (Core Loop)

* Quick actions
* Integração com tracking
* Estados explícitos

**Estado:** Funcional para demo
**Próximo nível:** feedback unificado, toasts consistentes, retries claros.

---

## 2.4 Tracking

* BFF `/api/tracking`
* Persistência backend real
* Sem dados inventados

**Estado:** Implementado
**Risco:** validação formal E2E ainda não documentada.

---

## 2.5 Biblioteca

* Lista + detalhe
* Media viewer
* Dedupe de badges resolvido

**Estado:** Implementado
**Melhoria:** skeletons premium + performance percebida.

---

## 2.6 Treino (B2C)

* Planos existentes
* Estrutura preparada para coexistir com Gym Pilot

**Estado:** Base funcional
**Nota estratégica:** Gym Pilot usa atribuição manual, não IA.

---

## 2.7 Nutrição (B2C)

* Plano base
* Meal cards + macros quando existem

**Estado:** Base funcional
**Ainda não é:** produto premium fechado com loop semanal completo.

---

# 3) Gym Pilot – Estado Real

## O que está implementado

✔ Domínio Gym no backend
✔ Membership states
✔ Join por pedido
✔ Join por código
✔ Aceitar/rejeitar pedido
✔ Ver membros ativos
✔ Atribuir plano existente

## O que ainda é frágil

⚠ Entitlements não alinhados
⚠ Possível inconsistência entre UI e endpoints reais
⚠ Não há ainda “modo demo seedado” controlado
⚠ Tempo real de fluxo < 2 minutos ainda não validado formalmente

---

# 4) Arquitetura – Estado Atual

## Frontend

* Next.js App Router
* BFF obrigatório
* Estados explícitos
* Algumas duplicidades estruturais

## Backend

* Fastify + Prisma
* Backend como fonte de verdade
* Gym domain integrado

## Ponto crítico técnico

* Modularidade comercial ainda não está alinhada entre FE e BE.
* Tier “GYM” no frontend não corresponde a modelo real de planos no backend.

Isso não quebra demo, mas quebra modelo de produto a médio prazo.

---

# 5) Linhas Vermelhas (Continuam Válidas)

* Nunca quebrar `fs_token`
* Nunca chamar backend direto do browser
* Nunca inventar dados
* Feature incompleta deve estar hidden
* PRs pequenos e reversíveis
* Build vermelho é bloqueador total

---

# 6) Qualidade – Estado Real

## Obrigatório para “vendível em demo”

✔ Build web PASS (assumido após PR-1A)
✔ Zero console errors nos fluxos principais (necessita validação formal)
✔ Gym Pilot fluxo completo manualmente testado

## Ainda não formalizado

* Lint gate consistente
* Typecheck gate consistente
* Smoke tests mínimos
* Checklist de regressão automatizado

---

# 7) Riscos Estratégicos Atuais

1. Entitlements inconsistentes podem gerar acessos indevidos.
2. Modularidade comercial ainda conceptual.
3. Duplicidades de rotas e helpers podem causar bugs difíceis.
4. Falta de seed demo consistente.
5. Ainda dependes demasiado de validação manual.

---

# 8) Foco Estratégico Próximo (2–4 semanas)

## Fase 1 – “Gym Pilot Rock-Solid”

* Validar fluxo completo com cronómetro
* Seed de demo estável
* Corrigir qualquer mismatch restante
* Garantir 0 erros console

## Fase 2 – “Core Loop Premium”

* Hoje + Tracking impecáveis
* UX mobile refinada
* Estados 100% consistentes

## Fase 3 – “Entitlements Reais”

* Refatorar gating baseado em módulos backend
* Remover tier inventado
* Preparar modelo comercial limpo

---

# 9) O que NÃO é prioridade agora

* White-label avançado
* App nativa
* Billing sofisticado
* Crescimento orgânico
* IA avançada para gym

---

# 10) Diagnóstico Honesto

FitSculpt já não é um protótipo.
Mas também ainda não é um produto operacional autónomo.

Está num ponto forte:

* Demo vendível
* Base técnica sólida
* Domínio Gym implementado

O que falta não é feature.
É **coerência estrutural, validação formal e consolidação**.

Se quiseres, posso agora:

1. Transformar isto num “Board Estratégico 30 dias” ultra claro.
2. Ou fazer um “Plano de Fecho para Primeira Venda Real”.
3. Ou preparar um “Checklist de Demo Premium para impressionar gym owner”.

Tu decides a próxima jogada.
