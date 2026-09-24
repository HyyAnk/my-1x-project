# Mascot variant export

## Interaction plan

1. Step 2 offers Download Original and Download Transparent beside Audit Green Screen.
2. Opening either action fetches the current all-style Thinking/Celebrate counts and restores any active server export.
3. Choose Folder opens an in-dashboard browser for folders on the backend machine. Users can browse drives/subfolders or enter an existing absolute path. Use This Folder checks directory access and write permission before enabling Download Variants.
4. Download Variants snapshots current variant references from all styles. Empty slots are counted in the preview but not exported. Original prefers the raw source; Transparent uses the existing cache/matting pipeline.
5. The server acknowledges a background job. The dashboard polls sequentially, shows real processed/total progress, and prevents repeated submission while leaving the rest of the application usable.
6. Closing the dialog does not cancel the job. Reopening restores active status. Cancel Export stops after the in-flight image; already saved files remain. Retry Failed processes only the failed entries from the previous snapshot.
7. Connection failures retain the destination and job. Status polling reconnects with a bounded delay. Ambiguous start failures reuse the request ID. The server prevents concurrent exports of the same mascot.

## Output contract

```text
Selected Folder/
  Mascot Name/
    Style Name/
      Thinking/V001_Og.png
      Thinking/V001_Trans.png
      Celebrate/V001_Og.png
      Celebrate/V001_Trans.png
```

- Exactly three directory levels beneath the chosen destination; empty states/styles do not create empty directories.
- The number is the source slot index, padded to three digits. Original keeps its detected PNG/JPEG/WebP format and original bytes. Transparent is PNG, using the existing full-canvas pipeline.
- Names are filesystem-safe ASCII. Reserved Windows names are prefixed; conflicting style names receive a stable ID hash suffix.
- Identical existing images are skipped. Different content gets a stable content-hash suffix; existing files are never overwritten.
- Sources must be local mascot asset URLs. No remote fetching, shell execution, desktop input, AI image generation, or source-file modification occurs. Transparent cache creation is the only source-library side effect.
- Output paths cannot be inside the mascot source library. Generated output directories are checked for symlinks/junctions and real-path containment.
- Hard-link publication is atomic on supported filesystems. FAT/exFAT/network shares fall back to exclusive file creation, removing the newly created file if writing fails.

## Boundaries and state ownership

- Shared types/request validation: `packages/shared/src/mascot/variantExport.ts`.
- Export planning: deterministic style/state selection and filename mapping.
- Filesystem adapter: browsing, validation, source resolution, safe copy, collision handling.
- Export service: request idempotency, per-mascot job exclusion, progress, cancellation, retry, bounded history, structured logging.
- HTTP routes: validate and translate requests; same-origin protection for filesystem endpoints.
- UI: thin components, separate API adapter, job hook, folder-navigation hook; native modal focus containment, Escape handling and focus restoration.
- Desktop uses wrapping controls. Mobile uses touch-sized controls and a viewport-constrained scrollable dialog. No motion is required to communicate progress. The existing responsive application footer remains unchanged.

## Lifetime and limits

Jobs live in the backend process; terminal history is bounded to 100 entries and pruned after 24 hours when starting another job. Browser navigation/reconnect does not interrupt execution, but a server restart does. Restarted servers cannot resume the old job; a new export safely skips identical saved files. Cancellation waits for the current cache/matting/copy operation; it does not interrupt that operation midway.

The selected folder is on the backend computer, not necessarily the browser device. This feature assumes the existing trusted local Studio deployment, not an unauthenticated public server. Empty folders can be prepared through the operating system before selection.

## Verification

- Backend tests cover both modes, real HTTP routes and matting, all styles/states, original byte preservation, idempotency, identical/conflicting outputs, partial failure/retry, cancellation, empty data, invalid paths, source traversal, junctions, safe names and foreign origins.
- UI tests cover disabled actions, folder validation failures, pending submissions, completion, restoration/cancellation, empty data, and connection/state-ordering behavior.
- Run focused tests, shared build, server/web typechecks, scoped lint/format checks, web production build, and a live dashboard export. Audit the dialog and controls at desktop/mobile widths and verify generated files on disk.

### Verified on September 24, 2026

- `pnpm --filter @studio/shared build`: passed.
- `pnpm --filter @studio/server typecheck`: passed.
- `pnpm --filter @studio/web typecheck`: passed.
- `pnpm --filter @studio/server test variantExport mascotSourceDownloads`: 15 tests passed.
- `pnpm --filter @studio/web test useVariantExport VariantExportControls MascotActionsStep`: 23 tests passed.
- Scoped ESLint and Prettier checks: passed.
- `pnpm --filter @studio/web build`: passed, with the existing large-chunk warning for ChannelView.
- Live dashboard: Novy exported 140 Original and 140 Transparent images, with zero failures; disk inspection confirmed 280 files in 7 style folders, each with Thinking and Celebrate subfolders.
- Dialog checked at desktop and 390px mobile width, including disabled-before-selection behavior, 44px mobile buttons, Escape, keyboard focus containment/restoration, and the existing responsive footer.
- Full-repository whitespace checking reported existing issues in `mascotPromptConstants.ts` and `thumbnailTypes.ts`; touched integration files passed scoped checking. Unrelated changes were preserved.
