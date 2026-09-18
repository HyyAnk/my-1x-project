# Migration, Rollout and Verification

## Storage and migration

Do not delete existing still assets. Add animation fields and job/artifact records in a backward-readable migration. Existing styles start as not_started. Do not run destructive migration automatically. Published animation versions are immutable.

## Rollout gates

1. Contract and baseline tests pass.
2. Fixture sprite-gen adapter succeeds without provider credentials.
3. One real style produces one thinking and one celebrate row.
4. The two-row twelve-frame pilot passes QA and preview/production parity.
5. Ten thinking variants for one style pass.
6. Twenty variants for one style pass.
7. All existing styles are processed with bounded concurrency.
8. Representative quiz video passes deterministic selection and render inspection.

## Verification matrix

- Shared schemas: valid and invalid manifests, slot statuses and publish gate.
- Fingerprints: same input same key; changed anchor or recipe creates new revision.
- Lifecycle: success, slow run, cancellation, retry, stale completion and provider failure.
- Filesystem: missing/partial output, traversal rejection, atomic publish and cleanup.
- Alpha QA: fringe, hidden RGB, holes, empty frame and edge contact fixtures.
- Motion QA: duplicate threshold, semantic recipe evidence, seam and return-to-rest.
- API: validation, idempotency, progress, retry, publish rejection and structured errors.
- UI: batch progress, slot status, curation, retry, keyboard access, mobile width and required footer.
- Renderer: exact frame sampling, loop, pivot, placement and localization.
- Determinism: same video/question gives same slot and pixel output.
- Preview parity: same snapshots from Studio and production.

After each implementation update, run the updated artifact. Final checks are:

pnpm --filter @studio/shared build
pnpm --filter @studio/server typecheck
pnpm --filter @studio/web typecheck
pnpm --filter @studio/server test
pnpm --filter @studio/web test
pnpm lint
pnpm build

For visual changes, run the existing visual regression and inspect a real preview and render. Compile-only success is insufficient.

