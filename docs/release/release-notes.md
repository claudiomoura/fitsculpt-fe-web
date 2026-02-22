# Release Notes — RC Final Package

**Dependency statement:** This PR depends on PR-03 being merged (and is recommended after PR-02).

## Qué hay en esta release
- Cierre de RC con foco en estabilidad de frontend para flujos demo.
- Corrección P0 de media en Biblioteca de ejercicios (render de portada cuando backend envía `imageUrls` / `image_urls`).
- Paquete de salida de release: notas, issues conocidos, script oficial de demo y decisión GO/NO-GO actualizada.

## Qué cambió
### Frontend (P0/P1)
- **P0 Biblioteca (media):** se amplió la normalización de media para aceptar arrays (`imageUrls`, `image_urls`) y usar la primera URL válida.
- Se añadieron pruebas unitarias para cubrir payloads de media basados en listas en camelCase y snake_case.

### Proceso de release
- Se documenta script oficial de demo (10 min) para corrida repetible.
- Se documentan issues conocidos con mitigaciones.
- Se consolida decisión GO/NO-GO con evidencia y estado de gates.

## Cómo reportar bugs
1. Registrar hallazgo en `docs/release/bug-bash-log.md` con severidad y pasos de reproducción.
2. Adjuntar evidencia mínima:
   - screenshot/video corto,
   - consola del navegador (si aplica),
   - entorno y build/tag evaluado.
3. Si es P0/P1, abrir incidencia de bloqueo release y actualizar `docs/release/go-no-go.md`.
