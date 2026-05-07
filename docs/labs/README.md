# OpenDTP Research Labs

Estos laboratorios convierten proyectos open source existentes en aprendizaje aplicable para OpenDTP Studio. La regla es simple: copiar ideas y arquitecturas permitidas por licencia cuando conviene, integrar librerías cuando acelera, y no reinventar motores que ya existen.

## Laboratorios

1. [Lab 01: DTP y Modelo de Documento](./lab-01-dtp-document-model.md)
2. [Lab 02: Paged Media y Exportación PDF](./lab-02-paged-media-pdf.md)
3. [Lab 03: Canvas, Frames y Manipulación Directa](./lab-03-canvas-frame-editor.md)
4. [Lab 04: Texto Editorial, Estilos y Flujo](./lab-04-editorial-text-engine.md)
5. [Lab 05: Colaboración Local-First](./lab-05-collaboration.md)
6. [Lab 06: Assets, Imágenes y Fuentes](./lab-06-assets-images-fonts.md)
7. [Lab 07: Preflight, Color y Validación Profesional](./lab-07-preflight-color-validation.md)
8. [Lab 08: IA para Layout, Texto e Imágenes](./lab-08-ai-layout-text-images.md)

## Cómo se usan

Cada lab define:

- Proyectos open source investigados.
- Qué nos llevamos a OpenDTP.
- Qué no debemos copiar.
- Experimento implementable.
- Criterios de aceptación.
- Riesgos técnicos.

## Decisión de Plataforma

OpenDTP debe ser un editor híbrido:

- DOM/CSS para texto, previsualización editorial y compatibilidad con paged media.
- Canvas/SVG para manipulación visual, overlays, guías, handles y selección.
- Worker de exportación para PDF profesional.
- LLMs como generadores de artefactos validados, no como mutadores opacos.
