# Lab 07: Preflight, Color y Validación Profesional

## Proyectos OSS Investigados

- [Scribus](https://scribusproject.github.io/): referencia de expectativa profesional: CMYK, spot colors, ICC, PDF avanzado.
- [Ghostscript color management](https://ghostscript.readthedocs.io/en/latest/GhostscriptColorManagement.html): color management e interpretación PDF/PostScript.
- [veraPDF](https://verapdf.org/): validador open source para PDF/A y PDF/UA.

## Qué Aprendemos

- Preflight no es solo “warnings”; es un sistema de reglas.
- La UI debe separar “preview está bien” de “archivo imprimible está certificado”.
- CMYK soft-proof no es conversión CMYK real.

## Decisión para OpenDTP

Preflight por capas:

1. Documento: bleed, márgenes, overset, frames vacíos.
2. Assets: missing files, DPI, formatos.
3. Texto: fuentes faltantes, ligaduras, hyphenation.
4. Color: RGB en documento print, spot colors, ICC.
5. Export: PDF generado validado por herramientas externas.

## Experimento

Crear motor de reglas:

```ts
type PreflightRule = {
  id: string;
  severity: "info" | "warning" | "error";
  run(document: LayoutDocument, context: PreflightContext): PreflightIssue[];
};
```

## Criterios de Aceptación

- Las reglas se pueden activar/desactivar.
- Cada issue apunta a frame/asset/page.
- Export bloquea errores críticos si el usuario lo decide.
- Reporte descargable.

## Riesgos

- Validar PDF/X requiere perfiles, generación correcta y tooling externo.
- veraPDF valida PDF/A/PDF/UA, no sustituye todo el preflight de imprenta.
