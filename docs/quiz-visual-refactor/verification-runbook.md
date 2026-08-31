# Quiz Visual Refactor Verification Runbook

This runbook defines evidence expected from every implementation phase. Phase briefs may add narrower commands but may not omit applicable checks without recording why.

## Before editing

Run:

    git branch --show-current
    git rev-parse --short HEAD
    git status --short

If .codegraph exists, explore the active symbols before grep or direct reads. Confirm that the active phase brief still matches current code. Preserve all unrelated changes.

## Phase 1 targeted server suite

    pnpm --filter @studio/server exec vitest run test/quizLayoutRegistry.test.ts test/sandboxComposition.test.ts test/quizVisualContractsCharacterization.test.ts test/sandboxVisualCharacterization.test.ts test/candyArcadeVisualRegression.test.ts test/candyArcade.test.ts

## Phase 1 targeted web suite

    pnpm --filter @studio/web exec vitest run src/features/stageStudio/questionLayouts.test.ts src/features/episode/utils/episodePreviewQuestions.test.ts src/features/sandbox/hooks/useSandboxDesignState.test.ts src/features/sandbox/hooks/useSandboxPreviewRenderer.test.tsx src/features/episode/hooks/useEpisodeStylePreview.test.tsx

## Workspace gates

Run after targeted tests pass:

    pnpm format:check
    pnpm lint
    pnpm typecheck
    pnpm build
    pnpm test
    pnpm audit:quiz-choices
    pnpm exec prettier --check "docs/quiz-visual-refactor/**/*.md"

The root test command already runs the shared build, server tests, web tests, and the choice-count audit. Record each explicit command because failures can occur at different gates.

## Phase 2–7 targeted verification

Each future phase must derive focused commands from the files it actually changes and record them in its handoff. At minimum, run the narrowest shared/server/web suites that own every required matrix case before the full workspace gates.

| Phase | Additional workflow evidence                                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 2     | Compatible and incompatible resolution, Director/QA issue, Sandbox validation, optimizer metrics, both existing production layouts         |
| 3     | Matching Sandbox/production scene states, both choice presentations, missing asset, both aspects, mascot on/off                            |
| 4     | Every skin with text and visual content, missing media, both layouts/aspects, reveal state, production and Sandbox                         |
| 5     | Resolver precedence, palette parity, CSS ownership/deduplication, pairwise layouts/skins/phases/aspects/mascot                             |
| 6     | Both new layouts in production/Sandbox, browser success/slow/error/retry/rapid-change, keyboard, desktop/mobile, visible-copy/footer audit |
| 7     | Both backgrounds in production/Sandbox, determinism, reduced motion, performance, browser async/retry/rapid-change, desktop/mobile         |

## Phase 2 targeted suites

Shared policy and server consumers:

    pnpm --filter @studio/shared build
    pnpm --filter @studio/server exec vitest run test/quizLayoutCapabilities.test.ts test/quizLayoutPreviewRoute.test.ts test/quizLayoutRegistry.test.ts test/sandboxComposition.test.ts test/quizVisualContractsCharacterization.test.ts test/sandboxVisualCharacterization.test.ts test/candyArcadeVisualRegression.test.ts test/candyArcade.test.ts test/imageOptimizer.test.ts test/quizDomain.test.ts

Web metadata, Episode Preview, and Sandbox lifecycle:

    pnpm --filter @studio/web exec vitest run src/features/stageStudio/questionLayouts.test.ts src/features/episode/utils/episodePreviewQuestions.test.ts src/features/sandbox/hooks/useSandboxDesignState.test.ts src/features/sandbox/hooks/useSandboxPreviewRenderer.test.tsx src/features/episode/hooks/useEpisodeStylePreview.test.tsx

The first suite must include structured auto/explicit results, every incompatibility reason, Director/QA mapping, optimizer metrics, the compatible/incompatible Sandbox API path, and production composition with both existing layouts. The web suite must retain latest-request-wins and visible preview-error behavior.

## Phase 3 targeted suites

Shared model, state adapters, both public composition entries, and retained Phase 1–2 server contracts:

    pnpm --filter @studio/shared build
    pnpm --filter @studio/server exec vitest run test/quizSceneModel.test.ts test/quizScenePipeline.test.ts test/quizLayoutCapabilities.test.ts test/quizLayoutPreviewRoute.test.ts test/quizLayoutRegistry.test.ts test/sandboxComposition.test.ts test/quizVisualContractsCharacterization.test.ts test/sandboxVisualCharacterization.test.ts test/candyArcadeVisualRegression.test.ts test/candyArcade.test.ts test/imageOptimizer.test.ts test/quizDomain.test.ts

Retained web metadata and latest-preview-wins lifecycle:

    pnpm --filter @studio/web exec vitest run src/features/stageStudio/questionLayouts.test.ts src/features/episode/utils/episodePreviewQuestions.test.ts src/features/sandbox/hooks/useSandboxDesignState.test.ts src/features/sandbox/hooks/useSandboxPreviewRenderer.test.tsx src/features/episode/hooks/useEpisodeStylePreview.test.tsx

The server suite must prove normalized identity/order/answer/assets, accepted-layout consumption, both state adapters and scrub boundaries, shared stable parts, text/visual public-entry parity, reveal identity, both aspects, escaping, missing-media determinism, retained production reward timing, four-choice rejection, and unchanged style defaults.

## Phase 4 targeted suites

Semantic renderer, all skins, unified layout slots, both public surfaces, and retained Phase 1–3 server contracts:

    pnpm --filter @studio/shared build
    pnpm --filter @studio/server exec vitest run test/quizChoiceGroupRenderer.test.ts test/quizSceneModel.test.ts test/quizScenePipeline.test.ts test/quizLayoutCapabilities.test.ts test/quizLayoutPreviewRoute.test.ts test/quizLayoutRegistry.test.ts test/sandboxComposition.test.ts test/quizVisualContractsCharacterization.test.ts test/sandboxVisualCharacterization.test.ts test/candyArcadeVisualRegression.test.ts test/candyArcade.test.ts test/imageOptimizer.test.ts test/quizDomain.test.ts

Retained web layout, Episode Preview, and latest-preview-wins lifecycle:

    pnpm --filter @studio/web exec vitest run src/features/stageStudio/questionLayouts.test.ts src/features/episode/utils/episodePreviewQuestions.test.ts src/features/sandbox/hooks/useSandboxDesignState.test.ts src/features/sandbox/hooks/useSandboxPreviewRenderer.test.tsx src/features/episode/hooks/useEpisodeStylePreview.test.tsx

The server suite must cover every Phase 4 matrix ID: canonical ordering and correctness, every phase, escaping, tiers, missing-media fallback, all skins with text and visual content, default resolution, one `choicesHtml` contract, baseline and both production layouts, matching production/Sandbox reveal output, two/three-choice support, four-choice rejection, and reduced motion. Review the artifacts in `artifacts/phase-04/` for the pairwise 16:9/9:16 skin, phase, mascot, production/Sandbox, reveal, and fallback evidence; do not update visual evidence without inspecting the rendered output.

Phase 6 and Phase 7 must rebuild/restart affected processes and use the running application for browser verification. A successful unit test or static build alone is insufficient.

## Phase 8 stabilization verification

Phase 8 uses the shared cases in `phases/phase-08-test-matrix.md` and retains all prior-phase regressions.

| Subphase | Additional required evidence                                                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 8B       | Real production-chain style propagation, full precedence/legacy matrix, transition palette, Channel round-trip, Episode inheritance/invalidation, preview/production resolved-style parity |
| 8C       | Canonical background semantics, selected-only CSS, inspected artifact matrix, running browser desktop/mobile/keyboard/touch/async states, critical Playwright workflow                     |
| 8D       | Caller-proven adapter cleanup, canonical derived dimensions, cohesion review, retained 8B/8C evidence, complete dossier and repository closure                                             |

In addition to focused suites and the workspace gates, every Phase 8 subphase must run:

    pnpm test:e2e
    pnpm audit:quiz-choices
    pnpm exec prettier --check "docs/quiz-visual-refactor/**/*.md"
    git diff --check

Phase 8D must also run:

    node scripts/analyze_structure.mjs

Phase 8D catalog/cleanup and retained-boundary suites:

    pnpm --filter @studio/shared build
    pnpm --filter @studio/server exec vitest run test/quizLayoutRegistry.test.ts test/quizLayoutCapabilities.test.ts test/quizPhase06NewLayoutsAndScalableUi.test.ts test/quizVisualContractsCharacterization.test.ts test/quizBackgroundRegistry.test.ts test/quizPhase08cParity.test.ts
    pnpm --filter @studio/server exec vitest run test/quizRenderStyleContract.test.ts test/quizStylePersistence.test.ts test/quizPreviewProductionStyleParity.test.ts test/videoRunnerStyleBoundary.test.ts test/videoRunner.test.ts test/quizRepository.test.ts test/quizLayoutPreviewRoute.test.ts test/quizPhase05BoundariesAndResolution.test.ts test/quizV2Schema.test.ts test/channelBrandMark.test.ts test/quizPhase08cParity.test.ts test/quizBackgroundRegistry.test.ts test/sandboxComposition.test.ts
    pnpm --filter @studio/web exec vitest run src/features/sandbox/hooks/useSandboxPreviewRenderer.test.tsx src/features/sandbox/hooks/useSandboxChannelSync.test.tsx src/features/sandbox/components/design/SandboxBackgroundSelector.test.tsx src/features/sandbox/components/design/SandboxLayoutSelector.test.tsx src/components/AppViewRouter.test.tsx

Post-cleanup production/Sandbox artifact and running-browser workflows:

    pnpm exec tsx apps/server/scripts/generatePhase08cArtifacts.ts
    pnpm --filter @studio/web exec playwright test test/quizPhase08c.spec.ts --workers=1

The artifact command must report 16/16 inspections and refresh `artifacts/phase-08c/manifest.json` with Phase 8D revalidation metadata. Open representative landscape/portrait and production/Sandbox outputs after the automated geometry checks; do not infer the visual result from the manifest alone.

Phase 8C and any UI-affecting Phase 8D cleanup must rebuild/restart the running application and verify the primary Sandbox and production-render workflows. Browser/render artifacts must be inspected; HTML/CSS string assertions alone cannot satisfy `VERIFY_VISUAL` cases.

## Workflow verification

Phase 1 changes tests and documentation, not production behavior. Its updated artifacts are the baseline tests, fixtures, snapshots, and evidence manifest. Rerun them after every edit.

If Phase 1 unexpectedly changes production or web source, stop and re-evaluate scope before proceeding. Such a change also requires:

- restarting the affected server or web process;
- opening the Sandbox preview in the running app;
- exercising both production layouts at desktop and mobile widths;
- verifying pending, success, error, retry, and latest-request-wins behavior where async preview code changed;
- rendering or generating the production composition path affected by the change.

## Baseline evidence requirements

Record at minimum:

| Evidence            | Required content                                |
| ------------------- | ----------------------------------------------- |
| Repository baseline | Branch, HEAD, and pre-existing dirty paths      |
| Test inventory      | Existing tests extended and new tests added     |
| Matrix coverage     | Case IDs from phase-01-test-matrix.md           |
| Commands            | Exact command and exit result                   |
| Output artifacts    | Snapshot/fixture paths or structural assertions |
| Deviations          | Differences from the brief and why              |
| Unverified items    | Reason, risk, and next action                   |

## Failure handling

- Do not update snapshots blindly. Inspect the semantic difference first.
- Do not weaken existing assertions merely to make a baseline pass.
- If current behavior is nondeterministic, isolate the source or record a blocker; do not normalize arbitrary output.
- If an existing test conflicts with current production behavior, capture both pieces of evidence and resolve the conflict before adding a new expectation.
- Never allow an older async preview response to overwrite a newer selected state.

## Completion review

Before handoff, review the diff for:

- accidental production changes;
- assertions tied to irrelevant whitespace or implementation trivia;
- duplicated fixtures;
- missing failure or unsupported cases;
- stale paths in this dossier;
- modifications to unrelated user-owned files.
