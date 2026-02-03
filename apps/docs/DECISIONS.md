# FitSculpt – Architectural & Product Decisions

Este documento regista decisões técnicas e de produto já tomadas.
Não é um brainstorming nem um backlog.
Tudo o que está aqui é considerado **decisão ativa** até ser explicitamente alterado.

---

## 1. Backend como Fonte da Verdade

**Decisão**  
O backend é a única fonte de verdade para:
- regras de negócio
- permissões
- cálculos (ex.: macros, progressões, lógica de treino)
- dados persistidos

**Implicações**
- O frontend não replica lógica de domínio.
- O BFF não contém regras de negócio.
- A base de dados reflete apenas dados validados pelo backend.

---

## 2. Separação Frontend / BFF / Backend

**Decisão**
A arquitetura segue o modelo:
Frontend → BFF (`/api/*`) → Backend API

**Regras**
- O frontend **nunca** chama o backend diretamente.
- Todas as chamadas passam por `/api/*`.
- O BFF é fino e previsível.

---

## 3. BFF Fino (Backend for Frontend)

**Decisão**
O BFF existe apenas para:
- gestão de sessão (cookies HTTP-only)
- proxy seguro para o backend
- pequenas adaptações técnicas quando inevitável

**Explicitamente NÃO faz**
- lógica de negócio
- decisões de permissão
- transformação profunda de dados por screen

---

## 4. Autenticação via Cookie (`fs_token`)

**Decisão**
A autenticação é baseada em:
- JWT emitido pelo backend
- armazenado em cookie HTTP-only (`fs_token`)
- gerido pelo BFF

**Zona Crítica**
- O fluxo de auth e o cookie `fs_token` não devem ser alterados sem necessidade extrema.
- Qualquer mudança exige validação manual completa (login, logout, rotas protegidas).

---

## 5. IA como Assistente, Não Fonte da Verdade

**Decisão**
A IA é usada apenas como ferramenta assistiva para:
- geração inicial de planos
- sugestões
- resumos

**Regras**
- Output da IA deve ser estruturado (JSON).
- Todo output é validado antes de persistir.
- A IA nunca decide billing, permissões ou dados críticos.

---

## 6. Contratos de API Estáveis

**Decisão**
Os contratos de API devem ser:
- previsíveis
- versionáveis se necessário
- compatíveis para trás sempre que possível

**Regras**
- Não alterar shapes de response sem avaliar impacto no frontend.
- Evitar múltiplos shapes para a mesma entidade.

---

## 7. UX Primeiro, Performance Depois

**Decisão**
Clareza e UX têm prioridade sobre otimização prematura.

**Implicações**
- Estados explícitos (loading, empty, error) são obrigatórios.
- Performance só é otimizada quando há dados reais que o justifiquem.

---

## 8. Prisma e Base de Dados

**Decisão**
- Prisma é usado com migrações explícitas.
- Alterações ao schema exigem migração.
- Evitar modelar features fora do scope atual.

---

## 9. Conteúdo Incompleto Não é Exposto

**Decisão**
Funcionalidades ou secções sem conteúdo real:
- são escondidas
- não aparecem como placeholders “fake”

---

## 10. Este Documento

**Regra**
- Este ficheiro representa decisões ativas.
- Mudanças devem ser intencionais e explícitas.
- Se algo contradiz este documento, deve ser discutido antes de implementar.