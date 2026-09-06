# Choice Text Fit Overflow & Sandbox Font Verification Fix Handoff Summary

## Status

- Result: completed
- Date: 2026-09-06
- Agent: antigravity
- Working mode: main-direct
- Baseline before edits: 19 dirty files from 12-layout Candy Arcade v2 implementation

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- apps/web/src/features/previewFonts/verifyPreviewFonts.ts
- apps/web/src/features/sandbox/hooks/useSandboxPreviewRenderer.ts
- apps/server/src/quiz/render/candyArcade/candyArcadeFonts.ts
- apps/server/src/quiz/render/choices/choiceTextFitScript.ts
- apps/server/test/choiceTextFit.test.ts

## Files Changed

- apps/server/src/quiz/render/choices/choiceTextFitScript.ts
- apps/server/test/choiceTextFit.test.ts

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none outside scope

## Scope

- Claimed zones: render-implementation, server-tests, coordination-handoffs
- Allowed scope used: choiceTextFitScript.ts, choiceTextFit.test.ts, and this handoff document
- Scope deviations: none

## Decisions

- Root Cause 1: CSS entrance animations on `.choice-card` use `animation-fill-mode: both` with delay `choices-at`. When the iframe loads and `candyArcadeFontReadinessScript()` runs DOM fitting, `measureElementWithin(card, group)` used `getBoundingClientRect()`, capturing the initial animation transform (`translateX(-120px)`, `translateY(28px)`, etc.) which shifted the card outside the container bounds. Furthermore, all `.choice-card` elements have `data-layout-allow-overflow` (due to hanging wood badges and multi-line expansions), but `measureElementWithin` did not respect this attribute.
  Fix: Updated `measureElementWithin` in `choiceTextFitScript.ts` to respect `data-layout-allow-overflow` on both `element` and `container`.
- Root Cause 2: In `split_versus_two`, Chromium font glyph rasterization produced subpixel coordinates where `textBounds.left` was 0.002px less than `contentLeft` (379.686px vs 379.688px). Because `textFitsHorizontally` used strict `textBounds.left >= contentLeft` with zero tolerance, it failed for all candidate font sizes down to 24px and threw `QUIZ_CHOICE_TEXT_OVERFLOW: 1 answer group could not fit`, rejecting `__fontReadyPromise` and triggering `"Video fonts could not be verified"`.
  Fix: Added `textLeftTolerance = 0.5` in `measureChoiceText` to accommodate start-of-line glyph anti-aliasing and kerning overhang while strictly maintaining right-edge boundary containment (`textBounds.right <= contentRight`).

## Verification

- Command: `pnpm --filter @studio/server test -- test/choiceTextFit.test.ts test/quizFonts.test.ts`
  Result: 27/27 tests passed (100%).
- Command: `pnpm --filter @studio/server test -- test/candyArcade.test.ts test/quizChoiceGroupRenderer.test.ts`
  Result: 54/54 tests passed (100%).
- Command: `pnpm typecheck`
  Result: 0 type errors across all workspaces.
- Command: Headless Chromium verification across all 12 layouts (16:9 and 9:16) with and without mascot
  Result: All 12 layouts resolved `__fontReadyPromise` with `state: "ready"` and `overflowGroups: 0`.

## Open Risks

- None. Both layout tests and real browser execution pass with full fidelity.

## Next Phase Input

- Files the next agent must read: `apps/server/src/quiz/render/choices/choiceTextFitScript.ts`, `apps/web/src/features/sandbox/VisualSandboxTab.tsx`
- Commands the next agent should run first: `node scripts/agent-status.mjs --json`
- Important constraints: Maintain Inviolable Anchors (Counter Badge and Brand Mark) and strict English-only codebase.
