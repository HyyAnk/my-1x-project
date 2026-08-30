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

Phase 6 and Phase 7 must rebuild/restart affected processes and use the running application for browser verification. A successful unit test or static build alone is insufficient.

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
