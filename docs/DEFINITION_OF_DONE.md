# Definition of Done (DoD)

Uma tarefa só está “feita” quando cumpre tudo o que se aplica abaixo.

## Qualidade técnica
- Build passa (frontend e backend quando aplicável)
- Lint passa
- Typecheck passa
- Sem erros no console do browser nos fluxos principais

## Compatibilidade e estabilidade
- Não quebra rotas existentes
- Não quebra auth e sessão (`fs_token`)
- Não quebra chamadas BFF `/api/*` no frontend

## Validação manual mínima (obrigatória)
Executar e validar:
- Login com email/password
- Acesso a `/app` protegido quando não há sessão
- Navegação mobile (tab bar) sem regressões
- Ecrã “Hoje” (se existir) e pelo menos 1 ação rápida
- Tracking: criar 1 registo (ex: peso ou comida) e confirmar persistência
- Biblioteca: abrir lista e detalhe de 1 exercício

## Se mexeu no backend
- Endpoint tem schema/validação de input
- Resposta tem formato estável (documentado ou óbvio)
- Erros retornam mensagem consistente e status code correto
- Existe pelo menos 1 teste quando for crítico (auth, billing webhook, parsing IA), ou uma nota explícita no PR a justificar ausência

## UI/UX
- Componentes usam o design system (sem estilos soltos desnecessários)
- Existem estados: loading, empty, error
- Acessibilidade básica: focus visível, botões clicáveis em mobile, labels em inputs

## Segurança e repo hygiene
- Nenhum segredo no commit
- Não foram adicionados ficheiros de DB, dumps ou chaves
- Logs não imprimem tokens, cookies ou payloads sensíveis
## Release Candidate (RC) — Sprint 13 (obrigatório por PR)
- Gates Sprint 13 em PASS (referência de implementação: PR-01)
- Smoke manual executado com evidência anexada (referência de implementação: PR-03)
- Zero erros de console (0 console errors) nos fluxos afetados
- FE (quando aplicável): build/lint/typecheck em PASS
- BE (quando aplicável): build/test em PASS
- Não pode quebrar `fs_token`, `/api/*` ou rotas existentes
- O PR deve incluir link para `docs/release/RELEASE_CANDIDATE_DOD.md`
