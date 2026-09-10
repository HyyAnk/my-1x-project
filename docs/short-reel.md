# Short Reels

Reviewed against working-tree boundaries on 2026-09-09. Short Reels are separate source-bound products, not portrait Episode records.

## Contracts and entry points

- [Shared contracts](../packages/shared/src/shortReel/): records, source snapshots, API and edit schemas.
- [Routes](../apps/server/src/routes/shortReels.ts): HTTP boundary.
- [Services](../apps/server/src/shortReel/): confirmation, generation, dependency policy, packaging and export.
- [Repository](../apps/server/src/repository/shortReels.ts): persistence boundary.
- [UI](../apps/web/src/features/shortReel/): product presentation and workflow hooks.

## Product flow

Topic confirmation validates bound bank sources and creates or recovers a product using durable receipts. See [Question bank](question-bank.md) for source eligibility, fingerprints and localization.

Deliverables such as script, references, cover and publishing data have independent state. An accepted script or generated cover does not mean the entire product is export-ready.

[unitLifecycle.ts](../apps/server/src/shortReel/unitLifecycle.ts) records attempt identity before dispatch and validates results under the repository mutation queue. It rejects cancelled, superseded, stale-dependency or invalid results. Preserve these checks when adding retries or changing provider concurrency.

[dependencyPolicy.ts](../apps/server/src/shortReel/dependencyPolicy.ts) owns dependency fingerprints. Upstream edits must invalidate dependent work; older asynchronous results must not overwrite newer edits.

## Localization and export

Canonical source identity remains English; audience-facing localized projections are product data. Resolve the confirmed target language from persisted product/receipt state, not simply the latest channel language.

[packageService.ts](../apps/server/src/shortReel/packageService.ts) and [exportService.ts](../apps/server/src/shortReel/exportService.ts) own package/export workflows. Enforce required readiness and stale-state checks at export time. Do not describe package export as automatic Episode MP4 rendering.

## Verification

Start with [shortReelRevision.test.ts](../apps/server/test/shortReelRevision.test.ts), [shortReelRoutesConflict.test.ts](../apps/server/test/shortReelRoutesConflict.test.ts), [shortReelLocalization.test.ts](../apps/server/test/shortReelLocalization.test.ts), and [shortReelRoutesExport.test.ts](../apps/server/test/shortReelRoutesExport.test.ts).

Verify repeated confirmation, concurrent edits, cancellation, late results, missing localization, stale deliverables and export recovery. Follow [Workflow](workflow.md) for UI and cross-system checks; historical acceptance reports do not substitute for current tests.
