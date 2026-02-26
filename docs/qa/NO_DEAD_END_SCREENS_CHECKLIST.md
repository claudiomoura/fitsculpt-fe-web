# No Dead-End Screens Checklist (PASS/FAIL)

Owner: Equipo C (QA)  
Dependency statement: **This PR depends on PR-P0-2-01 and PR-P0-2-02 being merged**.

Objetivo: validar manualmente que no existan pantallas/acciones no vendibles accesibles por URL directa en los 3 puntos críticos de P0-2.

## URLs/acciones bajo prueba (3)

1. **Admin (URL directa):** `/app/admin/gym-requests`
2. **Trainer (1 ruta canónica por URL):** `/app/trainer/clients`
3. **Acción ligada a stub (501/405):** `POST /api/training-plans/active`

## Precondiciones

1. Frontend corriendo en `http://localhost:3000`.
2. Backend/BFF corriendo con sesión válida para rol admin y trainer.
3. Navegador en incógnito + DevTools abierto en pestañas **Network** y **Console**.
4. Limpiar filtros previos de Network.

---

## Caso 1 — URL no vendible admin: `/app/admin/gym-requests`

### Pasos exactos
1. Login con usuario **admin**.
2. Navegar manualmente a `http://localhost:3000/app/admin/gym-requests` desde la barra de dirección.
3. Observar respuesta visual de la página.
4. Revisar Console + Network durante la carga.
5. Tomar screenshot de la pantalla final.

### Expected result (PASS)
- La URL **no** deja al usuario en pantalla muerta/no vendible.
- El usuario ve un resultado explícito y accionable (por ejemplo: redirección a página válida o estado de no-disponible controlado con salida clara).
- No hay bloqueos de navegación.
- No aparecen errores de consola bloqueantes.

### FAIL si
- Se renderiza una pantalla sin salida/acción clara (dead-end).
- Hay contenido hardcoded tipo “Not available” sin ruta de salida útil.
- Hay error crítico en consola o request inesperada que rompe la experiencia.

---

## Caso 2 — Trainer: 1 ruta canónica por URL (`/app/trainer/clients`)

### Pasos exactos
1. Login con usuario **trainer**.
2. Ir a `http://localhost:3000/app/trainer/clients`.
3. Confirmar que la pantalla carga lista de clientes (o estado empty válido).
4. Desde la barra de dirección, probar una variante no canónica conocida por el equipo (si existe), por ejemplo `/app/treinador/clients`.
5. Confirmar comportamiento de canonicalización (redirección/control) y ausencia de duplicidad funcional.
6. Tomar screenshot del resultado en ruta canónica.

### Expected result (PASS)
- Existe una sola ruta canónica funcional para el flujo trainer por URL.
- Variantes no canónicas redirigen o bloquean de forma controlada.
- No hay dos URLs activas distintas sirviendo el mismo flujo de forma inconsistente.
- Sin errores bloqueantes en consola.

### FAIL si
- Dos rutas distintas quedan activas para la misma pantalla trainer sin canonicalización.
- La ruta canónica falla o queda inaccesible.
- Hay dead-end visual o error crítico.

---

## Caso 3 — Acción conectada a endpoint stub (501/405)

### Pasos exactos
1. Login con usuario que pueda ejecutar la acción de “activar plan” (o abrir vista donde existe el CTA ligado al endpoint).
2. Disparar la acción que llama `POST /api/training-plans/active`.
3. En **Network**, validar status de la request.
4. Verificar respuesta de UI ante 501/405.
5. Tomar screenshot de la UI final + evidencia en Network.

### Expected result (PASS)
- Si el endpoint responde `501` o `405`, la UI maneja el caso como “no disponible” sin romper.
- No queda spinner infinito ni pantalla bloqueada.
- Se muestra feedback claro al usuario y alternativa/escape de navegación.
- Sin errores bloqueantes en consola.

### FAIL si
- El usuario queda atrapado (dead-end) tras el error de stub.
- La acción aparenta éxito falso cuando la API devolvió 501/405.
- La UI crashea, se rompe navegación o aparece error crítico en consola.

---

## Checklist rápido de ejecución (1 run)

- [ ] Caso 1 `/app/admin/gym-requests`: PASS
- [ ] Caso 2 `/app/trainer/clients` (canónica única): PASS
- [ ] Caso 3 `POST /api/training-plans/active` (stub 501/405): PASS
- [ ] 0 errores bloqueantes en Console
- [ ] Screenshots adjuntas (mínimo 1 por caso)

**Resultado final del run:** `PASS` / `FAIL`

## Evidencia mínima a adjuntar en PR

1. Link a este documento: `docs/qa/NO_DEAD_END_SCREENS_CHECKLIST.md`.
2. 3 screenshots (1 por caso).
3. Captura de Network del caso 3 mostrando `501` o `405`.
4. Ejemplo de checklist rellenado (1 run), con fecha, entorno y tester.

### Plantilla de ejemplo rellenado (copiar/pegar en PR)

- Fecha: `YYYY-MM-DD`
- Entorno: `local / staging`
- Tester: `@usuario`
- Caso 1 `/app/admin/gym-requests`: `PASS|FAIL` + nota corta
- Caso 2 `/app/trainer/clients`: `PASS|FAIL` + nota corta
- Caso 3 `POST /api/training-plans/active`: `PASS|FAIL` + status observado (`501|405|otro`)
- Console errors: `0 | >0`
- Resultado final: `PASS|FAIL`
