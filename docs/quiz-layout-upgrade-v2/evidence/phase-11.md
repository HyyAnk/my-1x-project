# Phase 11 Evidence: Dashboard, Preview and Requirements Synchronization

## 1. Overview
- **Phase**: 11
- **Status**: Completed
- **Requirements Addressed**: R09, R12, R14
- **Primary Objective**: Expose upgraded layout geometry, single-answer mystery authoring, reversible layout switching, image requirement display, and wireframe miniatures across all client-side entry points.

---

## 2. Implementation Summary

### 2.1 Dynamic Layout Image Requirements (`apps/web/src/features/sandbox/components/design/sandboxLayoutRequirements.ts`)
- Replaced hardcoded catalog metrics with direct calls to `@studio/shared` canonical sizing pipeline (`getQuizImageSlotGeometry` + `recommendImageSizing`).
- Correctly returns:
  - **Full Stack List**: 0 image requirements (`[]`).
  - **Mystery Reveal**: 1 hero image requirement (`16:9`, `1408x792`, `fit: "contain"`).
  - **Media Left**: 1 hero image requirement (`4:3`, `1120x840`, `fit: "cover"`).
  - **Visual Cards Three**: 1 choice image requirement (`1:1`, `648x648`, `fit: "cover"`).
  - **Visual Cards Three Pure**: 1 choice image requirement (`3:4`, `648x864`, `fit: "cover"`).
  - **Split Versus Two**: 1 choice image requirement (`16:9`, `1152x648`, `fit: "cover"`).
  - **Verdict**: 1 hero image requirement (`4:3`, `1216x912`, `fit: "cover"`).

### 2.2 Reversible Layout Switching & Draft Preservation (`apps/web/src/features/sandbox/hooks/useSandboxLayoutSync.ts`)
- Added `cachedDraftChoicesRef` to preserve the user's multi-choice draft when switching into `mystery_reveal`.
- When switching into Mystery:
  - Selected choice is projected to the active correct answer (or first choice) with `correctChoiceIndex = 0`.
- When switching back to a multi-choice layout (e.g. `media_left_choices_right`):
  - Automatically restores the previous 3-choice draft and original `correctChoiceIndex`.

### 2.3 Single-Answer Mystery in Question Bank & Editors
- **QuestionBankChoicesEditor** (`apps/web/src/features/questionBank/components/QuestionBankChoicesEditor.tsx`):
  - When `archetypeId === "mystery_reveal"`, renders exactly 1 editable "Reveal Answer" field with a permanent correct badge; disables and hides choice-count, add-choice, and remove-choice buttons.
- **QuestionBankFormModal** (`apps/web/src/features/questionBank/components/QuestionBankFormModal.tsx`):
  - Automatically projects choices to a single answer when selecting `mystery_reveal`.
  - Passes `archetypeId` to validation and editor.
- **QuestionBankFormValidation** (`apps/web/src/features/questionBank/utils/questionBankFormValidation.ts`):
  - Validates that mystery questions have exactly 1 non-empty reveal choice; rejects questions with 0 or >1 choices.
- **SandboxQuestionInputs** (`apps/web/src/features/sandbox/components/content/SandboxQuestionInputs.tsx`):
  - Dynamically re-labels Fact Card section to "Narration / Clue Fact" when `layoutId === "mystery_reveal"`.

### 2.4 Preview Request Payload Protection & Wireframes
- **Preview Renderer** (`apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.ts`):
  - Normalizes `choices` and `correct_choice_index` in `SandboxPreviewRequest` for `mystery_reveal` so transient multi-choice state never leaks into backend preview requests.
  - Maintains `latestRequestId.current` guarding all asynchronous boundaries (API fetch, font verification, iframe commit) to discard stale completion responses on rapid layout switching.
- **Episode Preview Builders** (`apps/web/src/features/episode/services/buildEpisodePreviewRequest.ts`, `episodePreviewQuestions.ts`):
  - Ensures episode preview requests for mystery archetype questions strictly submit 1 choice and 0 correct index.
  - Generates topic template preview question with 1 choice and `layoutId: "mystery_reveal"` for mystery episodes.
- **Wireframes & Miniatures** (`apps/web/src/features/quizLayouts/components/QuizLayoutWireframe.tsx`, `quizLayoutUiCatalog.ts`, `layoutMiniature.css`):
  - Extended wireframe preview types with `"mystery-reveal"`, `"split-versus"`, and `"verdict"`.
  - Conditioned wireframe choice elements to render only `choice-a` for mystery, `choice-a` & `choice-b` for versus/verdict, and all 3 choices for standard layouts.
  - Added CSS rules for `.is-mystery-reveal`, `.is-split-versus`, and `.is-verdict` in `layoutMiniature.css`.

---

## 3. Automated Verification & Test Results

### 3.1 Unit Test Suite (`apps/web/src/features/sandbox/uiIntegrationPhase11.test.ts`)
- **18/18 tests passing**:
  - Image requirements: full_stack_list = 0 items, mystery_reveal = 1 item (16:9, contain), media_left = 1 item (4:3, cover), visual_choices_three = 1 item (1:1, cover), visual_choices_three_pure = 1 item (3:4, cover), split_versus_two = 1 item (16:9, cover), verdict = 1 item (4:3, cover).
  - Episode preview request single-answer mystery projection.
  - Standard 3-choice preservation for media_left layout.
  - Question Bank validation: rejects multi-choice mystery, rejects empty mystery answer, accepts valid single choice, enforces min 2 choices for standard questions.
  - Topic template preview question builds single choice for mystery episode.
  - Reversible multi-choice draft preservation via `useSandboxLayoutSync`.
  - UI catalog definition accuracy for preview classifications.

```
 PASS src/features/sandbox/uiIntegrationPhase11.test.ts (18 tests) 3314ms
 Test Files  1 passed (1)
      Tests  18 passed (18)
```

### 3.2 Web Suite Regression
- `buildEpisodePreviewRequest.test.ts`, `episodePreviewQuestions.test.ts`, `uiIntegrationPhase11.test.ts`: **32/32 tests passing**.
- Web typecheck (`pnpm --filter @studio/web typecheck`): **0 errors**.
- Server typecheck (`pnpm --filter @studio/server typecheck`): **0 errors**.

---

## 4. Exit Gate Confirmation
- [x] Every UI/API preview entry point submits a valid one-answer Mystery payload.
- [x] Displayed image ratio, size and fit match the source contract without refresh.
- [x] No stale completion overwrites the latest selection; loaders always settle.
- [x] Keyboard/touch editing and mobile scrolling work with the updated controls.
- [x] Relevant formatter, type checks and narrow tests run with commands/results captured.
- [x] Diff reviewed for scope, responsibility boundaries and preserved user changes.
