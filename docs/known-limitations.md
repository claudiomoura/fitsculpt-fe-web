# Known limitations (RC Mobile)

Lista explícita de límites conocidos para evitar sorpresas en demo/QA.

## Límites funcionales aceptados para RC

- **Gym pilot puede estar deshabilitado por feature flag** en algunos entornos. Resultado esperado: estado controlado (`N/A` en checklist), no crash.
- **Estados vacíos dependen de seed/demo-data**: sin datos semilla, algunas vistas mostrarán empty-state (esperado), no debe considerarse bug.
- **Cobertura mobile validada solo en 2 viewports objetivo** (375x812 y 390x844). Otros tamaños quedan fuera del alcance de este RC checklist corto.
- **Warnings de consola no bloquean RC** mientras no existan `console error` y la UX sea estable.

## Qué NO es limitación (bloquea RC)

- Cualquier `console error` durante el recorrido.
- Loop de redirección en login/rutas protegidas.
- Crash visual o pantalla en blanco en flujos core.
- Gating inconsistente entre FREE y premium en el mismo contenido.

## Relación con el checklist

Este documento complementa `docs/rc-checklist.md` y se usa como contexto al marcar PASS/FAIL y decidir GO/NO-GO.
