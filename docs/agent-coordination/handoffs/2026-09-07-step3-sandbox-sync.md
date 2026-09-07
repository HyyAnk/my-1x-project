# Step 3: Visual Sandbox Selector Refactoring & Synchronization Handoff Summary

## Status

- Result: completed
- Date: 2026-09-07
- Agent: subagent-step3-sandbox-sync
- Working mode: main-direct
- Baseline before edits: 64 pre-existing dirty files recorded in baseline; none touched.

## Source Files Read

- AGENTS.md
- GEMINI.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-07-step1-core-layout-ssot.md
- docs/agent-coordination/handoffs/2026-09-07-step2-ui-catalog-metadata.md
- packages/shared/src/quizLayouts.catalog.ts
- packages/shared/src/quizLayouts.policy.ts
- apps/web/src/features/quizLayouts/quizLayoutUiCatalog.ts
- apps/web/src/features/sandbox/components/design/SandboxLayoutSelector.tsx
- apps/web/src/features/sandbox/VisualSandboxTab.tsx
- apps/web/src/features/sandbox/components/design/SandboxLayoutSelector.test.tsx

## Files Changed

- apps/web/src/features/sandbox/components/design/SandboxLayoutSelector.tsx: Eliminated local hardcoded layout ID arrays and local aspect-ratio mapping algorithm. Imported `QUIZ_LANDSCAPE_LAYOUT_IDS`, `QUIZ_PORTRAIT_LAYOUT_IDS`, and `getCompatibleQuizLayout` from `@studio/shared`. Imported `getQuizLayoutUiDefinitions` from `quizLayoutUiCatalog`. Re-exported backward-compatible aliases `PORTRAIT_LAYOUT_IDS`, `LANDSCAPE_LAYOUT_IDS`, and `getCompatibleLayoutForAspectRatio`. Replaced manual list filtering with `getQuizLayoutUiDefinitions(aspectRatio)`. Standardized all label and description rendering to canonical `labelKey` and `descriptionKey`.
- apps/web/src/features/sandbox/VisualSandboxTab.tsx: Replaced dependency on `SandboxLayoutSelector`'s internal layout compatibility helper with `getCompatibleQuizLayout` from `@studio/shared`. Updated `handleAspectRatioChange` and `handleApplyPresetQuestion` to call `getCompatibleQuizLayout` directly with resolved layout IDs.
- apps/web/src/features/sandbox/components/design/SandboxLayoutSelector.test.tsx: Verified and enhanced tests to cover the unified layout catalog, layout compatibility cross-mapping, aspect-ratio filtering, and baseline preview layout fallback.

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none

## Scope

- Claimed zone: `web-layout-style`
- Allowed scope used: `apps/web/src/features/sandbox/components/design/SandboxLayoutSelector.tsx`, `apps/web/src/features/sandbox/VisualSandboxTab.tsx`, `apps/web/src/features/sandbox/components/design/SandboxLayoutSelector.test.tsx`
- Scope deviations: none

## Decisions

- Decision 1 (Direct SSOT Layout Filtering): Replaced manual filtering of `QUIZ_LAYOUT_UI_DEFINITIONS` in `SandboxLayoutSelector` with `getQuizLayoutUiDefinitions(aspectRatio)` from `quizLayoutUiCatalog.ts`.
  - Reason: Centralizes layout eligibility rules and eliminates divergent array filtering in UI components.
  - Impact on later phases: Visual Sandbox now guarantees exact 1:1 synchronization with the unified catalog (8 landscape layouts for 16:9, 4 portrait layouts for 9:16).

- Decision 2 (Canonical Translation Key Alignment): Replaced references to `selectedLayout.sandboxLabelKey` and `layout.sandboxDescriptionKey` with canonical `labelKey` and `descriptionKey`.
  - Reason: Aligns Visual Sandbox UI with Stage Studio and the unified UI catalog established in Step 2.

- Decision 3 (Seamless Backward Compatibility Aliasing): Re-exported `PORTRAIT_LAYOUT_IDS`, `LANDSCAPE_LAYOUT_IDS`, and `getCompatibleLayoutForAspectRatio` from `SandboxLayoutSelector.tsx`.
  - Reason: Any existing callers or external unit tests referencing these identifiers continue to function identically with zero breaking changes, while internally delegating directly to `@studio/shared` SSOT implementations.

## Verification

- Command: `pnpm --filter @studio/web test -- src/features/sandbox/components/design/SandboxLayoutSelector.test.tsx`
  - Result: 9 tests in 1 suite passed (exit code 0).
- Command: `pnpm --filter @studio/web test -- src/features/sandbox/`
  - Result: 61 tests in 12 suites passed (exit code 0).
- Command: `pnpm --filter @studio/web test -- src/features/quizLayouts/`
  - Result: 6 tests in 1 suite passed (exit code 0).
- Command: `pnpm typecheck`
  - Result: TypeScript check across all workspace packages passed with zero errors (exit code 0).
- Command: `pnpm --filter @studio/web build`
  - Result: Vite production build completed successfully (exit code 0).

## Open Risks

- Risk: None identified. All changes are backward-compatible, strictly typed, and covered by automated unit tests.
- Suggested next action: Proceed to Step 4 of the initiative (Stage Studio Layout Selector and Episode Preview synchronization).

## Next Phase Input

- Files the next agent must read:
  - `apps/web/src/features/quizLayouts/quizLayoutUiCatalog.ts`
  - `apps/web/src/features/stageStudio/components/StageQuestionLayoutSelect.tsx`
  - `docs/agent-coordination/handoffs/2026-09-07-step3-sandbox-sync.md`
- Commands the next agent should run first:
  - `node scripts/agent-status.mjs --json`
- Important constraints:
  - Utilize `getQuizLayoutUiDefinitions` and `getCompatibleQuizLayout` from `apps/web/src/features/quizLayouts/quizLayoutUiCatalog.ts` or `@studio/shared`.
