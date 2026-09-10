# Phase 07 - Export, Legacy Integration and Recovery

## Files and boundaries

Modify `exportService.ts`, shared manifest contract if applicable, `useShortReelExport.ts`, task restart/recovery boundary as discovered through CodeGraph, and `docs/short-reel.md`. Extract new pure publishing export formatting into `apps/server/src/shortReel/publishingExport.ts` instead of enlarging export orchestration.

Tests: extend `shortReelRoutesExport.test.ts`, `shortReelPackageRepair.test.ts`, `shortReelDrainLifecycle.test.ts`; create `shortReelExportV2.test.ts` and `shortReelRestartV2.test.ts`.

## Export steps

- [ ] Inspect the existing ZIP entry names, manifest schema/version, asset verification and revision check. Preserve existing file names where compatible; do not break download consumers just to rename folders.
- [ ] Implement pure `buildPublishingExport(payload: ReelPublishingPayload): string` with exactly TITLE and DESCRIPTION sections. No appended second hashtag/CTA block. Include `publishing.json` as an additive machine-readable two-field file if no existing equivalent exists.

```ts
expect(buildPublishingExport({ title: "Tool Duel", description: "Choose your champion. #Quiz #Tools" })).toBe(
  "TITLE: Tool Duel\n\nDESCRIPTION:\nChoose your champion. #Quiz #Tools\n",
);
```

- [ ] Export a validated three-prompt package with mascot reference, generated style, portrait cover, script and publishing. Include image checksums and generation/input provenance; do not include credentials or base64 request images in the manifest.
- [ ] Keep no-traversal/duplicate-entry protection, bounded reads, checksum verification, source completeness and final revision race check. Add visual-context/input-status freshness to readiness validation.
- [ ] Recompile prompts from the exact exported snapshot so prompt labels/assets match the exported references. A model-note-only edit must not require paid regeneration to export.
- [ ] Test a complete fixture export opens as a real ZIP, contains expected entries, and actual cover/style image metadata is 1080x1920. Verify mascot bytes equal the selected master.
- [ ] Test stale script/style/cover/publishing, missing files, modified bytes/checksum, changed mascot selection, path traversal and concurrent revision mutation: export must fail clearly and not produce a mixed package.
- [ ] Test publishing hashtags appear once. Compare JSON values to UI copy utility fixtures to prevent formatting drift.

## Legacy and restart steps

- [ ] Reopen a v1 record with accepted script and missing/failed references: it loads and preserves content. Repair creates only the required new-version outputs based on adopted current context; it does not make a new unrelated reel.
- [ ] Old ready style references may be preserved as previous output but cannot pass the new portrait/script-provenance gate merely because their state string says ready. Explain regeneration requirement in UI.
- [ ] Reopen old persisted task requests with no mode/progress: they parse, and completed tasks do not rerun. Do not infer a new paid generation from application startup.
- [ ] Simulate server shutdown while a unit is pending and restart with temporary storage. Mark interrupted local attempts as failed/recoverable through the existing recovery mechanism; preserve accepted siblings and original operation identity.
- [ ] Do not automatically resubmit a potentially paid remote image job after restart. If the existing provider supports resuming a stored request ID safely, resume only that job under the same idempotency key; otherwise require explicit retry and explain that remote work may have continued.
- [ ] Confirm late events from a pre-restart or cancelled task do not mutate the new task's record. Review task/controller registry cleanup and storage-root switching tests.
- [ ] Update `docs/short-reel.md` with new workflow, two publishing fields, generated style vs global mascot anchor, provider capability errors, stale-output rules and repair/regenerate distinction.
- [ ] Document rollback: stop the specific owning server, verify exact reel directory and backup checksum, preserve new v2 data separately, then restore only with user authorization. Do not ship a broad destructive rollback script.

```powershell
pnpm --filter @studio/server test -- shortReelExportV2 shortReelRestartV2 shortReelRoutesExport shortReelDrainLifecycle
pnpm --filter @studio/server test -- shortReelWriterSafety shortReelAtomicWriter shortReelPackageRepair
pnpm --filter @studio/web test -- ShortReelStudio.export
pnpm typecheck
```

## Exit gate

Export is byte-verified and revision-consistent; old reels/tasks remain recoverable; restart does not silently charge for a new generation; existing source/writer safety protections remain effective.
