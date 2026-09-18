# Verification runbook

## What planning verification proves

Run node docs/quiz-layout-upgrade-v2/scripts/validate-plan.mjs after any plan change. It checks internal plan consistency only. It is not a substitute for the commands and runtime evidence below.

## Implementation test layers

1. Pure unit: shared geometry, ratios, safe bounds, answer-mode validation and timer-hide/reveal math.
2. Contract: schemas, bank conversion, scene serialization, asset/voice/timeline payloads and provider requests.
3. Render: stable IDs, decoration variants, no forbidden badges/fact markup.
4. Browser geometry: real border/content boxes after fonts load, with transforms disabled only for settled measurements.
5. Temporal browser: animations enabled, before/at/after boundaries, peak envelopes and backward seek.
6. UI interaction: asynchronous compile and font readiness, errors, retries and responsive editing.
7. End-to-end: newly running app plus production composition/check/render path.

Keep geometry and temporal assertions separate. A test that disables all animation cannot prove the 0.5-second gap or peak collision safety.

## Exact commands from repository root

Use the repository's installed pnpm/Node and existing package names. Record full output and exit status.

```powershell
node docs/quiz-layout-upgrade-v2/scripts/validate-plan.mjs
pnpm --filter @studio/shared build
pnpm --filter @studio/shared exec node --import tsx --test test/quizImageSizing.test.ts test/quizLayouts.catalog.test.ts test/quizLayouts.policy.test.ts test/timing.test.ts
pnpm --filter @studio/server exec vitest run test/quizFrameGeometry.test.ts test/quizLayoutContentGeometry.test.ts test/quizChoiceGroupRenderer.test.ts test/choiceTextFit.test.ts test/answerCardSkinStyles.test.ts --testTimeout 60000
pnpm --filter @studio/server exec vitest run test/questionBankSchema.test.ts test/quizV2Schema.test.ts test/batchPromptOutputParser.test.ts test/quizPacing.test.ts test/sandboxComposition.test.ts --testTimeout 60000
pnpm --filter @studio/server exec vitest run test/quizFrameAnchors.browser.test.ts test/quizLayoutContent.browser.test.ts test/quizImageSlotSizing.browser.test.ts --testTimeout 60000
pnpm --filter @studio/server exec vitest run test/quizImageSizingProviderContract.test.ts test/quizImageSizingProductionParity.test.ts test/quizLayoutAssetAspectRatioE2E.test.ts --testTimeout 60000
pnpm --filter @studio/web exec vitest run src/features/sandbox/hooks/useSandboxPreviewRenderer.test.tsx src/features/sandbox/components/design/SandboxImageRequirements.test.tsx src/features/quizLayouts/components/QuizLayoutWireframe.test.tsx
```

After the new tests are created:

```powershell
pnpm --filter @studio/server exec vitest run test/quizMysterySingleReveal.test.ts test/quizLayoutUpgrade.browser.test.ts --testTimeout 60000
pnpm --filter @studio/web exec vitest run src/features/sandbox/hooks/useSandboxLayoutSync.test.ts
```

Final gates:

```powershell
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm audit
pnpm check:ratchet
pnpm build
pnpm test:visual
```

Run format checks on newly touched files even if a repository baseline excludes them. Do not update format/lint baselines or suppressions to hide new violations.

pnpm audit runs the project's read-only quiz audits, not a package security audit. Do not run the choice audit with --fix. Old experimental-data failures are reported separately; this upgrade does not authorize rewriting channels.

## Visual baselines

- Capture before/after frames and inspect every layout.
- Update only intentional changes with pnpm test:visual:update.
- Rerun pnpm test:visual with UPDATE_VISUAL_SNAPSHOTS unset.
- Do not set SKIP_VISUAL_REGRESSION=1 for acceptance.
- The old helper uses a fixed capture time and a three-choice Mystery fixture. Update it to use the new contract and appropriate per-phase times; otherwise it can pass a frame that does not exercise the reveal.

## Fixture matrix

Use synthetic English content and local deterministic assets. No production data writes.

Core matrix: seven layouts x question/thinking/reveal/explain x mascot off/on = 56 scene states. Mystery additionally exercises the blank gap. Run all registered answer skins on representative detached, text-only and image-badge layouts; cover all timer styles on Mystery boundaries.

Counts:

- Media Left: 2 and 3.
- Visual Card/Pure Visual: 3.
- Split Versus/Verdict: 2.
- Full Stack: 2 and 3.
- Mystery: 1 valid; 0/2/3 invalid.

Content:

- Short: Saturn.
- Two-line stress: The Great Barrier Reef in Australia.
- Overflow: a deliberately excessive answer long enough to exceed the minimum font.
- Escaping: Ampersands & angle brackets <test>.
- Image subjects: wide object, tall subject, centrally placed object; transparent and opaque source canvases.

Do not assert every maximum-schema-length answer must fit a fixed surface. Assert unfit input is surfaced as an error, not rendered truncated.

## Mystery timing capture

For each timer variant, use known timerHideAt=T and revealStart=R=T+0.5.

Capture T-1/fps, T, T+0.25, R-1/fps, R, R+0.1, R+0.85, and a midpoint of fact narration. At least 30fps and 60fps; test quantization math separately for fractional/odd fps.

Assert timer opacity/visibility and child glow/markers, answer visibility, masked/revealed layers, event ordering and voice segment starts. Count raw pixel evidence as well as DOM styles where reveal clipping is involved.

Seek R+1 -> T+0.25 -> before countdown -> R again. The second reveal must match the first; no CSS class or image registration drift.

## Fresh runtime verification

1. Finish builds; restart affected server/web processes using normal project scripts. Never kill unrelated processes.
2. Use pnpm dev or the existing launcher if that is the normal workflow; discover active URLs from output/config.
3. Use browser-protocol automation (headless Playwright/CDP) or the approved browser tool. No OS-level input or focus takeover.
4. Open Sandbox; select every layout and verify image requirements and preview.
5. Enter a single Mystery answer; preview question, gap, reveal and explanation. Check that fact text is retained for audio but not drawn.
6. Exercise bank creation -> conversion -> episode preview using isolated test data; verify source/scene/voice/asset plans.
7. Rapidly switch layouts during slow mocked preview requests. Verify latest state wins without F5.
8. Check 1440px, 768px and 390px application widths and keyboard/touch paths. Canvas remains 16:9.
9. Generate a local production composition using the normal renderer and fixture assets; validate it with the project's getHyperframesInvocation wrapper.
10. Require fastRenderMode=false, no FAST_RENDER_MODE bypass, and nonzero inspected samples. A "skipped_fast_mode" checkpoint is not acceptance evidence.
11. Follow the applicable HyperFrames skill's preview/render approval rules. If encoding requires approval, show the inspected preview and mark the render gate awaiting approval.
12. When permitted, render a local verification video, inspect decoded frames/audio and metadata. Record exact command, runtime version, source fingerprint, duration and result.

Do not upgrade unrelated dependencies to make this work. If applicable tooling instructions require a version check/update, record the reason and version, revalidate output, and do not leave an unverified bump.

## Evidence and pass criteria

Use data/acceptance-cases.json as the requirement-to-evidence matrix. Each row receives a real result, test/log path and screenshot/video path when applicable.

- Settled rectangle tolerance <=0.5 CSS px.
- Pixel rounding <=1px where unavoidable.
- Logical Mystery gap exactly0.5s within0.001s.
- Frame sampling must never show early reveal; quantization tolerance <=1 output frame.
- Crop measurements align with spec at scale1; any additional motion crop stays within critical-detail safe regions.
- No new missing assets/fonts, console errors, stale state, hidden overflow or unsynchronized consumers.
- Every primary updated workflow has been run after the final build/restart.

A blocked live-provider call, missing browser dependency, unavailable render approval or unrun final workflow must be identified explicitly. Do not mark phase12 complete based only on unit tests.
