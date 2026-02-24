# Dev setup (backend)

## Seed de exercícios para demo local

A API já expõe um endpoint de seed para desenvolvimento:

- `POST /dev/seed-exercises`

> Segurança: em `NODE_ENV=production` o endpoint responde `403 FORBIDDEN`.

### Passo a passo

1. Suba a API localmente (`apps/api`):

```bash
npm run dev
```

2. Em outro terminal, execute o seed:

```bash
curl -X POST http://localhost:4000/dev/seed-exercises
```

3. Verifique que os exercícios foram populados:

```bash
curl http://localhost:4000/exercises
```

### Evidência esperada

- O `POST /dev/seed-exercises` retorna `{ "ok": true, "seeded": <n> }`.
- O `GET /exercises` retorna uma lista com `length > 0`.
- Campos de mídia (`imageUrl`) aparecem quando houver dados de imagem para o exercício.


## Release gate local (obrigatório antes de merge)

Na raiz do repositório, rode o gate único:

```bash
npm run release:check
```

Esse comando executa, nesta ordem:

1. **FE** (`apps/web`): `build` + `typecheck` + `test`
2. **BE** (`apps/api`): `build` + `test`

Se qualquer etapa falhar, o comando retorna erro e o merge deve ser bloqueado até correção.

### Comandos equivalentes por escopo

```bash
# Front-end
npm run release:check:fe

# Back-end
npm run release:check:be
```

### Evidência esperada no PR

- Output completo de `npm run release:check`.
- Link para esta seção do README (`README/dev-setup.md`).
- Checklist da PR template totalmente marcado.
