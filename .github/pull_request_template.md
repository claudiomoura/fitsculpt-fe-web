## Summary
- What changed?
- Why?

## Dependency statement (mandatory)
This PR depends on PR-01 and PR-02 being merged (and PR-03 if applicable).

## Local release gate (mandatory before review)
- [ ] `npm run release:check` executado na raiz
- [ ] FE PASS (`build` + `typecheck` + `test`)
- [ ] BE PASS (`build` + `test`)
- [ ] Output completo do `release:check` anexado no PR
- [ ] Link para documentação de validação pré-merge (`README/dev-setup.md`)

## Freeze scope (mandatory)
- [ ] No product/architecture change (docs + QA/release process only)
- [ ] Only release-critical fixes allowed during RC

## Owners / sign-off
- Release owner (GO/NO-GO): @
- Runbook executor: @
- FE support on-call: @
- BE support on-call: @

## RC checks (go/no-go)
- [ ] Build
- [ ] Lint
- [ ] Typecheck
- [ ] Tests/CI pipeline in PASS
- [ ] Demo reset executed 2x (idempotent)
- [ ] Smoke RC executed end-to-end
- [ ] RC mobile checklist completed (375x812 + 390x844)
- [ ] Console clean (0 errors)
- [ ] Contract tests PASS
- [ ] E2E lite / critical path check PASS (if configured)

## Evidence (required)
- [ ] Checklist completed (PASS/FAIL)
- [ ] 2 viewport screenshots attached
- [ ] Console screenshot attached (clean)
- [ ] CI/test links attached

Links:
- RC runbook: `docs/rc-runbook-go-no-go.md`
- CI gates: `.github/workflows/pr-quality-gates.yml`
- Contract tests: `docs/prs/sprint-01-pr-02-contract-test-exercises-imageurl.md`
- E2E lite: `docs/e2e.md`
- RC checklist: `docs/rc-checklist.md`
- Demo playbook: `docs/demo-playbook.md`

## Go / No-Go
- [ ] **GO**: all RC checks PASS + evidence attached
- [ ] **NO-GO**: any stop-the-line check FAIL

## If NO-GO (mandatory plan)
- [ ] Fix plan documented (owner + ETA)
- [ ] Rollback plan documented (target commit/tag)
- [ ] Re-run plan documented (reset → smoke → checklist)

## Notes / risks
- Known limitations or follow-up items.
