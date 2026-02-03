# FitSculpt – Architecture Overview

Este documento descreve a arquitetura da FitSculpt a alto nível.
Não é documentação de implementação linha a linha, é um mapa mental partilhado
para orientar decisões técnicas, evitar deriva de escopo e manter coerência
à medida que o produto evolui.

---

## 1. Visão Geral

A FitSculpt é uma **web app mobile-first** de treino e nutrição com foco em:
- consistência diária do utilizador
- UX simples e rápida
- lógica centralizada no backend
- frontend desacoplado e previsível

A arquitetura segue um modelo **Frontend + BFF + Backend API**, com autenticação
baseada em cookies HTTP-only e geração de conteúdo assistida por IA.

---

## 2. Componentes Principais

### 2.1 Frontend (Web App)
- **Stack**: Next.js (App Router), React, TypeScript
- **Responsabilidade**:
  - UI / UX
  - Navegação
  - Estado local e visual
  - Chamadas sempre via `/api/*` (nunca direto ao backend)
- **Princípios**:
  - Mobile-first
  - Design system consistente
  - Estados explícitos (loading, empty, error)
  - Nenhuma lógica de negócio crítica no cliente

📁 Pastas relevantes:
- `app/` → rotas e layouts
- `components/` → UI reutilizável
- `lib/` → helpers de frontend
- `services/` → chamadas ao BFF

---

### 2.2 BFF – Backend for Frontend
- Implementado via rotas `/api/*` no Next.js
- Atua como camada intermédia entre frontend e backend real

**Responsabilidades**:
- Reencaminhar pedidos para o backend
- Gerir cookies de sessão (`fs_token`)
- Proteger tokens e segredos
- Adaptar responses se necessário (edge-friendly)

**Regra absoluta**:
> O frontend **nunca** chama o backend diretamente.
> Tudo passa pelo BFF.

---

### 2.3 Backend API
- **Stack**: Node.js, Fastify, TypeScript, Prisma
- **Base de dados**: PostgreSQL
- **Responsabilidade**:
  - Lógica de negócio
  - Autenticação e autorização
  - Persistência de dados
  - Integração com IA
  - Billing e subscrições

**Princípios**:
- Backend é a fonte da verdade
- Validação de input em todos os endpoints
- Responses previsíveis e tipadas
- Separação clara por domínios

Domínios principais:
- Auth
- Profile
- Training
- Nutrition
- Tracking
- Library (exercícios, receitas)
- AI
- Billing
- Admin

---

## 3. Autenticação e Sessão

- Autenticação baseada em **JWT armazenado em cookie HTTP-only (`fs_token`)**
- Login por:
  - Email/password
  - Google OAuth
- O backend emite o token
- O BFF gere o cookie
- O frontend apenas assume “sessão válida ou não”

⚠️ Regra crítica:
Qualquer mudança que quebre `fs_token` quebra o produto.

---

## 4. Fluxo de Dados (alto nível)

1. Utilizador interage com UI
2. Frontend chama `/api/*`
3. BFF valida sessão e reencaminha
4. Backend processa lógica e acede à DB
5. Backend responde com dados normalizados
6. Frontend renderiza estado

---

## 5. IA (Artificial Intelligence)

A IA é **assistiva**, não é a fonte da verdade.

Usada para:
- Gerar planos de treino
- Gerar planos de nutrição
- Dicas diárias
- Resumos semanais

Princípios:
- Output sempre em JSON estruturado
- Validação do output antes de persistir
- Fallback seguro se a IA falhar
- Logs sanitizados (sem dados sensíveis)

A IA **não** decide sozinha:
- billing
- permissões
- dados críticos do utilizador

---

## 6. UI / UX Architecture

- Design system único
- Componentes reutilizáveis
- Nada de estilos inline arbitrários
- UX orientada ao “Hoje” e ações rápidas

Ecrãs chave:
- Onboarding
- Hoje
- Dashboard
- Biblioteca
- Nutrição
- Seguimento
- Settings

---

## 7. Performance e Escalabilidade

- Paginação em listas grandes
- Debounce em inputs e search
- Evitar re-renders desnecessários
- Backend preparado para escalar horizontalmente

A otimização vem **depois da clareza**.

---

## 8. Segurança

- Nenhum segredo no repo
- Tokens apenas no backend/BFF
- Logs sanitizados
- Rate limiting em auth e IA
- Separação clara user vs admin

---

## 9. O que este documento NÃO é

- Não é um guia de implementação detalhado
- Não substitui o código
- Não define UI pixel-perfect
- Não congela decisões para sempre

Serve para alinhar decisões e evitar caos arquitetural.

---

## 10. Regra final

Se uma mudança:
- contradiz este documento
- adiciona complexidade sem valor claro
- mistura responsabilidades

Então deve ser repensada antes de ser implementada.

---

## 11. Zonas Sensíveis (Do Not Touch)
- Auth e cookie fs_token
- Fluxo OAuth Google
- Prisma schema base (mudar só com migração)
- Contratos API usados pelo frontend