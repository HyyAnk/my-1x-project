# Phase Handoff Summary: Streamlined Production Rail on Web UI

## Executive Summary
- **Task**: Streamline the displayed Production Rail on the real Episode page (`QuizV2Panel` inside `QuizEpisodeView`).
- **Problem**: In Phase 4, `PipelineRail.tsx` was streamlined, but `QuizEpisodeView.tsx` actually mounted `QuizV2Panel.tsx`, which was still rendering 12 stages (2 rows × 6 columns), including 5 legacy documentary pre-production steps (`Research`, `Treatment`, `Script`, `Visual bible`, `Scenes`).
- **Solution**:
  1. Updated [`apps/web/src/features/episode/utils/quizRailCalculations.ts`](file:///d:/1a/Cursor/Project/My/1x/Project/apps/web/src/features/episode/utils/quizRailCalculations.ts) with `STREAMLINED_STAGES` (`quizContent`, `voiceAndAssets`, `qaGates`, `render`) and streamlined status/progress resolvers.
  2. Updated [`apps/web/src/components/QuizV2Panel.tsx`](file:///d:/1a/Cursor/Project/My/1x/Project/apps/web/src/components/QuizV2Panel.tsx) to render the 4 streamlined stages by default in single-row 4-column layout (`.quiz-v2-rail.is-streamlined`), while preserving 12-stage legacy fallback when `streamlined={false}`.
  3. Added responsive 4-column CSS in [`apps/web/src/styles/features/episodes/pipelineRail.css`](file:///d:/1a/Cursor/Project/My/1x/Project/apps/web/src/styles/features/episodes/pipelineRail.css).
  4. Added comprehensive unit tests in [`apps/web/src/components/QuizV2Panel.test.tsx`](file:///d:/1a/Cursor/Project/My/1x/Project/apps/web/src/components/QuizV2Panel.test.tsx) and updated [`apps/web/src/features/episode/utils/quizRailCalculations.test.ts`](file:///d:/1a/Cursor/Project/My/1x/Project/apps/web/src/features/episode/utils/quizRailCalculations.test.ts).

---

## Changes Made
- [`apps/web/src/features/episode/utils/quizRailCalculations.ts`](file:///d:/1a/Cursor/Project/My/1x/Project/apps/web/src/features/episode/utils/quizRailCalculations.ts):
  - Defined `StreamlinedRailStage` and `STREAMLINED_STAGES`.
  - Implemented `resolveStreamlinedStatus`, `baseStreamlinedStatus`, `latestStreamlinedChildTask`, `resolveStreamlinedProgress`, and `pipelineStreamlinedStage`.
  - Enhanced `baseStatus` to safely handle streamlined keys without indexing invalid `state.stages` properties.
- [`apps/web/src/components/QuizV2Panel.tsx`](file:///d:/1a/Cursor/Project/My/1x/Project/apps/web/src/components/QuizV2Panel.tsx):
  - Added optional `streamlined?: boolean` prop (defaults to `true`).
  - Added `.quiz-v2-rail.is-streamlined` class.
  - Dynamically switches between `currentStreamlinedStage` and `currentLegacyStage`.
- [`apps/web/src/styles/features/episodes/pipelineRail.css`](file:///d:/1a/Cursor/Project/My/1x/Project/apps/web/src/styles/features/episodes/pipelineRail.css):
  - Added CSS grid rules for `.quiz-v2-rail.is-streamlined` (4 columns desktop, 2 columns tablet, 1 column mobile).
- [`apps/web/src/components/QuizV2Panel.test.tsx`](file:///d:/1a/Cursor/Project/My/1x/Project/apps/web/src/components/QuizV2Panel.test.tsx):
  - 3 unit tests verifying 4-stage streamlined rendering, omission of legacy documentary stages, 12-stage fallback, and running task note.
- [`apps/web/src/features/episode/utils/quizRailCalculations.test.ts`](file:///d:/1a/Cursor/Project/My/1x/Project/apps/web/src/features/episode/utils/quizRailCalculations.test.ts):
  - Added unit tests for `STREAMLINED_STAGES` and its resolver functions.

---

## Verification Evidence
- `pnpm --filter @studio/web test`: All 44 test files passed (173/173 tests).
- `pnpm --filter @studio/web build`: Vite production build passed (Exit code 0, 2.96s).
- `pnpm typecheck`: Passed clean across all packages (`shared`, `server`, `web`).
- `node scripts/agent-validate-zones.mjs --json`: 0 errors, 0 unmapped files, 0 overlapping files.
- Baseline dirty files (107 files) untouched.
