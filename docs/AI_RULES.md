# FitSculpt, AI Rules (Lei do Repo)

Estas regras são obrigatórias para qualquer contribuição (humana ou IA).

## Branching e PRs
- Trabalhar sempre a partir de `dev`
- PRs pequenos, 1 feature por PR
- Nada de “mega refactor” misturado com feature. Se for necessário, cria PR separado só de refactor

## Verdade do sistema (não inventar)
- No frontend não inventar campos nem estruturas. Se faltar dado, criar endpoint real no backend ou ajustar o schema
- Não inventar estados “fake” que depois não batem com API
- Se uma secção ainda não tem conteúdo real, esconder ao utilizador final (feature flag ou condicional)

## UX e qualidade
- Mobile-first sempre (primeiro ecrãs pequenos, depois desktop)
- Consistência visual: usar componentes do design system, evitar estilos soltos e inline
- Estados obrigatórios: loading, empty, error, success, disabled

## Regras críticas que não podem quebrar
- Não quebrar auth baseada em cookie `fs_token`
- Não alterar o comportamento do BFF sem garantir compatibilidade (client chama `/api/*`, sessão por cookie)
- Não mudar rotas existentes sem redirecionar ou manter compatibilidade
- Não expor tokens/segredos em logs, commits ou responses

## Backend e dados
- Prisma e tipos corretos, sem “any” para despachar
- Todos os endpoints têm validação de input (schema) e respostas previsíveis
- Se mexer em AI: response em JSON estruturado e validação, com fallback seguro

## Deploy e configs
- Nada de secrets no repo. Nunca commitar `.env` com chaves reais nem ficheiros de DB com dados
- Variáveis de ambiente têm de estar documentadas (nome, exemplo, onde usar)
- Qualquer mudança que afete Vercel/Render tem de ser testada em modo production-like

## Performance e segurança
- Evitar chamadas duplicadas e re-renders desnecessários
- Sanitizar logs e não persistir conteúdo sensível do utilizador sem motivo claro
- Rate limiting em auth e IA quando aplicável