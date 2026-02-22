S1. **PR-ID debe reflejar el orden de merge**, o sea PR-01, PR-02, PR-03… asignados por el propio agente según dependencias.
2. Añadir un campo explícito: **Base branch** (si puede arrancar desde `origin/dev` tal cual, o si necesita `dev + PR-0X merged`).

Aquí tienes el texto listo para pegar a tus agentes, ya con lo que pides (orden, copy paste, y frase clara de dependencia).

---

## Prompt corto (obligatorio) para agentes

Pega esto tal cual a cada agente:

**Entrega tu trabajo como “Dependency Manifest” y como PR prompt copy/paste.**

### Reglas obligatorias

* Asigna **PR-IDs en orden de merge**: PR-01, PR-02, PR-03… (el número debe coincidir con el orden recomendado de merge).
* Cada PR debe ser **copiable en un solo bloque** (un bloque por PR, sin texto intermedio).
* Debes declarar de forma explícita si el PR **puede empezar ya** con la base actual de GitHub (`origin/dev`) o si **requiere** que otro PR esté mergeado.
* Regla de dependencias: si tocas un archivo que otro PR también toca (layout, nav, globals.css, ExerciseLibraryClient, AppUserBadge, etc.), marca dependencia práctica y ordena.

### Formato obligatorio por PR

```md
### PR-<NN>: <TITLE>

Base branch:
- Can start from origin/dev | Needs dev + PR-<XX> merged

Files touched:
- <ruta 1>
- <ruta 2>

Depends on:
- None | PR-<XX>, PR-<YY>

Parallel-safe with:
- PR-<AA>, PR-<BB> | None

Merge order:
- Merge anytime | Merge after PR-<XX>
- Recommended sequence position: <NN> of <TOTAL>

Conflict risk:
- Low | Medium | High
Reason: <1 frase>

Merge blockers (must pass):
- <check 1>
- <check 2>

Verify:
- <cmd 1>
- <cmd 2>

Dependency statement (1 line, mandatory):
- This PR depends on PR-<XX> being merged | This PR can run now on origin/dev
```

### Extra (obligatorio)

Al final, incluye un **resumen de orden**:

```md
## Merge plan
PR-01 -> PR-02 -> PR-03 -> ... -> PR-0N
Parallel groups (if any): [PR-0X, PR-0Y], [PR-0A, PR-0B]
```

---

### Nota práctica

Si el agente **no ve** los otros PRs, debe decirlo y marcar riesgo como **Medium** cuando toque archivos típicamente compartidos (layout/nav/globals) y proponer el orden más seguro.
