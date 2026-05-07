# OpenDTP Studio

OpenDTP Studio is an open source browser-based desktop publishing platform. The 1.0 MVP combines a TypeScript DTP layout contract, a prompt-to-layout API, and a React workspace that renders printable page geometry, editable frames, and dynamic multi-column text flow.

## Status

- Version: `1.0.0`
- License: MIT
- Runtime: Node.js 20
- Deploy target: Railway Docker service
- AI provider: OpenAI optional through `OPENAI_API_KEY`

## Research Decision

The best MVP stack is a modular TypeScript monolith:

- **Rendering:** browser CSS Paged Media plus CSS multi-column flow for live preview. MDN documents CSS paged media for page size, margins, page breaks, and generated pages, while `column-fill` controls how text fills columns in multicol layouts.
- **PDF path:** Playwright/Chromium for pragmatic server-side PDF export, with Vivliostyle or Paged.js as the next pagination worker. Playwright documents `page.pdf()` and print CSS behavior; Vivliostyle provides an open CSS typesetting engine and CLI for HTML/Markdown to PDF.
- **Backend:** Fastify on Node.js because the product is TypeScript end-to-end, deploys cleanly as one Railway container, and can later split export/AI jobs into workers.
- **LLM integration:** OpenAI Responses API with Structured Outputs when credentials exist, because OpenAI recommends schema-constrained JSON for reliable typed output. The app includes a deterministic fallback so CI and demos do not require paid API access.

References:

- [Railway Dockerfiles](https://docs.railway.com/builds/dockerfiles)
- [Railway config as code](https://docs.railway.com/reference/config-as-code)
- [Vivliostyle documentation](https://docs.vivliostyle.org/en/)
- [Paged.js getting started](https://pagedjs.org/en/documentation/2-getting-started-with-paged.js/)
- [Playwright PDF API](https://playwright.dev/docs/api/class-page)
- [MDN CSS paged media](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Paged_media)
- [MDN column-fill](https://developer.mozilla.org/en-US/docs/Web/CSS/column-fill)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)

## Autocrítica y Correcciones

1. **Riesgo: rendimiento del render editorial en documentos largos.**  
   Corrección: el MVP usa CSS columns solo para preview interactivo. La exportación profesional queda diseñada como worker asíncrono con Vivliostyle/Paged.js/Playwright, para que paginación pesada no bloquee la UI ni el proceso web.

2. **Riesgo: límites de Railway para procesos intensivos con Chromium.**  
   Corrección: el servicio web valida y cola exportaciones. La arquitectura documenta separar `web-api` y `export-worker` cuando haya PDF real, con colas y almacenamiento de artefactos.

3. **Riesgo: compatibilidad de fuentes y CMYK real.**  
   Corrección: el contrato diferencia `cmyk-soft-proof` de CMYK/PDF-X verdadero. La ruta de escalado exige catálogo de fuentes, embedding/subsetting, perfiles ICC y validación PDF/X antes de prometer prepress completo.

## Repository Layout

```text
apps/
  api/        Fastify API, OpenAI adapter, static web serving
  web/        React/Vite editor and page preview
packages/
  dtp-core/   Zod schema, layout types, prompt fallback engine, metrics
.github/
  workflows/  CI checks
```

## Local Development

```bash
npm install
npm run build
npm test
npm run dev
```

Open `http://localhost:3000` after the API starts. Vite can also run separately from `apps/web` during frontend work.

## Environment Variables

```text
PORT=3000
HOST=0.0.0.0
OPENAI_API_KEY=optional
OPENAI_MODEL=gpt-4o-mini
```

Without `OPENAI_API_KEY`, `/api/layouts/generate` uses the local deterministic layout engine.

## API

- `GET /api/health`
- `GET /api/sample`
- `POST /api/layouts/generate` with `{ "prompt": "..." }`
- `POST /api/layouts/edit` with `{ "layout": LayoutDocument, "instruction": "..." }`
- `POST /api/text/edit` with `{ "text": "...", "instruction": "..." }`
- `POST /api/export/pdf` with `{ "layout": LayoutDocument }`

## Railway Deployment

Railway will detect the root `Dockerfile`; `railway.json` sets the Docker builder, start command, and `/api/health` healthcheck.

Required Railway variables:

```text
OPENAI_API_KEY=<your key, optional for fallback mode>
OPENAI_MODEL=gpt-4o-mini
```

Deploy from GitHub by connecting this repository in Railway, or from a logged-in CLI:

```bash
railway up
```

## Scaling Plan

1. Split the monolith into `web-api`, `export-worker`, and `ai-worker` services.
2. Add PostgreSQL for projects, document versions, comments, and asset metadata.
3. Add object storage for images, font files, generated PDFs, and preview thumbnails.
4. Replace MVP PDF handoff with a queue-backed worker using Vivliostyle/Paged.js plus Playwright for final PDF generation.
5. Add font cataloging, font subsetting, hyphenation dictionaries, OpenType feature controls, and missing-font preflight.
6. Add professional color management: ICC profiles, spot colors, separations, overprint preview, and Ghostscript/veraPDF validation for PDF/X.
7. Add collaboration primitives: document locks, CRDT-backed editing, audit logs, and role-based permissions.
