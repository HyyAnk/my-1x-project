# Acceptance and Verification

## Required evidence

The numeric proposal is not visual acceptance. The implementation must pass observable browser checks and actual renderer checks, not only string snapshots or static type checks.

| Gate            | Pass condition                                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Fixed anchors   | All five roles use the shared shell; matching wrappers differ by at most 1 canvas px across the eight layouts                                 |
| Preserved sizes | Default counter 250 x 194, Question Card 1420 x 168, channel width 320 and existing intrinsic fit; selected skin's component sizing preserved |
| Timer delta     | Reference y=822 -> y=882, width=1240, outer height=84; center-y=924                                                                           |
| Fact geometry   | x=470, y=846, w=1240, h=156 in every explain phase and input length                                                                           |
| Arena           | Nominal rectangles match JSON within 1 px; painted media/card content does not reach below y=780 when footer is visible                       |
| Visibility      | Existing semantic timing retained; timer/fact do not visibly overlap; hidden phases do not reserve or shift layout flow                       |
| Text            | Complete question/answer/fact text fits; no accidental clip/ellipsis; answer/fact minimum 32 px; no new decorative copy                       |
| Hero            | Correct source, no stretch, no identifying details covered by answer cards, consistent registration across Mystery layers                     |
| State           | All correct-answer indices produce the correct result; Clue/Mystery transitions preserve gameplay semantics                                   |
| Parity          | Production, sandbox snapshot, and sandbox rehearsal share anchors at equivalent phase-local times                                             |
| Preview refresh | Newest selection wins; no stale response overwrites; error/retry preserves input; no F5                                                       |
| Compatibility   | baseline and portrait/Short Reel behavior preserved; no changed IDs, choice counts, media requirements, schema, audio, or activation          |

## Measurement method

1. Wait for fonts, all essential images, and deterministic text fitting. A readiness failure is a failed test, not a reason to screenshot fallback output and approve it.
2. Measure stable `data-quiz-fixed` wrappers; measure their actual visible child artwork separately at matching timeline times. Wrapper invariance alone cannot detect a child shifted by an old margin/transform.
3. Normalize viewport coordinates into canvas units using the actual stage scale and origin:

```ts
const scale = stageRect.width / 1920;
const actual = {
  x: (elementRect.x - stageRect.x) / scale,
  y: (elementRect.y - stageRect.y) / scale,
  width: elementRect.width / scale,
  height: elementRect.height / scale,
};
for (const key of ["x", "y", "width", "height"] as const) {
  expect(Math.abs(actual[key] - expected[key])).toBeLessThanOrEqual(1);
}
```

4. Treat anchor geometry and paint geometry separately: box shadows, strokes, pseudo-elements, rotating/scaling markers and badges are not fully represented by one parent `getBoundingClientRect()`.
5. Test at the actual event boundaries and one frame before/after: choices start, timer start, timer end, reveal start, explanation start, clip end. Use the fixture's real timestamps, not assumed universal durations.
6. Sample timer start/end and at least 30 interior points, including max pulse and exit. Repeat at 30 and 60 fps. Confirm no marker clipping at either endpoint or the bottom.
7. Reverse seek from explain to thinking to question, then replay. The same local time must reproduce the same geometry and state, including on a non-first clip with a nonzero global start.
8. For configured mascot collisions, compare actual painted mascot bounds, not only its 220 px wrapper. Preserve placement settings and report the conflict. Do not silently use a convenient default to pass QA.

## Test matrix

Mandatory base coverage: eight layouts x five phases x three surfaces = 120 role/state observations. Use valid question/count combinations for each layout; no need to render a separate video for every observation.

Additional targeted coverage:

- Every supported answer count from JSON; zero/one modes only where currently supported.
- Every correct index for each count; same outcomes before and after migration.
- Every built-in counter, question, answer, and thinking skin on every layout's relevant visible phase. Use a parameterized sweep; test pairwise skin combinations and all skins active in the target episode. Do not silently change selected skin IDs.
- Mascot absent/default-left/right/large/custom-offset; brand absent/short/long; same geometry for identical content with mascot off and on.
- A short question, a two-line question, and a near-limit valid question; do not reduce the reference card's size.
- Short answer, two-line answer, long unbroken word, maximum schema-valid answer. Overflow must be reported, not clipped or shrunk below the contract.
- Short fact, two-line fact, three-line fact, and deliberately oversized fact. Verify exact code `QUIZ_FACT_TEXT_OVERFLOW`, question identity, preserved input, stopped ready state, and successful recovery after shortening.
- Square, portrait, landscape, and transparent-subject images. Use existing approved local media; no paid generation or external sourcing is required.
- Light/dark existing palettes and reward effects: preserve legible text and prevent decoration masking identifying details.
- Preview at 1920 x 1080 and 960 x 540; phone landscape around 844 x 475 for actual readability. At a 390 px-wide embedded preview, check proportional scaling, no clipping/reflow, and usable surrounding controls; do not claim full-frame 32 px video text is comfortably readable as a tiny thumbnail.
- Rapid layout/style/phase switches, old response finishing last, slow fonts/images, failed response, retry, unmount/remount, and reconnect where the current preview transport supports it.

## Existing tests to retain and extend

- `apps/server/test/candyArcadeLayout.test.ts`
- `apps/server/test/candyArcadeStyles.test.ts`
- `apps/server/test/candyArcadeComposition.test.ts`
- `apps/server/test/quizLayoutRegistry.test.ts`
- `apps/server/test/quizAllLayoutsEndToEnd.test.ts`
- `apps/server/test/quizLayoutCapabilities.test.ts`
- `apps/server/test/quizLayoutsPortrait.test.ts`
- `apps/server/test/quizLayoutAssetAspectRatioE2E.test.ts`
- `apps/server/test/quizScenePipeline.test.ts`
- `apps/server/test/quizPreviewProductionStyleParity.test.ts`
- `apps/server/test/choiceTextFit.test.ts`
- `apps/server/test/thinkingBarVariants.test.ts`
- `apps/server/test/channelBrandMark.test.ts`
- `apps/server/test/quizMysteryReveal.test.ts`
- `apps/server/test/quizClueDeduction.test.ts`
- `apps/server/test/mascotPreviewParity.test.ts`
- `apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.test.tsx`
- `apps/web/src/features/episode/hooks/useEpisodeStylePreview.test.tsx`

Some current tests assert old CSS literals or old snapshots. Replace obsolete assertions with the new approved geometry, but preserve behavior/correctness/compatibility assertions. An intentional pixel difference is not automatically an approved improvement.

## Commands

Run from the repository root. First run the narrow new tests from each task, then:

```powershell
pnpm --filter @studio/shared build
pnpm --filter @studio/server exec vitest run test/quizFrameGeometry.test.ts test/quizFrameMarkup.test.ts test/quizLayoutContentGeometry.test.ts test/factTextFit.test.ts
pnpm --filter @studio/server exec vitest run test/quizFrameAnchors.browser.test.ts test/quizLayoutContent.browser.test.ts test/factTextFit.browser.test.ts
pnpm --filter @studio/server exec vitest run test/quizLayoutRegistry.test.ts test/quizAllLayoutsEndToEnd.test.ts test/quizLayoutsPortrait.test.ts test/quizScenePipeline.test.ts test/quizPreviewProductionStyleParity.test.ts test/choiceTextFit.test.ts test/thinkingBarVariants.test.ts test/channelBrandMark.test.ts test/quizMysteryReveal.test.ts test/quizClueDeduction.test.ts
pnpm --filter @studio/web exec vitest run src/features/sandbox/hooks/useSandboxPreviewRenderer.test.tsx src/features/episode/hooks/useEpisodeStylePreview.test.tsx
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm test:visual
```

Apply Prettier only to changed source files before the checks, using explicit paths. Do not run the repository-wide writing formatter over unrelated user changes. Record pre-existing unrelated failures separately instead of changing those files to make a broad command green.

Use `getHyperframesInvocation` in `apps/server/src/tasks/video/videoInvocation.ts` and the existing installed/pinned runtime for production checks and diagnostic snapshots. Read the project's current CLI help/skill before invoking version-specific flags. Do not upgrade HyperFrames or infer success from a fast-mode skipped check. Inspect `videoLayoutChecker.ts` to confirm an actual check ran against the new source fingerprint.

After build, restart only the affected project process, preferably through the established workflow. Verify its health and obtain an updated preview through the real UI. Do not kill unrelated Node processes. Check the rebuilt composition contains the new geometry and the browser is not showing a cached old preview.

## Baseline approval and delivery

1. Generate after-captures into a separate QA directory and show them beside preserved before-captures. Include thinking and explain, not only reveal.
2. Inspect all eight with representative real local content. Owner approval is required before replacing committed visual baselines.
3. After approval, run `pnpm test:visual:update`, review changed PNGs, then run `pnpm test:visual` with update mode disabled. Do not increase the pixel-diff threshold or use skip flags to pass.
4. Provide local diagnostic video duration/resolution/frame-rate metadata and confirm it contains the intended phases. A screenshot-only check does not certify a moving video.
5. Report commands actually run, measured results, remaining limitations, and exact modified files. No claim that an unrun test passed.
