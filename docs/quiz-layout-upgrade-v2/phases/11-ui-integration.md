# Phase 11: Dashboard, preview and requirements synchronization

Status: not started

## Objective

Expose the upgraded behavior consistently through every authoring entry point.

Requirements: R09, R12, R14.

## Dependencies and required reading

Phase 10 gate passed; read its evidence before editing.

- [specs/MYSTERY-CONTRACT.md](../specs/MYSTERY-CONTRACT.md)
- [specs/IMAGE-GENERATION.md](../specs/IMAGE-GENERATION.md)
- [VERIFICATION.md](../VERIFICATION.md)

## Concrete implementation steps

1. Create a concise interaction plan before UI edits: layout selection, answer edit, preview compile, font readiness, success/failure/retry and timeline seek transitions.

2. Mystery editor shows one Answer field with correct index fixed to 0 and no choice-count/add/remove/correct-choice selector. Keep fact text editable for narration, labelled accordingly.

3. On an explicit layout switch into Mystery, select the current correct answer before projecting to one answer. Preserve the previous multi-choice draft for a reversible switch; reject malformed persisted payloads rather than silently converting them.

4. Derive image requirement ratio/resolution/fit from shared geometry and sizing policy, not catalog constants. Display Mystery contain and one image; Full Stack shows no image request.

5. Update wireframes/miniatures, channel layout metadata, bank live preview and episode preview mapping so none depict or submit 2/3 Mystery answers.

6. Use shared timing for preview phase jumps and audio cues. Maintain latest-request guards across API response, font verification and iframe commit.

7. Give immediate pending feedback, retain last successful preview on error, preserve inputs and offer retry. Rapid A->B->C layout changes must not show late A output.

8. Audit visible copy and controls at desktop 1440px, tablet 768px and mobile 390px. Keep titles punctuation-free, controls grouped, labels concise and explanations keyboard/touch accessible.

9. Preserve the existing responsive application footer and 16:9 preview scaling. Do not redesign the shell or enable portrait generation.

10. Test success, slow response, empty/invalid input, API error, font error, retry, unmount/cancellation and stale response order.

## File ownership

- `apps/web/src/features/sandbox/hooks/useSandboxLayoutSync.ts` (existing)
- `apps/web/src/features/sandbox/hooks/useSandboxQuestionState.ts` (existing)
- `apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.ts` (existing)
- `apps/web/src/features/sandbox/hooks/useSandboxTimelineState.ts` (existing)
- `apps/web/src/features/sandbox/hooks/useSandboxTimelineHelpers.ts` (existing)
- `apps/web/src/features/sandbox/hooks/useSandboxAudioCues.ts` (existing)
- `apps/web/src/features/sandbox/components/content/SandboxChoicesEditor.tsx` (existing)
- `apps/web/src/features/sandbox/components/content/SandboxQuestionInputs.tsx` (existing)
- `apps/web/src/features/sandbox/components/design/sandboxLayoutRequirements.ts` (existing)
- `apps/web/src/features/sandbox/components/design/SandboxImageRequirements.tsx` (existing)
- `apps/web/src/features/sandbox/components/preview/SandboxGuidesOverlay.tsx` (existing)
- `apps/web/src/features/quizLayouts/quizLayoutUiCatalog.ts` (existing)
- `apps/web/src/features/quizLayouts/components/QuizLayoutWireframe.tsx` (existing)
- `apps/web/src/features/channel/constants/layoutPreviewCatalog.ts` (existing)
- `apps/web/src/features/episode/services/buildEpisodePreviewRequest.ts` (existing)
- `apps/web/src/features/episode/utils/episodePreviewQuestions.ts` (existing)
- `apps/web/src/features/questionBank/components/QuestionBankChoicesEditor.tsx` (existing)
- `apps/web/src/features/questionBank/utils/questionBankFormBuilder.ts` (existing)
- `apps/web/src/features/questionBank/utils/questionBankFormValidation.ts` (existing)
- `apps/web/src/styles/features/mascot/stageStudio/layoutMiniature.css` (existing)

This is the phase's primary ownership set. Shared integration points in FILE-MAP.md may require small changes; register any newly discovered files before editing. Do not touch unrelated files merely because they appear in the overall inventory.

## Verification and acceptance

- [ ] Every UI/API preview entry point submits a valid one-answer Mystery payload.
- [ ] Displayed image ratio, size and fit match the source contract without refresh.
- [ ] No stale completion overwrites the latest selection; loaders always settle.
- [ ] Keyboard/touch editing and mobile scrolling work with the updated controls.
- [ ] Relevant formatter, type checks and narrow tests run with commands/results captured.
- [ ] Updated primary workflow rerun; screenshots/logs point to the current build.
- [ ] Diff reviewed for scope, responsibility boundaries and preserved user changes.

## Exit gate

The freshly running dashboard reflects server state and new geometry automatically, with recoverable errors.

## Deliverables

Focused UI/hook changes and async interaction tests, evidence/phase-11.md.

## Recovery and handoff

If a check fails, preserve inputs and evidence, isolate the defect at its owning boundary and rerun. Do not globally revert the worktree, weaken expected geometry, or mark a skipped check as passed. Document blockers and the exact resume step in PROGRESS.md. Use the phase report template and keep all implementation artifacts in English.
