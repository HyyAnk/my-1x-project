# Baseline Environment and Characterization Report

Recorded: 2026-09-11
Repository: My 1x Project
Task: Task 0 - Establish independent evidence and feasibility

## 1. Runtime and Tool Versions

- **OS**: Windows (win32 x64)
- **Node.js**: `v24.20.0`
- **pnpm**: `11.5.2`
- **FFmpeg**: `version 9.0-full_build-www.gyan.dev`
- **FFprobe**: `version 9.0-full_build-www.gyan.dev`
- **HyperFrames**: Local package pinned at `0.8.17` (located at `apps/server/node_modules/hyperframes/package.json`)

## 2. Git Working Tree State

Working tree contains pre-existing edits from in-progress layout unification, mascot studio, and knowledge base work. These changes are strictly preserved and untouched:
- Uncommitted modified files:
  - `apps/server/src/quiz/render/layouts/*`
  - `apps/server/src/quiz/render/candyArcade/*`
  - `apps/web/src/features/mascot/*`
  - `apps/web/src/features/questionBank/*`
  - `apps/web/src/features/sandbox/*`
  - `.quiz-studio/knowledge_base/*`
- Preserved untracked files:
  - `docs/antigravity-layout-unification/`
  - `docs/antigravity-transition-unification/`
  - `scripts/sanitizeKnowledgeEntities.js`, etc.

## 3. Production Invocation Flags and Render Configuration

Source: `apps/server/src/tasks/video/videoRenderExecution.ts`
- **Command**: `hyperframes render <renderRoot>`
- **Flags**:
  - `--output <outputPath>`
  - `--fps <fps>` (production config default 30)
  - `--quality <render_quality>` ("balanced" / "draft")
  - `--workers <workers>` (calculated via `calculateOptimalWorkers`)
  - `--gpu`
  - `--browser-gpu`
  - `--browser-timeout <browserTimeout>` (default 300s)
  - `--strict`
  - `--json`

## 4. Current Transition Routes and APIs

- `/api/intro-outro-styles` (`apps/server/src/routes/introOutroStyles.ts`):
  - Validates `transition_type` against `isValidTransition`
  - Resolves duration against `def.defaultDuration`
  - No `/api/transition-previews` routes exist prior to this implementation.

## 5. Known Baseline Characterization Failures

1. **`brush_wave` markup bug**: `candyArcadeClips.ts:286` only checks `input.visual.transitionId === "lightning_brush"`. When `brush_wave` is selected, it enters the `splash-bed` (bubble) markup branch instead of rendering brush DOM geometry (`class="brush brush-one"`).
2. **Frontend simulation divergence**: `TransitionPreviewPlayer.tsx` and `transitionOverlayRenderer.tsx` simulate transitions in React with CSS transitions and linear math over a synthetic 50% scene boundary, diverging from server HyperFrames production rendering.
3. **Preset persistence omission**: `stylePresets.ts` schemas do not store or round-trip transition configuration.
