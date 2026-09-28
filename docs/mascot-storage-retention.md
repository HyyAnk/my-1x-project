# Mascot storage retention

## Scope and rollout

1. Store new uploads once at the existing canonical source path.
2. New video/atlas revisions omit optional per-frame URLs. Published thumbnails use a durable preview URL pinned to the attempt. Legacy revisions retain their frame URLs.
3. The server cleans a successful attempt while its owning queue slot is still held, after metadata and revision persistence. It checks durable files, manifest identity, video probing and image decoding first. Failed/cancelled attempts are untouched. Cleanup failures are warnings, not processing failures.
4. Audit historical data without modifying it. Do not apply new-revision retention assumptions to legacy revisions.

## Safety boundaries

- Only enumerated `frame_NNN.png` files in an identified attempt's `frames/source` and `frames/matted` directories can be removed. No recursive directory deletion is used.
- Sources, raw artwork, narration masters, manifests, revisions, previews, atlases and transparent videos are preserved.
- Symbolic links/junctions, unexpected directory entries, identity mismatches, incomplete metadata and missing artifacts fail closed.
- Legacy matted frames remain protected when revision frame URLs exist.
- Completed jobs are not rerun by polling their synchronous completion endpoint. Retry uses the existing new-attempt workflow.
- Automatic cleanup is an owning-job operation. Historical cleanup is an explicit offline command guarded by a production-server/maintenance SQLite lease and an offline-port check. Historical audit remains read-only and is not an assertion that a job is idle.

## Historical audit

Run from the repository root:

```powershell
pnpm storage:audit --root 'D:\1a Cursor Project\My 1x Youtube Channel File\.quiz-studio'
```

Optional `--report <new-file.json>` saves the file-level inventory without overwriting an existing report. Byte totals are potential savings, not deletion approval. The command has no apply flag.

## Historical cleanup procedure

The production entry point acquires `.storage-maintenance.lock` in the configured storage root. Restart old servers before using maintenance. Stop all writers, including custom scripts and alternate entry points that do not participate in this lease. Maintenance checks localhost port 4310 by default; use `--port` for a different configured port. Never bypass a busy lock or delete its file.

Recovery-only archives must now be inside the configured `.quiz-studio/maintenance/<directory>`. Off-volume archives are disabled. Routine cleanup uses direct pruning, not archival; same-volume recovery copies do not free space. See `centralized-storage-optimization.md` for the deployed policy and final execution results.

```powershell
# Read-only plan for one exact attempt
pnpm storage:maintain --root '<absolute-library>\.quiz-studio' --attempt '<absolute-attempt-directory>'
# Copy, sync, SHA-256 verify, then remove only source frames
pnpm storage:maintain --root '<absolute-library>\.quiz-studio' --attempt '<absolute-attempt-directory>' --archive-root '<existing-archive-directory>' --apply
# Restore source frames; existing matching files are skipped, conflicts fail
pnpm storage:maintain --root '<absolute-library>\.quiz-studio' --restore '<archive-directory-from-result>' --apply
# Fresh audit and sequential batch; omit --apply for a read-only plan
pnpm storage:archive-sources --root '<absolute-library>\.quiz-studio' --archive-root '<existing-archive-directory>' --apply
```

Each archive has a manifest written before source removal, verified frame copies, copies of the original source video and attempt/revision/manifest metadata, and a completion record. Interruptions leave the archive recoverable; the restore command preflights all files and never overwrites conflicts. Batch failures stop further attempts; completed per-attempt manifests remain valid even if no batch summary was written. Rerun a fresh audit rather than trusting an old report. No command purges archives or matted frames.

Before copying, each eligible source video and transparent WebM is probed and fully decoded with FFmpeg error checking; required preview/atlas images are decoded. The candidate list and source hashes are rechecked before removal. Unknown or incomplete attempts are excluded. Copy verification and source removal are sequential with one worker.

Stop writers, back up metadata and unique sources, validate the report against current files, and verify the outputs before moving selected source frames to a recoverable archive on another volume. Verify preview, playback, publish/export and retry before deleting that archive. Moving files to quarantine on the same volume does not reclaim capacity.

Legacy matted cleanup requires a separate reference migration, including published variant thumbnails and old revision consumers. Never delete all `frames` directories by name. Video duplicates require hash verification and reference migration. Timestamped narration is not automatically orphaned.

## Follow-up work

### Legacy migration prerequisite: pinned render identity

Render localization now preserves `?attempt=N` for API, static and context-based animation references. Pinned lookups only search that attempt (including legacy `attempt_N` directories); missing files do not fall back to slot, published or newer attempt files. Localized filenames include the attempt number so two revisions cannot overwrite each other. Invalid or duplicate pins and malformed path identifiers fail closed. Unpinned references retain their legacy lookup behavior.

This prerequisite does not migrate stored revisions or authorize matted-frame removal. The existing matted protection remains enabled. Exact historical PNG delivery must have a verified lossless replacement before removal; using an off-volume archive for live delivery would make it an operational dependency, not merely a recovery backup. WebM decoding is not a byte-exact substitute. Neither archive-backed delivery nor reference migration has been deployed by this change.

This release archives eligible historical source frames, but does not purge the recovery archive, legacy matted frames, failed-job frames, audio versions, raw art or published copies. It does not impose a global disk quota. Add reference-aware historical migration and configurable failed-job retention/quota in a separate change, with recovery tests. Do not substitute lossy audio for production masters.

## Verification

Test new-source deduplication, compact/legacy plans, incomplete attempts, unreadable outputs, unexpected files, linked paths, cancellation, retained output delivery, cleanup failure isolation and repeated cleanup. Run the audit against the configured library after deploying. No browser or operating-system input automation is used.
