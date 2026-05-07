# Professional Platform Phase 1 Requirements

## As Is

OpenDTP Studio has prompt-to-layout, live preview, preflight scoring, PDF export, and Railway deployment. It still behaves like a single-session editor: documents are not saved, frames cannot be manipulated directly, and the professional roadmap is documented only at a high level.

## To Be

Start the full professional product build-out by adding a concrete roadmap plus the first durable product layer: document persistence and direct frame manipulation. Use open source libraries when they accelerate mature behavior.

## Requirements

1. Document the complete professional roadmap with phases, architecture, open source dependencies, and deployment requirements.
2. Add a document repository boundary in the API that can use filesystem storage locally and later swap to PostgreSQL.
3. Add document CRUD endpoints: list, create, read, update, delete.
4. Add API tests for document persistence.
5. Add direct manipulation in the editor using an open source drag/resize library.
6. Add save/load/new document UX and status feedback.
7. Preserve existing prompt generation, preflight, PDF export, and Railway deployment.

## Acceptance Criteria

1. `docs/PROFESSIONAL_ROADMAP.md` explains the full path to a professional product.
2. The API persists documents under a configurable local data directory when no database exists.
3. `/api/documents` supports list/create/read/update/delete with validated layouts.
4. The web UI can create, load, save, and edit frame geometry by dragging/resizing.
5. Tests cover persistence and existing export behavior.
6. Typecheck, tests, build, audit, local smoke, GitHub push, and Railway deploy all pass.

## Testing Plan

- Unit/integration: API document CRUD with temporary data directory.
- Integration: PDF export still returns `%PDF`.
- Build: full workspace build.
- Smoke: compiled server health, list/create/save document.

## Implementation Plan

1. Write the professional roadmap and dependency strategy.
2. Install `react-rnd` for frame drag/resize.
3. Add API document store module and endpoints.
4. Extend API tests.
5. Update editor UI and frame rendering to support direct manipulation and persistence.
6. Verify, commit, push, and redeploy.
