UX_LIBRARY_RULES.md
# UX Library Rules (Sprint 01)

## List item (ExerciseCard)
- Thumbnail com rácio fixo (quadrado), cantos arredondados consistentes
- Linha 1: nome (máx 2 linhas, ellipsis)
- Linha 2: grupo muscular como texto secundário (ou chip discreto se já existir no DS)
- Item clicável com altura confortável para mobile

## Detail screen
- Preferência: full page (não modal), com back consistente
- Ordem: media → nome → descrição curta (se existir)
- Se faltar media/descrição: esconder secção, nunca mostrar labels vazios

## States
- Loading: skeleton imita layout final (thumbnail + 2 linhas), sem layout shift
- Empty: mensagem humana + CTA “Voltar”
- Error: mensagem curta + “Tentar novamente”, sem detalhes técnicos

## Dark mode
- Fundo quase-preto, cards 1 nível acima
- Placeholder/skeleton com contraste suave (sem “brilhar”)