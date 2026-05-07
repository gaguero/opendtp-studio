# Lab 06: Assets, Imágenes y Fuentes

## Proyectos OSS Investigados

- [Sharp](https://sharp.pixelplumbing.com/): procesamiento de imágenes, metadata, transforms y formatos modernos.
- [Fontkit](https://github.com/foliojs/fontkit): lectura de fuentes, glyphs, métricas y soporte de subsetting.
- [Penpot](https://github.com/penpot/penpot): asset/design-token thinking para herramientas creativas.

## Qué Aprendemos

- Assets deben ser objetos versionados, no URLs sueltas en frames.
- DPI real depende de píxeles de imagen y tamaño colocado en mm.
- Fuentes deben tener metadata, licencia/estado, fallback y embedding.

## Decisión para OpenDTP

Crear `Asset`:

```ts
type Asset = {
  id: string;
  kind: "image" | "font" | "icc-profile";
  filename: string;
  mimeType: string;
  storageKey: string;
  metadata: Record<string, unknown>;
};
```

## Experimento

Implementar upload local/S3-compatible:

- imagen
- metadata con Sharp
- cálculo DPI por frame
- advertencia preflight si < 300 DPI para impresión

## Criterios de Aceptación

- Usuario sube imagen.
- Frame puede referenciar asset.
- Preflight detecta baja resolución.
- Export incluye imagen colocada.

## Riesgos

- Railway filesystem no es almacenamiento permanente ideal.
- Font licensing no se puede resolver solo técnicamente.
