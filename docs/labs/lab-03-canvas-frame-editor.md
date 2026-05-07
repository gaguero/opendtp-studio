# Lab 03: Canvas, Frames y Manipulación Directa

## Proyectos OSS Investigados

- [Penpot](https://github.com/penpot/penpot): editor visual colaborativo, estándares web, design tokens.
- [Excalidraw](https://github.com/excalidraw/excalidraw): interacción visual simple, formato JSON abierto, undo/redo, exportación.
- [Konva](https://github.com/konvajs/konva): framework Canvas 2D para interactividad desktop/mobile.
- [Fabric.js](https://fabricjs.com/docs/why-fabric/): canvas interactivo con detección de objetos y stack de render.

## Qué Aprendemos

- Para un DTP profesional, el lienzo debe sentirse directo: seleccionar, mover, redimensionar, alinear, bloquear, ordenar.
- Canvas puro es potente para selección/overlays, pero texto editorial complejo vive mejor en DOM/CSS.
- Excalidraw demuestra que un formato JSON abierto ayuda a undo/redo, almacenamiento y comunidad.

## Decisión para OpenDTP

Usar arquitectura híbrida:

- DOM/CSS para página y texto.
- React overlay para selección, handles y guías.
- `react-rnd` ahora para acelerar drag/resize.
- Evaluar Konva solo si necesitamos miles de objetos o herramientas vectoriales avanzadas.

## Experimento

Implementar manipulación directa de frames con:

- selección
- drag
- resize
- snap a márgenes
- undo/redo
- inspector numérico

## Criterios de Aceptación

- Un frame puede moverse y redimensionarse con mouse.
- El cambio actualiza `LayoutDocument`.
- El documento se puede guardar y exportar.
- Hay undo/redo para cambios de geometría.

## Riesgos

- `react-rnd` puede quedarse corto para herramientas vectoriales complejas.
- Mezclar DOM y overlays puede crear desalineación si no hay una sola función de escala.
