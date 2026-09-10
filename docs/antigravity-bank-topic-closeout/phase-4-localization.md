# Phase 4: Product Localization Implementation Plan

> Execute directly; preserve current repairs and accepted user data.

Goal: every actual product consumer obeys the stored language boundary.
Architecture: canonical English source plus immutable per-product target and validated display projection.
Tech stack: TypeScript, provider adapters, Vitest.
Spec: [Contract](02-contract.md).

## Files

Modify apps/server/src/repository/channels.ts, apps/server/src/quiz/pipeline/orchestrator.ts, apps/server/src/quiz/description/descriptionGenerator.ts and descriptionFormatter.ts as needed.
Inspect apps/server/src/quiz/thumbnail/thumbnailService.ts, apps/server/src/quiz/bank/localization/productLocalization.ts, apps/server/src/shortReel/scriptPrompt.ts, scriptService.ts, thumbnailAdapter.ts and publishingService.ts.
Extend apps/server/test/productLocalization.test.ts and shortReelLocalization.test.ts.
Create apps/server/test/productLocalizationConsumers.test.ts for description, thumbnail, script/export and channel-change integration.

## Tasks

- [ ] Confirm de product, change channel to fr, then regenerate description/script/thumbnail. Expect existing product to remain de and newly confirmed products to use fr. English canonical source bytes remain unchanged.
- [ ] Replace delete-only localization invalidation with the immutable-product policy. Preserve existing localized artifacts, ready units and user edits; channel update does not rewrite historical products.
- [ ] Pass the validated product target/projection into description generation and assembly. Current channel language is not authoritative for confirmed products.
- [ ] Inject description provider failure and incomplete output. For de/fr use a verified localized fallback or fail recoverably; never label English fallback copy as de/fr.
- [ ] Assert thumbnail instructions remain English and only in-image literal text is translated. Verify actual final prompt/export payload, not just localization.json existence.
- [ ] Capture Short-Reel prompt and baseline/generated script. Narrative/action/camera/continuity/audio instructions stay English; exact quiz display cues follow the target.
- [ ] Exercise en/de/fr through actual Episode and Reel consumer APIs with deterministic provider doubles. English translation call count is zero. Invalid targets fail before any provider call or durable write.
- [ ] Verify correct-choice IDs/order/source hashes after translation and after export. Corrupt artifacts fail closed; missing artifacts for non-English confirmed products require recovery, not implicit English projection.
- [ ] Search all product completion/export/transcreation write-back routes and prove no translated Bank insertion. Keep Bank schema/write boundaries explicit English.
- [ ] Write reports/phase-4.md including observed consumer payloads with secrets removed.

Do not add a broad language-conversion feature. The immutable target policy avoids destructive invalidation and is defined in the contract.
