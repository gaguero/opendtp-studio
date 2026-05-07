# Lab 01: DTP y Modelo de Documento

## Proyectos OSS Investigados

- [Scribus](https://scribusproject.github.io/): referencia open source de DTP profesional. Su valor principal para OpenDTP es entender el conjunto de capacidades esperadas: marcos de texto/imagen, color management, PDF avanzado, formatos de import/export y flujo editorial.
- [Penpot](https://github.com/penpot/penpot): herramienta open source de diseño colaborativo basada en estándares web como SVG, CSS, HTML y JSON.
- [Excalidraw](https://github.com/excalidraw/excalidraw): ejemplo de formato abierto JSON, exportación, undo/redo y edición visual simple.

## Qué Aprendemos

- El documento debe ser un objeto estructurado y versionable, no HTML suelto.
- El formato interno debe ser abierto, estable y migrable.
- Los elementos visuales deben tener IDs persistentes para IA, colaboración, undo/redo y comentarios.
- La UI puede ser moderna como Penpot/Excalidraw, pero el modelo debe pensar como Scribus.

## Decisión para OpenDTP

Mantener `LayoutDocument` como contrato base, pero evolucionarlo a:

- `Document`
- `Page`
- `Spread`
- `MasterPage`
- `Layer`
- `Frame`
- `Story`
- `Style`
- `Asset`
- `PreflightReport`

## Experimento

Crear `DocumentV2` en `dtp-core` con migración desde `LayoutDocumentV1`.

## Criterios de Aceptación

- El documento puede representar varias páginas y spreads.
- Cada frame tiene `id`, `layerId`, `locked`, `visible`, `zIndex`.
- Las historias de texto pueden vincularse a varios frames.
- Hay migrador V1 -> V2 con tests.

## Riesgos

- Hacer el modelo demasiado complejo antes de necesitarlo.
- Acoplar el modelo a React o a una librería concreta.
- No definir migraciones desde el inicio.
