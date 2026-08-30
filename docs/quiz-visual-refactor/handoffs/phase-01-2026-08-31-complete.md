# Phase 1 Handoff: Characterization Baseline Complete

Date: 2026-08-31

Owner: Phase 1 completion task

Supersedes: `phase-01-2026-08-31.md` (`PARTIAL`)

## Repository state

- Start and end branch: detached HEAD
- Start and end HEAD: `fd8e877677dc8ff444c3e0b70d0f5aee5f4c9e58`
- Pre-existing user changes retained:
  - `apps/server/src/quiz/visual/candyArcade.ts`
  - `apps/server/src/tasks/video/videoLayoutChecker.ts`
  - `apps/server/src/tasks/videoRunner.ts`
  - `apps/server/test/mascotStudio.test.ts`
  - `apps/server/test/videoLayoutChecker.test.ts`
  - `apps/web/src/features/sandbox/hooks/useSandboxPresets.ts`
  - `eslint-suppressions.json`
- User-authorized formatting was applied to `candyArcade.ts`, `mascotStudio.test.ts`, and `eslint-suppressions.json`. Their existing semantic changes were preserved.
- No files were staged, committed, reverted, or deleted.

## Outcome

`COMPLETE`. Every Phase 1 matrix case has passing executable evidence or a precise record-only observation. Targeted server/web suites and all workspace gates pass. There is no intentional production behavior change. Phase 2 is `READY`.

## Scope completed

- Characterized current domain choice counts, resolver behavior, renderer/catalog parity, slots, dimensions, choice paths, Answer Card registry/defaults, phases, typography, aspect ratios, mascot geometry, UI catalog, preview synchronization, reduced motion, and PW-01 through PW-06.
- Made the soundtrack BGM test fixture deterministic by explicitly selecting the track created by the fixture.
- Formatted all files reported by the workspace format gate, including the three dirty user-owned files explicitly authorized by the user.
- Reran the updated artifacts and the complete verification runbook.

## Matrix coverage

| Case IDs                                 | Evidence                                                                                                 | Result                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| D-01, D-02, D-03                         | `apps/server/test/quizV2Schema.test.ts`                                                                  | PASS                                                                     |
| D-04                                     | `apps/server/test/quizChoicePolicy.test.ts`; `apps/server/test/sandboxComposition.test.ts`               | PASS                                                                     |
| R-01, R-02, R-03, R-04                   | `apps/server/test/quizVisualContractsCharacterization.test.ts`                                           | PASS                                                                     |
| R-05                                     | Search finds no production caller of `supportsQuizLayoutChoiceCount`                                     | RECORD_ONLY; absence is a migration observation, not a durable invariant |
| L-01                                     | `apps/server/test/quizLayoutRegistry.test.ts`                                                            | PASS                                                                     |
| L-02, L-03, L-04, L-05                   | `apps/server/test/quizVisualContractsCharacterization.test.ts`                                           | PASS                                                                     |
| L-06                                     | `apps/server/src/tasks/video/imageOptimizer.ts` uses layout-string branches                              | RECORD_ONLY; capability migration is intentionally deferred              |
| C-01, C-02, C-03, C-06, C-07             | `apps/server/test/quizVisualContractsCharacterization.test.ts`                                           | PASS                                                                     |
| C-04, C-05                               | `apps/server/test/sandboxVisualCharacterization.test.ts`                                                 | PASS                                                                     |
| C-08                                     | `apps/server/test/candyArcade.test.ts`                                                                   | PASS                                                                     |
| P-01, P-02, P-03, P-04                   | `apps/server/test/sandboxVisualCharacterization.test.ts`                                                 | PASS                                                                     |
| T-01, T-02                               | `apps/server/test/quizVisualContractsCharacterization.test.ts`                                           | PASS                                                                     |
| T-03                                     | `textLayout` accepts `layoutId` but current calculations use role and mascot occupancy                   | RECORD_ONLY; later phases intentionally change layout capacity handling  |
| A-01                                     | `apps/server/test/candyArcadeVisualRegression.test.ts`                                                   | PASS                                                                     |
| A-02, B-03                               | `apps/server/test/quizVisualContractsCharacterization.test.ts`                                           | PASS                                                                     |
| M-01                                     | `apps/server/test/sandboxComposition.test.ts`; `apps/server/test/candyArcade.test.ts`                    | PASS                                                                     |
| U-01                                     | `apps/web/src/features/stageStudio/questionLayouts.test.ts`                                              | PASS                                                                     |
| U-02, U-03                               | `apps/web/src/features/episode/utils/episodePreviewQuestions.test.ts`; `useEpisodeStylePreview.test.tsx` | PASS                                                                     |
| U-04                                     | `apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.test.tsx`                                 | PASS                                                                     |
| U-05                                     | `apps/web/src/features/episode/hooks/useEpisodeStylePreview.test.tsx`                                    | PASS                                                                     |
| U-06                                     | Current selector exposes two catalog choices                                                             | RECORD_ONLY; scalable selector work is deferred to Phase 6               |
| B-01                                     | Production and Sandbox palette serialization remains duplicated and not fully aligned                    | RECORD_ONLY; convergence is deferred                                     |
| B-02                                     | Sandbox emits an extra background shape from separately assembled markup                                 | RECORD_ONLY; background unification is deferred                          |
| PW-01, PW-02, PW-03, PW-04, PW-05, PW-06 | `apps/server/test/sandboxVisualCharacterization.test.ts`                                                 | PASS                                                                     |

## Files changed

### Characterization and deterministic repair

- `apps/server/test/quizVisualContractsCharacterization.test.ts`
- `apps/server/test/sandboxVisualCharacterization.test.ts`
- `apps/server/test/soundtrackMixer.test.ts`
- `apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.test.tsx`
- `apps/web/src/features/stageStudio/questionLayouts.test.ts`

### Formatting cleanup

- `apps/server/src/quiz/render/sandboxComposition.ts`
- `apps/server/src/quiz/visual/candyArcade.ts`
- `apps/server/src/quiz/visual/elements/answerCard/variants/comicChunky.ts`
- `apps/server/src/quiz/visual/elements/thinkingBar/variants/constructionMachine.ts`
- `apps/server/test/glassMorphism.test.ts`
- `apps/server/test/mascotStudio.test.ts`
- `apps/web/src/features/episode/hooks/useEpisodeStyles.ts`
- `apps/web/src/features/mascot/hooks/useMascotLibrary.test.tsx`
- `eslint-suppressions.json`
- `packages/shared/src/enums.ts`

### Dossier

- `docs/quiz-visual-refactor/README.md`
- `docs/quiz-visual-refactor/as-is-system-map.md`
- `docs/quiz-visual-refactor/source-inventory.md`
- `docs/quiz-visual-refactor/roadmap-status.md`
- `docs/quiz-visual-refactor/verification-runbook.md`
- `docs/quiz-visual-refactor/phases/phase-01-baseline.md`
- `docs/quiz-visual-refactor/phases/phase-02-layout-capability-contract.md`
- This handoff.

## Verification

| Command                                                                                          | Result                                                       |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `pnpm --filter @studio/server exec vitest run test/quizBgm.test.ts test/soundtrackMixer.test.ts` | PASS — 14/14                                                 |
| Updated Phase 1 targeted server command                                                          | PASS — 56/56                                                 |
| Phase 1 targeted web command                                                                     | PASS — 16/16                                                 |
| `pnpm format:check`                                                                              | PASS                                                         |
| `pnpm lint`                                                                                      | PASS                                                         |
| `pnpm typecheck`                                                                                 | PASS                                                         |
| `pnpm build`                                                                                     | PASS; existing web large-chunk warning only                  |
| `pnpm test`                                                                                      | PASS — server 417/417, web 56/56, embedded choice audit PASS |
| `pnpm audit:quiz-choices`                                                                        | PASS — zero violations                                       |
| `pnpm exec prettier --check "docs/quiz-visual-refactor/**/*.md"`                                 | PASS after final dossier status edit                         |
| `git diff --check`                                                                               | PASS after final dossier status edit                         |
| Final `pnpm format:check`                                                                        | PASS — zero unformatted files                                |

## Production behavior

- Intentional production behavior changes: none.
- Production source edits in this completion task are Prettier-only.
- The soundtrack repair changes only test fixture selection: both BGM tests now explicitly request `Games_in_the_Garden`, the file they create in the temporary directory.
- Current Sandbox/production divergences remain characterized and unchanged.

## Deviations and decisions

- The earlier audio failure was a manifest-sensitive fixture problem: seed-based selection chose a real registry track not created by the test. The fix uses explicit fixture identity rather than changing production fallback behavior or relying on manifest order.
- The user explicitly authorized formatting the three dirty user-owned files. No semantic cleanup or adjacent refactor was performed while formatting them.
- No ADR changed because Phase 1 introduced no architecture or behavior decision.

## Remaining risks

- Existing web build output still warns about chunks larger than 500 kB; this is unrelated to Phase 1 and does not fail the gate.
- `.codegraph/` remains present without a usable CLI index; Phase 1 source verification used `rg` and direct inspection.
- Formatting changes touch existing source/test files but were generated mechanically and validated by lint, typecheck, build, and full tests.

## Phase 2 readiness

- READY.
- Dependency evidence: this handoff reports `COMPLETE`; all Phase 1 targeted and workspace gates pass.
- First inspection: read this handoff, reconcile the Phase 2 brief with current shared layout contracts, and preserve all unrelated working-tree changes.
