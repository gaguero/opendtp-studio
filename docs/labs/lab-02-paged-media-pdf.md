# Lab 02: Paged Media y Exportación PDF

## Proyectos OSS Investigados

- [Vivliostyle](https://docs.vivliostyle.org/en/): motor open source de CSS typesetting. Ofrece Viewer, CLI para PDF desde HTML/Markdown, VFM y temas.
- [Paged.js](https://pagedjs.org/en/about/): librería open source que pagina HTML en navegador siguiendo estándares W3C Paged Media y Generated Content for Paged Media.
- [Ghostscript](https://ghostscript.readthedocs.io/en/latest/GhostscriptColorManagement.html): herramienta madura para PDF/PostScript y color management.
- [veraPDF](https://docs.verapdf.org/validation/): validador open source para PDF/A y PDF/UA basado en reglas formales.

## Qué Aprendemos

- La exportación profesional debe ser un pipeline, no una función dentro del request HTTP.
- HTML/CSS puede ser la fuente canónica para paginación, pero PDF/X requiere validación posterior.
- Vivliostyle/Paged.js resuelven mucho de paged media; Ghostscript/veraPDF cubren validación y prepress.

## Decisión para OpenDTP

Pipeline objetivo:

1. `LayoutDocument` -> HTML/CSS canónico.
2. HTML/CSS -> paginación con Vivliostyle o Paged.js.
3. Render a PDF con Chromium/Playwright o Vivliostyle CLI.
4. Post-proceso con Ghostscript para perfiles/color cuando aplique.
5. Validación con veraPDF/Ghostscript.
6. Guardar reporte y PDF como artefactos.

## Experimento

Crear `apps/export-worker` con BullMQ y Vivliostyle CLI.

## Criterios de Aceptación

- Export job asíncrono.
- Progreso consultable por API.
- PDF generado y almacenado.
- Reporte de validación adjunto.

## Riesgos

- Railway puede no ser ideal para Chromium pesado en el web service.
- PDF/X real exige más que “se ve bien”.
- Fuentes y perfiles ICC deben ser controlados.
