# Phase 05: References, Cover And Export Hardening & Robustness Evidence

## Identity

- Phase: Phase 05 — References, Cover And Export (Hardening & Robustness)
- Actor: Antigravity (agent: antigravity-p05-hardening)
- Date: 2026-09-07
- Repository Root: `D:\1a Cursor Project\My 1x Project`
- HEAD: `42d2ecd79c2a3e1955499764661d05446a3baf46` (main-direct)
- Claim ID: `claim-antigravityp05hardening-mtrerkt5`
- Owned Files:
  - `apps/server/src/shortReel/referenceResolver.ts`
  - `apps/server/src/shortReel/thumbnailAdapter.ts`
  - `apps/server/src/shortReel/publishingService.ts`
  - `apps/server/src/shortReel/exportService.ts`
  - `apps/server/src/shortReel/packageService.ts`
  - `apps/server/test/shortReelPackage.test.ts`
  - `docs/short-reel-implementation/progress.md`
  - `docs/short-reel-implementation/verification/evidence/phase-05-hardening.md`
  - `docs/agent-coordination/handoffs/short-reel-phase-05-hardening.md`

## Audit Findings & Hardening Applied

1. **WebP MIME Consistency in PKZIP Export (`exportService.ts`):**
   - Implemented `mimeToExtension` supporting `image/jpeg` (`.jpg`), `image/png` (`.png`), and `image/webp` (`.webp`).
   - Exported WebP references are now packaged with canonical `.webp` filenames matching their binary headers.
   - Added test validating WebP reference inclusion in ZIP archive.

2. **Duplicate Entry Name Detection in Archive Assembly (`exportService.ts`):**
   - Enhanced `assertSafeArchiveEntryName` with entry tracking set (`seenEntries: Set<string>`).
   - If a duplicate entry name is encountered, throws typed `ExportError("DUPLICATE_ENTRY", ...)`.
   - Added test validating duplicate entry rejection in `shortReelPackage.test.ts`.

3. **Stale Unit Rejection Semantics (`exportService.ts`):**
   - When any deliverable unit (`references`, `script`, `cover`, `publishing`) is in `stale` state, export throws `ExportError("STALE_EXPORT", ...)`.
   - Added test `rejects export with STALE_EXPORT when a deliverable unit is marked stale`.

4. **Complete Source Snapshot Enforcement (`exportService.ts`):**
   - Added `requireCompleteShortReelSource(record.source)` to ensure exports never proceed on corrupt or incomplete source questions.

5. **Publishing Disclaimer in Archive (`exportService.ts`):**
   - Added explicit notice to `publishing.txt`: `"NOTE: Hashtags are suggestions only; no reach or viral performance is guaranteed."` per spec SR-10.

6. **SVG Typography Word-Wrapping in Fallback Cover (`thumbnailAdapter.ts`):**
   - Implemented `wrapSvgText` breaking long titles, hooks, and questions into wrapped `<tspan>` rows.
   - Prevents horizontal text clipping and box overflow when questions have 100+ characters.
   - Added test `renders fallback cover with long title, hook, and question without clipping or error`.

7. **ImageProvider Path Safety & Atomic Writing (`thumbnailAdapter.ts`):**
   - Added `repository.assertRealPathInside(repository.storageRoot, sourceFile)` before reading external image provider files.
   - Replaced raw `writeFile` with `repository.writeBinaryAtomic` for cover image raster output.

8. **URL Protocol Scheme Hardening & Atomic Writing (`referenceResolver.ts`):**
   - Hardened `assertSafePath` to reject all URI protocol schemes (`/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i` and `data:`).
   - Replaced raw `writeFile` with `repository.writeBinaryAtomic` for cached reference assets.

9. **Robust LLM Publishing JSON Parser (`publishingService.ts`):**
   - Implemented `normalizePublishingCandidate` to extract required fields, strip unexpected extra keys, and handle comma-separated string hashtags before Zod validation.
   - Added test `parses LLM output with extra fields and comma-separated hashtags successfully`.

10. **Typed Package Service Errors & Script Acceptance Guard (`packageService.ts`):**
    - Defined `PackageServiceError` with codes `SUPERSEDED_OPERATION`, `STALE_DEPENDENCY`, `VALIDATION_FAILED`, and `ATTEMPT_FAILED`.
    - Added verification on `acceptReelUnitResult` for script in `generateFullReelPackage`, throwing `PackageServiceError("VALIDATION_FAILED")` when an invalid script is supplied.
    - Added test `throws PackageServiceError when generateFullReelPackage is called with an invalid script`.

## Test Execution Results

- `test/shortReelPackage.test.ts`: 21/21 passed (expanded from 14 to 21 tests)
- `test/thumbnailService.test.ts`: 9/9 passed
- `test/thumbnailPromptEngine.test.ts`: 21/21 passed
- Full Short-Reel Server Suite (`shortReel`): 130/130 passed across 18 test files
- Monorepo Typecheck (`pnpm typecheck`): Passed with 0 errors across `@studio/shared`, `@studio/server`, `@studio/web`
- Zone Validation (`scripts/agent-validate-zones.mjs`): Valid with 0 unmapped and 0 overlapping files
