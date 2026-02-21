# SPRINT 01 – UX & Biblioteca de Exercícios

## Sprint Goal
Melhorar a experiência visual e funcional da biblioteca de exercícios para torná-la clara, utilizável e apresentável em demo, sem mexer em lógica crítica do sistema.

---

## Scope

### Entra
- UI/UX da biblioteca de exercícios
- Estados visuais (loading, empty, error)
- Organização e navegação mobile-first
- Uso de imagens/GIFs existentes
- Consistência com DESIGN_SYSTEM_V0.md

### Não Entra
- Alterações de autenticação
- Alterações no fs_token
- Billing / subscrições
- Lógica de treino ou progressão
- Novos modelos de dados no Prisma

---

## User Stories

### US1
Como utilizador, quero ver uma lista clara de exercícios com imagem ou placeholder, para reconhecer rapidamente cada exercício.

**Aceitação**
- Lista renderiza imagem, nome e grupo muscular
- Placeholder consistente se não houver imagem
- Layout mobile-first

---

### US2
Como utilizador, quero poder abrir um exercício e ver os seus detalhes, para entender como executá-lo corretamente.

**Aceitação**
- Página ou modal de detalhe
- Nome, descrição curta e imagem/GIF
- Sem campos fake ou vazios visíveis

---

### US3
Como utilizador, quero ver estados de loading claros, para perceber que o sistema está a carregar dados.

**Aceitação**
- Skeletons ou loading indicators
- Nenhum layout “a saltar”
- Sem ecrã em branco

---

### US4
Como utilizador, quero ver um estado empty quando não há exercícios, para não ficar confuso.

**Aceitação**
- Mensagem clara
- CTA neutro (ex.: “voltar”)
- Sem erros técnicos visíveis

---

### US5
Como utilizador, quero que secções sem conteúdo real não apareçam, para ter uma experiência limpa.

**Aceitação**
- Secções vazias são escondidas
- Nenhum “coming soon” visível

---

### US6
Como utilizador mobile, quero navegar a biblioteca facilmente com uma mão, para usar a app no dia a dia.

**Aceitação**
- Botões acessíveis com polegar
- Scroll natural
- Sem menus complexos

---

### US7
Como stakeholder, quero que a biblioteca seja apresentável em demo, para mostrar valor do produto.

**Aceitação**
- Visual consistente
- Sem bugs visuais
- Sem rotas quebradas

---

## Priorização

- Must: US1, US2, US3, US5
- Should: US4, US6
- Could: US7 (implicitamente coberto)

---

## Riscos e Dependências

- Dependência de endpoints existentes (não criar novos)
- Garantir que chamadas continuam via `/api/*`
- Não introduzir lógica de negócio no frontend

---

## Definition of Done

- UI consistente com DESIGN_SYSTEM_V0.md
- Nenhuma regressão em auth ou navegação
- Estados loading/empty/error presentes
- Build passa
- Demo fluida sem explicação técnica