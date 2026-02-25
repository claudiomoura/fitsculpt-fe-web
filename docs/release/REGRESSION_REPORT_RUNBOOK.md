# Runbook — Cómo reportar una regresión

**Owner:** Equipo C  
**Dependency statement:** This PR depends on PR-02 being merged

## Objetivo
Estandarizar el reporte de regresiones para acelerar triage, reproducción y corrección.

## Cuándo usar este runbook
- Cualquier comportamiento que funcionaba previamente y ahora falla.
- Cambios inesperados luego de merge/deploy RC.
- Errores detectados en demo, smoke manual o E2E.

## Checklist de captura obligatoria
Al reportar una regresión, incluir **todo** lo siguiente:

1. **Resumen corto**
   - Qué se esperaba y qué ocurrió.

2. **Pasos de reproducción**
   - Secuencia numerada exacta (sin ambigüedad).
   - Datos usados (usuario/rol, flags, entorno).

3. **Resultado esperado vs actual**
   - Diferencia clara entre comportamiento esperado y observado.

4. **Consola del navegador**
   - Captura o export del error/warn relevante.
   - Indicar si se limpió la consola antes de reproducir.

5. **Network (request/response)**
   - Endpoint, método, status code, payload/respuesta relevante.
   - Correlation/request id cuando exista.

6. **Screenshot o video corto**
   - Debe mostrar contexto de UI + estado final del fallo.

7. **Build SHA / versión desplegada**
   - Commit SHA exacto del build probado.

8. **Impacto y severidad inicial**
   - Sugerir severidad (P0/P1/P2/P3) y módulo afectado.

## Plantilla de reporte
Copiar/pegar en issue/PR/comentario:

```md
### Regression Report
- **Título:**
- **Entorno:** (local/staging/rc/prod)
- **Build SHA:**
- **Fecha/hora (UTC):**
- **Módulo:**
- **Severidad sugerida:** (P0/P1/P2/P3)

#### Resumen

#### Pasos para reproducir
1.
2.
3.

#### Resultado esperado

#### Resultado actual

#### Evidencia
- Console:
- Network:
- Screenshot/Video:

#### Notas adicionales
- Usuario/rol:
- Flags/config:
- Frecuencia: (siempre/intermitente)
```

## Flujo de triage recomendado
1. Validar reproducibilidad con pasos entregados.
2. Confirmar alcance (solo FE / involucra API / datos).
3. Etiquetar owner (FE/BE/QA) y prioridad.
4. Vincular evidencia en `GO_NO_GO_CHECKLIST.md` si afecta release.
5. Actualizar estado en `RC_STATUS.md` cuando cambie PASS/FAIL.

## Criterio de “reporte completo”
Un reporte se considera listo para acción cuando incluye: pasos + expected/actual + consola + network + screenshot + build SHA.
