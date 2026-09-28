# Centralized storage optimization

## Final execution update

All Quiz production assets and maintenance journals remain in `D:\1a Cursor Project\My 1x Youtube Channel File`. The previous C archive was hash-verified file by file, moved into `.quiz-studio/maintenance/source-frame-audit-20260926`, and removed from C. Archive creation now rejects locations outside central `.quiz-studio/maintenance/<directory>`. The older status notes below are historical and superseded by this section.

| Completed operation | Files | Bytes reclaimed |
| --- | ---: | ---: |
| Purge old archive payload | 29,529 | 13,439,889,014 |
| Remove unreferenced legacy matted PNGs | 24,830 | 13,993,937,259 |
| Remove old unreferenced narration | 1 | 77,846,834 |
| Consolidate identical media through hard links | 141 | 377,009,348 |

Hard links preserve both filenames and URLs while storing identical bytes once on D. Explorer can count both logical lengths. Source-video and mascot-asset writes now use atomic replacement so changing one alias cannot change another. Of 907 raw/processed image pairs, 905 differ and remain separate; only two are byte-identical.

The library measured 9,030,152,271 logical bytes and 14,996 files after matted/audio cleanup, before later verification journals. Original baseline was approximately 33.54 GiB and 67,509 files. Hard-link savings are additional to logical-size savings. A fresh migration dry-run found zero eligible matted frames and zero metadata changes; the unused-media scan found zero eligible files.

Implemented policies:

- Successful compact mascot jobs remove verified scratch before releasing the queue slot, after full media decoding.
- Legacy metadata migration removes only matching pinned revision frame lists. A complete reference rescan precedes deletion. First-frame thumbnails, persisted references and incomplete attempts remain intact. A retained-frame marker prevents later scratch cleanup from deleting those files.
- Narration reuses identical bytes and uses deterministic content-derived names, avoiding timestamp collisions. Masters remain uncompressed/lossless; no lossy conversion is performed.
- The exclusive startup phase automatically removes unreferenced generated narration older than seven days and verified unreferenced numbered upload duplicates. Active/recoverable non-mascot jobs defer the sweep. It runs before application writers exist, not concurrently with rendering.
- Identical raw/processed image pairs written through the repository automatically share storage. New uploads store only one canonical source.

Protected resources are intentional exceptions, not deletion candidates: 15 attempts without verification metadata; 5,502 remaining matted PNGs (3,491,084,074 bytes) covering referenced frames, first-frame thumbnails and excluded attempts; different raw/processed art; and audio referenced by current or historical documents. Retired individual frame URLs are not silently replaced with lossy decoded images. Metadata backups cannot restore deleted intermediate PNGs.

Current commands: `storage:compact-legacy`, `storage:prune-unused`, `storage:deduplicate`, and `storage:audit`. All mutation commands require an offline exclusive lease. Deduplication requires `--apply`; other commands default to dry-run. Use the configured `.quiz-studio` root. Journals remain centrally under `.quiz-studio/maintenance`.

Final verification: 145 unit/module/integration tests and 37 real-FFmpeg system tests passed. Server typecheck, build, targeted ESLint, formatting and diff checks passed. The final server successfully ran startup retention before listening. All 4,810 API HEAD checks for retained matted frames plus preview/video/manifest artifacts across 152 completed attempts returned 200, as did the dashboard and proxied mascot API. Repeated cleanup and deduplication found zero additional candidates. No paid generation was performed. Final logical directory size after consolidating all three audit reports was 9,068,227,462 bytes (8.445 GiB), 15,008 files; hard links additionally avoid counting 381,367,397 duplicate payload bytes (including pre-existing shared files). NTFS allocation/metadata overhead is not included in payload figures.

Audit reports now reside in `.quiz-studio/maintenance/audit-reports`, not the project temporary directory. The C archive path does not exist. Startup also retries verified completed-job intermediate cleanup missed because of an earlier process interruption. No timer races active media writers.

## Objective and boundaries

Keep required resources in the configured library. Reclaim actual bytes across all volumes, not by relocating assets. Preserve original production masters and assets referenced by current projects, histories, exports or recoverable jobs. Do not treat age, file extension or matching names as proof of redundancy.

## Execution plan

1. Establish lifecycle ownership and reference coverage for each asset family: mascot attempts, published variants, render scratch files, narration versions and concept originals. Classify uncertain resources as protected. Existing mascot source scratch and compact-revision scratch have explicit ownership; legacy matted references remain protected.
2. Remove proven redundancy. The new `storage:prune` command permanently removes completed attempt scratch without archival. Its archive mode removes previously archived source frames and the byte-identical duplicate source video after verifying that the centralized source and completed media remain usable. Small manifests and journals remain for accountability. It never creates a second media library.
3. Extend lifecycle cleanup. The existing owning-job callback removes successful compact mascot intermediates before releasing the queue slot. Historical failed/cancelled jobs, narration replacement and image deduplication still require feature-specific reference/retry analysis before automation. Do not install a blanket age-based sweeper.
4. Verify and execute: unit tests, full media decode, offline lease, dry-run, pilot, batch, application restart and primary workflow checks. Measure reclaimed bytes, exceptions and remaining protected resources. Completion requires reference-aware policies across all asset families, not merely a successful mascot command.

## Implemented command

```powershell
# Read-only historical intermediate plan
pnpm storage:prune --root 'D:\1a Cursor Project\My 1x Youtube Channel File\.quiz-studio'
# Read-only reference-aware plans
pnpm storage:compact-legacy --root 'D:\1a Cursor Project\My 1x Youtube Channel File\.quiz-studio'
pnpm storage:prune-unused --root 'D:\1a Cursor Project\My 1x Youtube Channel File\.quiz-studio'
```

Add `--apply` only after stopping all writers. The command checks port 4310 and acquires the same exclusive storage lease as the production server. It does not stop processes or bypass the lease. Apply fully decodes the source and packaged video, checks preview/atlas images, and rechecks candidate state. Archive files are checked against SHA-256 manifests; the duplicate source must match the centralized source. Unknown archive files, incomplete attempts, changed sources and failed media verification stop execution. Each archive gets a durable intent before removal and a completion journal afterward. Interrupted deletion can be retried; unrelated files are never recursively removed.

Deletion is permanent: direct restoration of purged source PNGs from the old archive is no longer possible. The original source video remains in the centralized library for regenerating extraction intermediates. No promise of byte-identical regeneration across different tool versions is made. Legacy matted PNGs, original art, audio masters and unclassified files are not deleted by this command.

## Historical verification before final migration

- Archive dry-run inspected 153 archives, including the duplicated pilot, with 29,376 source PNGs totaling 13,030,451,027 bytes before counting duplicate source videos.
- Live-library dry-run found no additional eligible intermediates: 152 legacy attempts remain protected and 15 attempts are excluded.
- Permanent archive cleanup completed on September 26, 2026 after the server stopped: 153 archives, 29,529 files, 13,439,889,014 bytes removed, zero failures. This includes 29,376 extracted PNGs and 153 byte-identical source-video backups. Original source videos remain centrally on D. No relocation occurred.
- A fresh dry-run reports zero remaining purge candidates in the archive. The archive contains zero PNG/MP4 files and 20,508,625 bytes of metadata/journals (1,073 files). Recovery instructions are marked superseded.
- Production server restarted with the updated code; all 608 artifact HEAD checks across 152 completed attempts returned 200. Unit/module tests (100), pinned identity tests (16), and pipeline system tests (8) passed; server typecheck and build passed.
- Subsequent migration, narration retention and exact-byte deduplication are recorded in the final execution update above. No dashboard storage UI was introduced; journals and command summaries are the operator interface.

Older archive/restore commands remain available for explicit recovery workflows; they are not the default cleanup strategy. No recurring job creates off-volume archives.
