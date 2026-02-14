# FitSculpt, Project Brief

## O que é a FitSculpt
A FitSculpt é uma web app mobile-first de treino e nutrição que ajuda o utilizador a evoluir com planos personalizados, registo de progresso e recomendações inteligentes, combinando biblioteca de exercícios com técnica e um fluxo diário simples para manter consistência.

## Público-alvo
- Pessoas que treinam em ginásio ou em casa e querem progressão clara
- Utilizadores que precisam de orientação de técnica e estrutura (não só “listas de exercícios”)
- Pessoas que querem melhorar alimentação com metas simples (calorias e macros) sem fricção
- (B2B Pilot) Ginásios pequenos que querem uma app para manter clientes a treinar dentro e fora do ginásio

## Princípios (regra de ouro)
- Produto modular: deve ser possível vender **nutrição** e **fitness** como módulos premium independentes (ou bundle).
- Sem “features fake”: se falta dado real, a UI deve ocultar ou mostrar empty/error honestos.
- Backend é fonte de verdade para entitlements, cálculos, regras e persistência.
- Mobile-first: sensação premium vem de estabilidade, estados claros e navegação consistente.

## Modelo de Produto (tiers e módulos)
### Free (base)
- Metas simples de macros/calorias (sem “dietas completas”)
- Tracking básico: peso, altura, medidas, notas/energia (mínimo viável)
- Tracking de performance (mínimo viável)
- Food log: registo por gramas e cálculo de macros/calorias (quando disponível)

### Premium — módulos compráveis
- Nutrição Premium (AI Nutrition): plano semanal, ajustes por preferências, lista de compras
- Fitness Premium (AI Fitness): plano por objetivo/tempo/contexto (casa/gym/mixto) + ajuste semanal incremental
- Bundle: Nutrição Premium + Fitness Premium

### Gym Pilot (B2B mínimo vendível)
- Utilizador pode escolher um ginásio e:
  - aguardar aceitação manual do ginásio **ou**
  - entrar via código de ativação
- Ginásio tem painel de admin/trainer com:
  - lista de membros e solicitações
  - atribuição de planos standard (templates) e ajuste manual simples
- Objetivo: permitir que o ginásio dê planos para treinar em casa ou no gym, mantendo consistência

## MVP (o que tem de existir e funcionar bem)
### Core (sempre)
- Autenticação e sessão estável (cookie `fs_token`)
- Onboarding simples (objetivo, nível, preferências)
- Ecrã “Hoje” com ações rápidas (check-in, treino, comida)
- Biblioteca de exercícios com detalhe de técnica, cues, músculos e media (GIF/vídeo quando disponível)
- Tracking básico com persistência (inclui food log)
- Dashboard com resumo semanal e progresso

### MVP Modular (premium)
- Módulo Nutrição Premium (AI) pode ser ativado isoladamente e funciona end-to-end
- Módulo Fitness Premium (AI) pode ser ativado isoladamente e funciona end-to-end
- Bundle funciona como combinação dos dois
- Gating claro: utilizador sem módulo não vê ecrãs vazios; vê copy/CTA ou feature oculta

### MVP Gym Pilot (B2B)
- Join por aceitação manual ou código
- Painel gym admin/trainer com lista e atribuição de planos templates
- Utilizador vê plano atribuído na sua experiência diária

## Fora de scope (por agora)
- App nativa iOS/Android (React Native / Swift / Kotlin)
- Social completo (mensagens, seguidores, feed estilo rede social)
- Marketplace, afiliados, influenciadores, challenges avançados
- Wearables e integrações profundas (Apple Health, Google Fit) além do essencial
- Programas complexos tipo periodização avançada com automação total
- Conteúdos premium de vídeo com paywall completo (além do billing básico)
- White-label enterprise completo (app stores por ginásio, multi-org avançado, operações enterprise)
