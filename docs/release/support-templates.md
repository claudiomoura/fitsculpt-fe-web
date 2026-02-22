# Support templates (post-release)

## 1) Primera respuesta a reporte (ack)

```txt
Gracias por reportarlo 🙌
Ya estamos investigando este incidente.

Para acelerar el diagnóstico, por favor comparte:
1) Usuario/cuenta afectada (sin datos sensibles)
2) Hora aproximada + zona horaria
3) Pantalla/flujo exacto
4) Pasos para reproducir
5) Resultado esperado vs actual
6) Captura/video y errores visibles

Te actualizamos en <ETA según severidad>.
```

## 2) Solicitud de datos mínimos (cuando falta contexto)

```txt
Necesitamos un poco más de información para reproducir:
- ¿Sucede siempre o intermitente?
- ¿En web móvil, desktop o ambos?
- ¿Qué plan tenía el usuario (FREE/Premium)?
- ¿Qué endpoint o acción falló (si se conoce)?
- ¿Se pudo completar el flujo con workaround?
```

## 3) Actualización de estado (investigando)

```txt
Estado: Investigating
Severidad: <P0|P1|P2>
Impacto actual: <breve>
Hipótesis inicial: <breve>
Próxima actualización: <hora>
```

## 4) Mitigación aplicada

```txt
Estado: Mitigated
Acción aplicada: <hotfix/rollback/config>
Resultado: <qué mejoró>
Riesgo residual: <si existe>
Siguiente paso: monitorizar durante <X horas>
```

## 5) Resolución

```txt
Estado: Resolved ✅
Causa raíz: <breve>
Corrección: <breve>
Validación: smoke/checklist PASS
Prevención: <acción follow-up>
```

## 6) Plantilla de comunicación interna (war-room)

```md
[INCIDENTE] <ID> - <P0|P1|P2>
- Owner:
- Detección:
- Impacto:
- Sistemas/superficies afectadas:
- Mitigación en curso:
- Próximo update:
```

## 7) Qué información pedir siempre (checklist)

- Identificador del usuario afectado (anonimizado cuando aplique).
- Timestamp exacto del fallo.
- Ruta/pantalla y acción ejecutada.
- Entorno (prod/staging/local), dispositivo y navegador.
- Evidencia (captura, video, error textual).
- Reproducibilidad (siempre/intermitente) y alcance estimado.
