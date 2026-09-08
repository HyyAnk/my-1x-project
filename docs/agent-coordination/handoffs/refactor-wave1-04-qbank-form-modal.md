# Wave 1 Batch 4: QuestionBankFormModal Split Handoff Summary

## Status

- Result: completed
- Date: 2026-09-08
- Agent: refactor-wave1-04-qbank-form-modal
- Working mode: main-direct
- Claim: claim-refactorwave104qbankformmodal-mtsw9fxm
- Baseline before edits: `git status --porcelain > /tmp/baseline-wave1-04.txt` (135 dirty entries, baseRevision feaf77a5aa591116fa0f23320943fb1c5da3447c)

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/templates/phase-handoff-summary.md
- apps/web/src/features/questionBank/components/QuestionBankFormModal.tsx (original, 366 lines)
- apps/web/src/features/questionBank/QuestionBankView.tsx (sole consumer)
- apps/web/src/features/questionBank/questionBankUi.test.tsx, questionBankClearUi.test.tsx (no modal-internal references)
- packages/shared/src/schemas/questionBank.ts (BankQuestion / BankChoice / BankTaxonomy contracts)
- apps/web/src/i18n/locales/en/questionBank.ts (translation keys)

## Files Changed

- apps/web/src/features/questionBank/components/QuestionBankFormModal.tsx (modified, 366 -> 222 lines; lean composition modal)
- apps/web/src/features/questionBank/components/QuestionBankChoicesEditor.tsx (created, 62 lines)
- apps/web/src/features/questionBank/components/QuestionBankMetaFields.tsx (created, 76 lines)
- apps/web/src/features/questionBank/utils/questionBankFormValidation.ts (created, 19 lines)
- apps/web/src/features/questionBank/utils/questionBankFormBuilder.ts (created, 62 lines)
- docs/agent-coordination/handoffs/refactor-wave1-04-qbank-form-modal.md (this file)

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes (/tmp/baseline-wave1-04.txt)
- Pre-existing dirty files touched: none. Note: several concurrent agents (thumbnail, shortReel, server bridge work) modified/created files during my window; all are outside my planned files and were not touched. My diff-vs-baseline contains exactly my 5 claimed code files plus this handoff.

## Scope

- Claimed phase: Wave 1 batch 4 - split QuestionBankFormModal god component
- Allowed scope used: web-layout-style, web-api-state, coordination-handoffs (see Deviations)
- Scope deviations: the briefing's claim command omitted coordination-handoffs from --write, and the claim was rejected because the handoff file path belongs to zone coordination-handoffs; re-ran the claim with coordination-handoffs added. All other planned files/zones identical to the briefing.

## Decisions

- Decision: QuestionBankChoicesEditor and QuestionBankMetaFields are stateless presentational components receiving props (choices state + handlers, field values + setters) and the translator `t` as a prop, matching the original internal signature and repo sibling style.
- Reason: AGENTS.md requires stateless presentation components; props drilling is acceptable per the wave brief; passing `t` avoids context coupling in leaf components.
- Decision: `validateQuestionForm` and `buildBankQuestion` moved verbatim to apps/web/src/features/questionBank/utils/ (questionBankFormValidation.ts exports `QuestionBankTranslator` type alias for the `(path: string) => string` translator). The pure choice helpers `appendNextChoice` / `removeChoiceItem` moved to questionBankFormBuilder.ts alongside the builder.
- Reason: utils must hold pure, testable helpers; the builder + choice transforms are cohesive in one module; no new types added to the pre-existing dirty types/questionBankUi.types.ts.
- Decision: QuestionBankFormState (local interface, formerly inferred) now declared explicitly in the modal file, exported types avoided in dirty shared type files.
- Decision: QuestionBankMetaFields renders the classification fields the form actually has: archetype select, domain select (from taxonomy), and subtopic input. Difficulty, thinking seconds, and age band are resolved as fixed initial values in resolveInitialFormState and have no UI controls in the current form; they are passed to buildBankQuestion unchanged, so rendered output is byte-identical to before.
- Reason: mission said "adapt to what the form actually has" and "the modal should render identically".
- Impact on later phases: feature utils now expose pure buildBankQuestion/appendNextChoice/removeChoiceItem/validateQuestionForm, ready for direct unit testing in a later wave if desired.

## Verification

- Command: `pnpm --filter @studio/web test -- src/features/questionBank` -> 69 files / 330 tests passed (the pnpm filter ran the full suite; additionally ran targeted `npx vitest run src/features/questionBank`: 3 files / 22 tests passed)
- Command: `pnpm --filter @studio/web test` -> covered by the same run above: 69/69 files, 330/330 tests passed
- Command: `pnpm --filter @studio/web typecheck` -> tsc --noEmit, exit 0, no errors
- Command: `node scripts/check-format.mjs` -> FAILED but pre-existing and out of scope: apps/server/src/quiz/thumbnail/thumbnailManifestStore.ts has a syntax error (file concurrently created by another agent in the server zone, not in my baseline). Targeted `npx prettier --check` on all 5 of my files: "All matched files use Prettier code style!"
- Command: `git status --porcelain` vs /tmp/baseline-wave1-04.txt -> only my 5 claimed code files plus concurrent agents' unrelated changes (thumbnail, shortReel, server bridge) appeared; I only touched claimed files
- Notes: QuestionBankFormModalProps interface unchanged: { initialQuestion?: BankQuestion | null; taxonomy: BankTaxonomy | null; onSave: (q: BankQuestion) => Promise<void>; onClose: () => void }. Sole consumer QuestionBankView.tsx was not modified.

## Open Risks

- Risk: The form modal has no direct unit test, so the split is verified via typecheck, full-suite integration (QuestionBankView lazy-load test) and behavior-preserving code review rather than component-level assertions.
- Suggested next action: a later wave may add a small vitest suite for the modal (open/add choices, validation errors, save payload) and for buildBankQuestion/appendNextChoice/removeChoiceItem.
- Risk: check-format.mjs currently fails workspace-wide due to the thumbnailManifestStore.ts syntax error introduced by a concurrent agent; this blocks clean formatting gates until that agent fixes it.
- Suggested next action: the owning agent of apps/server/src/quiz/thumbnail/* should fix the syntax error and rerun check-format.mjs.

## Next Phase Input

- Files the next agent must read:
  - apps/web/src/features/questionBank/components/QuestionBankFormModal.tsx (composition + local form state)
  - apps/web/src/features/questionBank/components/QuestionBankChoicesEditor.tsx
  - apps/web/src/features/questionBank/components/QuestionBankMetaFields.tsx
  - apps/web/src/features/questionBank/utils/questionBankFormValidation.ts
  - apps/web/src/features/questionBank/utils/questionBankFormBuilder.ts
- Commands the next agent should run first:
  - `node scripts/agent-status.mjs --json`
  - `npx vitest run src/features/questionBank` (from apps/web)
- Important constraints:
  - apps/web/src/features/questionBank/hooks/*, types/questionBankUi.types.ts, and utils/questionBankMilestones.* were pre-existing dirty and remain untouched; do not include them in a claim that assumes they are clean.
  - The form intentionally renders identical DOM to the pre-split version; any visual redesign is out of scope for wave 1.
