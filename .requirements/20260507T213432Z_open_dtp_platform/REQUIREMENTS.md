# Open DTP Platform Requirements

## As Is

The workspace is empty, is not initialized as a Git repository, and has no deployable application, tests, CI, Dockerfile, or Railway configuration.

## To Be

Create OpenDTP Studio 1.0: an open source TypeScript DTP platform prototype inspired by Open Design style workflows and Scribus-class publishing concerns. It must run locally, be container-ready for Railway, expose a web editor, provide a layout JSON schema, generate prompt-to-layout documents, support dynamic multi-column text flow in the browser, expose AI-assisted grammar/design editing endpoints, and document the technical path to professional PDF/CMYK scaling.

## Requirements

1. Provide a professional repository structure with README, license, Dockerfile, Railway config, GitHub Actions, and TypeScript workspace packages.
2. Implement a reusable DTP layout schema and deterministic prompt-to-layout fallback engine.
3. Implement a reactive web editor that previews page layouts, text frames, image frames, and dynamic multi-column text flow.
4. Implement an API service with endpoints for health, prompt-to-layout generation, natural-language layout editing, grammar editing, and PDF export handoff.
5. Integrate OpenAI through environment variables when available and degrade to deterministic local behavior when no API key exists.
6. Include tests for schema validation, prompt layout generation, and API behavior.
7. Prepare production deployment on Railway with Docker and `railway.json`.
8. Document architecture, research decisions, known limitations, scaling strategy, and deployment steps.

## Acceptance Criteria

1. Repository contains MIT license, README, `.github/workflows/ci.yml`, Dockerfile, `railway.json`, workspace package manifests, and a clear app/package folder layout.
2. The core package exports a Zod schema, TypeScript types, sample layout, prompt parser, validation helpers, and text metrics helpers.
3. The web app can call the API, render an editable document preview, show page/page-box information, and flow story text across multiple columns with CSS multicolumn layout.
4. API endpoints return typed JSON, validate inputs, and never require an AI key for local smoke tests.
5. If `OPENAI_API_KEY` exists, OpenAI structured output is used for prompt-to-layout; otherwise the fallback creates valid layouts.
6. `npm test` passes.
7. `docker build` is expected to build the production image and Railway can use `npm start` through the container.
8. README includes research, autocrítica, deployment instructions, environment variables, and scale plan.

## Testing Plan

- Unit: validate schema accepts sample layouts and rejects malformed layouts.
- Unit: prompt parser generates valid layouts with requested page size, columns, and title/body content.
- Integration: API health and generation endpoints return valid responses without OpenAI credentials.
- Build: TypeScript builds all packages and Vite builds the web app.
- Smoke: start the API after build and confirm `/api/health`.

## Implementation Plan

1. Scaffold workspace metadata, documentation, license, CI, Docker, and Railway config; verify file structure.
2. Add `packages/dtp-core` with schema, sample data, fallback prompt engine, and tests; run core tests.
3. Add `apps/api` with Fastify endpoints and optional OpenAI adapter; run API tests.
4. Add `apps/web` with React editor, preview, layout controls, and API client; run build.
5. Run full test/build suite, initialize git, and attempt GitHub/Railway publication only if non-interactive credentials are available.
