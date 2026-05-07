# Production Ready Studio Requirements

## As Is

OpenDTP Studio is deployed and functional, but still has MVP seams: PDF export is only a queued placeholder, there is no API rate limiting or security header layer, dependency audit reports moderate vulnerabilities, frontend state lacks resilient error/success feedback, and the editor has no JSON inspector or export download loop.

## To Be

Raise the product toward a publishable 1.0: real PDF export from the layout JSON, stronger API behavior, richer document intelligence, polished editor interactions, better error handling, and a clean verified redeployment to GitHub and Railway.

## Requirements

1. Resolve moderate dependency audit issues without breaking build/test.
2. Implement a real server-side PDF export endpoint that returns `application/pdf`.
3. Add layout preflight utilities that detect overset text risk, missing images, bleed state, and soft-proof CMYK limitations.
4. Harden the API with rate limiting, security headers, request IDs, and structured errors.
5. Upgrade the editor with export download, retryable network errors, success feedback, command history, preflight scoring, and JSON inspection.
6. Preserve deterministic local behavior when no AI key is configured.
7. Verify typecheck, tests, build, smoke, GitHub push, and Railway redeploy.

## Acceptance Criteria

1. `npm audit --audit-level=moderate` exits cleanly or only reports dev-only issues that are documented with a mitigation.
2. `POST /api/export/pdf` returns a downloadable PDF for a valid layout.
3. Core tests cover preflight scoring and PDF-relevant layout checks.
4. API tests cover PDF export and bad request behavior.
5. UI can generate, edit, export, inspect JSON, and recover from failed API calls.
6. `npm run typecheck`, `npm test`, and `npm run build` pass.
7. Public Railway `/api/health` and `/api/export/pdf` work after redeploy.

## Testing Plan

- Unit: preflight utility flags sample layout warnings and scores document health.
- Integration: API PDF export returns `%PDF` bytes with `application/pdf`.
- Integration: invalid layout requests return a structured 400.
- Build: TypeScript and Vite build.
- Smoke: local compiled server health and PDF endpoint.
- Deployment: Railway status success and public health check.

## Implementation Plan

1. Upgrade vulnerable packages and rerun audit/typecheck.
2. Add preflight utilities to `dtp-core` with tests.
3. Add PDF export service to API using a Node PDF renderer and test endpoint bytes.
4. Add security/rate-limit plugins and structured error behavior.
5. Refactor React app into resilient stateful editor with toast/status, export, command history, and JSON inspector.
6. Run full verification, commit, push, deploy, and smoke test production.
