# Smoke Test Demo (10 min) — PR-03

Objetivo: validar rapidamente que a demo está utilizável em fluxos core sem tocar em auth (`fs_token`) nem em rotas existentes.

## Pré-requisitos
- API local em `http://localhost:4000` e Web em `http://localhost:3000`.
- DB com seed demo aplicada (`apps/api`: `npm run db:seed` com `ALLOW_SEED=1`).
- Conta demo (default seed):
  - Email: `demo-admin@fitsculpt.local`
  - Password: `DemoAdmin123!`
- Ambiente limpo: abrir janela anónima e DevTools (Console + Network).

## Script de smoke (5 flows, alvo <10 min)
1. **Login (email/password)**
   - Ir a `/login`, autenticar com conta demo.
   - **Expected result:** login concluído e navegação para `/app` (ou `next` informado).

2. **`/app` protegido (sem sessão bloqueia/redireciona)**
   - Em aba anónima sem cookies, abrir diretamente `/app`.
   - **Expected result:** redireciona para `/login?next=%2Fapp` (ou bloqueia acesso autenticado).

3. **Tab bar mobile (navegação)**
   - Em viewport mobile (ex.: 390x844), dentro de `/app`, tocar em 3 tabs (ex.: Hoy, Biblioteca, Perfil).
   - **Expected result:** navegação funcional sem layout quebrado/overflow.

4. **Hoje + 1 ação**
   - Abrir `/app/hoy` e executar 1 ação rápida (ex.: abrir treino/seguimiento).
   - **Expected result:** ação dispara navegação/estado esperado e regressa sem erro.

5. **Biblioteca: lista + detalhe (imagem real quando existir)**
   - Abrir `/app/biblioteca`, entrar em 1 item e abrir detalhe.
   - **Expected result:** lista renderiza, detalhe abre corretamente, imagem real aparece quando o item possui imagem.

## Critérios de aprovação (PASS/FAIL)
- 5/5 flows aprovados no tempo alvo (<10 min).
- Resultados esperados acima observáveis e checáveis.
- **Console: 0 errors** durante o percurso core (warnings não bloqueantes devem ser anotados).

## Evidência e registro (colar no PR)
Preencher e anexar (screenshot ou texto):

- [ ] Login email/password — PASS/FAIL
- [ ] `/app` protegido sem sessão — PASS/FAIL
- [ ] Tab bar mobile navega sem regressão — PASS/FAIL
- [ ] Hoje + 1 ação — PASS/FAIL
- [ ] Biblioteca lista + detalhe (+ imagem quando existir) — PASS/FAIL
- [ ] Console 0 errors — PASS/FAIL
- **Resultado final:** `X/5 PASS` (obrigatório `5/5 PASS` para aprovação).

### Exemplo de registro (5/5 PASS)
- Login email/password: **PASS**
- `/app` protegido sem sessão: **PASS**
- Tab bar mobile: **PASS**
- Hoje + 1 ação: **PASS**
- Biblioteca lista + detalhe: **PASS**
- Console: **0 errors (PASS)**
- **Resultado final: 5/5 PASS**
