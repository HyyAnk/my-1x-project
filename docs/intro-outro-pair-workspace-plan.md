# Pair workspace implementation plan

## User flow

Select a style category, manage uploaded pairs, and use the persistent New Pair card. The card has Script and Upload tabs. Script exposes Auto identity (checked on every mount), Generate Script or Regenerate, job status, and two editable copyable production prompts. Upload accepts two videos and independent mute choices. No seed picker, review gate, name input, transition settings, or transition preview is needed.

## Boundaries and contracts

1. Extend identity state with ready to distinguish automatic acceptance from human review. Cache by mascot/style with reference checksum and style revision validation. A per-style queue prevents duplicate concurrent analysis. An unchecked Auto identity requests fresh analysis for that generation only. Cancellation and stale reference checks precede saving analysis.
2. Resolve seeds after identity preparation, inside the background generation job. Existing structured revisions and single-pass generation remain the source for generated prompts. Preserve old APIs and historical data.
3. Add an optional plain-text prompt to each project draft, independent of structured content. Manual text is never falsely represented as a reviewed/generated revision. A single persistent pair-workspace project per category supports reopening and reload. Generated prompts replace only requested successful clips and only at the expected project version.
4. Extract pair creation from the route into a service. Serialize channel creation, persist per-category sequence high-water marks, and use caller-generated style IDs plus payload fingerprints for retry safety. Snapshot the editable prompts into the uploaded pair. Physically remove audio from muted clips so all existing render consumers honor the selection. Keep legacy named uploads compatible.
5. Separate frontend transport, draft autosave, generation/polling, upload state, and presentation. Reuse the existing pair cards and preview/delete behavior. Keep the global footer unchanged.

## State and recovery

- Opening a category loads or creates its workspace; Auto identity is local UI state initialized true and never persisted.
- Text changes are acknowledged immediately, backed up locally until server confirmation, and saved through a serialized debounce queue. Errors preserve input and expose Retry save. Version conflicts must not overwrite remote changes silently.
- Generate flushes pending edits, confirms replacement of manually modified text, submits one idempotent job, and shows real step labels with indeterminate progress. Existing text stays visible while pending. Regenerate selects fresh random seeds.
- Poll jobs with bounded intervals, retry transient failures, recover the latest job on reload, stop at terminal state, and refetch the project. Ignore responses from a previous category or unmounted component. Expose cancellation and clip-scoped retry for partial failure.
- Upload is independent of generation. Validate 1080p inputs, preserve selected files on failure, prevent duplicate submits, and retain the same request ID for uncertain retries. Fixed defaults are Stinger Swipe, 0.5 seconds, balanced timing. Success refreshes the pair grid and starts an empty workspace without deleting uploaded prompt snapshots.
- Desktop shows prompt boxes side by side; mobile stacks them. All actions and explanations are accessible by keyboard and touch. Respect reduced motion; no fake percentage or hover-only essential state.

## Verification

Backend: first-use auto analysis, cached reuse, explicit refresh, stale image/style, concurrent analysis, failure/cancellation, seed resolution, one-pass scripts, manual prompt persistence, partial result preservation, duplicate requests, sequence allocation, independent audio muting, upload failure cleanup, and compatibility with old revisions/uploads.

Frontend: default Auto reset on reopening, Generate/Regenerate, overwrite confirmation, copy feedback, autosave/retry, pending/error/partial states, reload/reconnect, tab switches, fixed upload defaults, independent upload, and automatic grid refresh. Run typecheck, lint, focused tests, builds, and headless desktop/mobile interaction checks against current code.

## Delivered and verified

The primary category view now uses the unified pair workspace. The older studio and named-upload components remain available to legacy consumers, but are no longer part of this view. Existing records are retained. No production dependencies were added.

- Server verification: 51 passing tests across `introOutroScriptsApi.test.ts`, `introOutroScriptDomain.test.ts`, and `introOutroStyles.test.ts`.
- UI regression verification: 27 passing tests across the existing Script Studio, batch components, upload modal, and category grid suites.
- Browser verification: 6 passing tests using `pnpm --filter @studio/web exec playwright test --config playwright.intro-outro.config.mjs`. The new workspace is exercised at 1440px and 390px, including Copy, local editing, failed autosave/retry, rejected overwrite confirmation, failed regeneration preserving text, new random seeds, Auto reset on reopen, reconnect, pending-job recovery, independent upload, uncertain upload retry, and grid refresh.
- Shared build, server build, web typecheck, scoped ESLint, formatting, and diff whitespace checks passed. Web production build was run with `node node_modules/vite/bin/vite.js build` from `apps/web`.
- Server upload tests use real FFmpeg-created videos and verify actual audio streams after muting. Browser upload tests inspect a real 1080p video with isolated API responses.

Provider calls are deterministic test doubles. No live provider credits were consumed, no existing channel assets were replaced, and actual provider creative quality/latency remain unmeasured. The global responsive footer is unchanged. Pair numbering and identity locks use the application's existing single-server filesystem storage model; they are not distributed locks across multiple server processes.
