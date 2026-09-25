# Animation replacement verification

## Incident

Novy (`mascot_22cb190ece7b4475`), Core Style, Thinking slot 2 retained approved attempt 2 after uploads 3 and 4 failed registration. The saved error was `EXCESSIVE_DRIFT`: 291.83px against a 180px limit. The card showed Ready without exposing the replacement failure.

The registration metric used bounding-box centers. Isolated low-alpha pixels changed bounding-box extremes between frames 186–188 while the subject remained nearly stationary. Alpha-weighted subject centroids measure a maximum drift of 3.6px across the same 192 frames. Full content bounds are preserved.

Following the user's request to simplify acceptance, movement metrics are now diagnostic only. Large displacement no longer rejects uploads, and the drift-limit option was removed. Missing frames, empty visible content, inconsistent dimensions, invalid files, and out-of-canvas bounds remain validation failures. No existing animation needs reprocessing for this policy change.

## Changes

- Measure decoded-frame movement using alpha-weighted centroids. Geometry-only callers retain the existing bounds-center fallback.
- Show a persistent replacement-failure explanation while retaining the previously approved animation. Pending replacements immediately show processing feedback.
- Pin approved video, frame, atlas, manifest, and preview requests to their attempt, including legacy revision responses. Remount media when its revision changes.
- Resolve the approved/requested attempt before legacy copies; pinned misses never fall back to another attempt. Mutable artifact delivery no longer permits stale HTTP caching, including byte-range responses.

## Live recovery and audit

Reprocessed the unchanged saved upload from attempt 4 through the normal replacement endpoint, producing approved attempt 5. Original uploads and revisions were retained. Both source files have SHA-256 `a8217d0e847a4f7b6b7d3c4d87b5614384f5160295b3bef0c9103d724e4840f9`; the approved source fingerprint matches the latest uploaded source fingerprint.

Audited both states and all 10 slots for each of Novy's seven styles:

| Style | Slots | Ready | Empty | Remaining errors |
| --- | ---: | ---: | ---: | ---: |
| Core Style | 20 | 10 | 10 | 0 |
| Cyber Neon Pulse | 20 | 0 | 20 | 0 |
| Comic Action Boom | 20 | 0 | 20 | 0 |
| Build Zone Crew | 20 | 0 | 20 | 0 |
| Cosmic Space Voyager | 20 | 0 | 20 | 0 |
| Sweet Pastel Pop | 20 | 0 | 20 | 0 |
| Treasure Quest | 20 | 0 | 20 | 0 |

Only Thinking slot 2 had a saved replacement failure. Empty slots have no uploaded animation to inspect; automated regression coverage exercises replacement handling across all 140 combinations. No other live slot was reprocessed or changed.

## Verification

- `pnpm --filter @studio/server exec vitest run test/mascotVideoAnimation --testTimeout 30000`: 66 tests passed, including an artifact-routing matrix covering all 140 combinations, retained revisions, range requests, invalid attempts, and stale legacy files.
- `pnpm --filter @studio/server exec cross-env STUDIO_TEST_SUITE=system vitest run test/mascotVideoAnimation --testTimeout 180000`: 61 tests passed, including real FFmpeg processing, replacement failure/cancellation, concurrent slots, and publishing.
- `pnpm --filter @studio/web exec vitest run src/features/mascot/animation`: 190 tests passed, including 140 replacement-feedback cases.
- Server and web `typecheck`, targeted ESLint, targeted Prettier checks, and `git diff --check` passed.
- `pnpm --filter @studio/web build` passed; Vite reported its existing large-chunk advisory.
- Live browser: observed Processing → Ready without reload; the video element loaded `?attempt=5`, reported 1280×720, and advanced playback with no media error. Verified the card at desktop and 390px mobile width; the responsive footer remains present.

Unrelated pre-existing variant-export changes were left untouched.
