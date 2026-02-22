# Demo Script Oficial (10 min) — Release Candidate

**Dependency statement:** This PR depends on PR-03 being merged (and is recommended after PR-02).

## Objetivo
Demostrar core loop, gating FREE vs premium y persistencia, con **0 errores de consola** en flows clave.

## Preparación (1 min)
- Build/entorno release desplegado y accesible.
- Cuenta demo con datos mínimos (ejercicios + tracking previo).
- Abrir DevTools (Console) y limpiar logs antes de iniciar.

## Script cronometrado
### 1) Login + guard de app (1 min)
- Entrar con usuario demo.
- Verificar acceso a `/app` y redirección correcta.
- Evidencia: captura de home/tab principal + consola sin errores.

### 2) Biblioteca de ejercicios (2 min)
- Abrir `/app/biblioteca`.
- Confirmar que las tarjetas muestran imagen (no placeholder masivo cuando hay media real).
- Abrir detalle de 1 ejercicio.
- Evidencia: 1–2 capturas de lista/detalle + consola sin errores.

### 3) Tracking + persistencia (2 min)
- Crear 1 entrada de tracking.
- Refrescar pantalla y confirmar que el dato persiste.
- Evidencia: captura antes/después refresh + consola sin errores.

### 4) Gating FREE vs premium (2 min)
- Con cuenta FREE, navegar a feature premium y confirmar bloqueo/CTA correcto.
- Con cuenta premium (o override admin), confirmar acceso permitido.
- Evidencia: captura de estado bloqueado + estado habilitado.

### 5) Cierre y sanity rápido (2 min)
- Navegar 2–3 rutas core adicionales (Hoy, Perfil, Biblioteca).
- Confirmar ausencia de errores de consola/page errors.
- Evidencia: export/log breve de consola.

## Resultado esperado para PASS
- 0 console errors / page errors durante toda la demo.
- Biblioteca renderiza media correctamente en ejercicios con URLs válidas.
- Persistencia de tracking confirmada tras refresh.
- Gating FREE/premium consistente.

## Evidencias mínimas a adjuntar
- 2–4 screenshots.
- Extracto de consola limpia.
- Links de CI / contract tests / E2E lite en `go-no-go.md`.
