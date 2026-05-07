# Lab 05: Colaboración Local-First

## Proyectos OSS Investigados

- [Yjs](https://docs.yjs.dev/): CRDT de alto rendimiento para aplicaciones colaborativas como Google Docs/Figma.
- [Yjs collaborative editor guide](https://docs.yjs.dev/getting-started/a-collaborative-editor): muestra documentos compartidos, providers, awareness/presence y offline.
- [Excalidraw](https://github.com/excalidraw/excalidraw): referencia de colaboración en canvas y formato abierto.

## Qué Aprendemos

- La colaboración profesional necesita presencia, conflictos resueltos, offline y persistencia de updates.
- Yjs no impone editor; sincroniza tipos compartidos.
- Para OpenDTP, no todo debe ser CRDT al inicio. Podemos sincronizar historias y frames primero.

## Decisión para OpenDTP

Fasear colaboración:

1. Autosave y versiones centralizadas.
2. Yjs para story editing.
3. Yjs maps/arrays para frames.
4. Awareness: cursores, selección, usuario activo.
5. Comentarios/revisión.

## Experimento

Crear sala colaborativa por documento usando `y-websocket`.

## Criterios de Aceptación

- Dos navegadores editan la misma historia.
- Los cambios se sincronizan sin refresh.
- Presencia muestra usuarios conectados.
- El documento persiste después de cerrar la sesión.

## Riesgos

- CRDT en geometría puede generar conflictos visuales raros.
- Colaboración antes de undo/redo sólido complica todo.
