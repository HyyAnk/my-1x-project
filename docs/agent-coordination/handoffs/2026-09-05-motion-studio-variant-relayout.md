# Motion Studio Re-Layout With Thinking/Celebrate Variants Handoff Summary

## Status

- Result: completed
- Date: 2026-09-05
- Agent: zcode
- Working mode: main-direct
- Baseline before edits: 66 dirty files captured via `git status --porcelain` and recorded in the claim baseline (`claim-zcode-mtolu6bj`, base revision `21adee6`).

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md (zone map via `.agent-orchestrator/zones.yml`)
- docs/agent-coordination/handoffs/2026-09-05-mascot-concurrent-batch-stream-progress.md
- packages/shared/src/schemas/mascot.ts (style/variant contract)
- apps/web/src/features/mascot/** (motion studio, styles studio, sandbox variant picker)

## Files Changed

- `apps/web/src/features/mascot/utils/motionVariantPreview.ts` (new): pure helpers `isVariantAction`, `collectFilledVariants`, `resolveSelectedVariant`, `getActionVariants`, `applyVariantPreviewOverrides`.
- `apps/web/src/features/mascot/utils/motionVariantPreview.test.ts` (new): 11 unit tests.
- `apps/web/src/features/mascot/hooks/useMascotMotionStudio.ts`: added `previewStyleId`/`setPreviewStyleId` (preview-only style override), variant-index normalization effect, per-variant motion buffer seeding, filled-variant slot targeting in `handleSaveMotion` (raw list with empty slots replaced by filled list + clamped index), local mascot update after `updateMascotSlot`; `effectiveMascot` now delegates to the shared util.
- `apps/web/src/features/mascot/hooks/useMascotMotionStudio.test.tsx`: added per-variant slot save test and preview style override test.
- `apps/web/src/features/mascot/components/MascotVariantPanel.tsx` (new): right-pane variant card with style selector, thumbnail grid, motion badges, available counter, empty state.
- `apps/web/src/features/mascot/components/MascotVariantPanel.test.tsx` (new): 5 component tests.
- `apps/web/src/features/mascot/components/MascotAnimationStep.tsx`: re-layout; receives `effectiveMascot` from the hook (duplicated memo removed), composes `MascotVariantPanel` + `MascotMotionControls` in the right pane, compact Style/Slot indicator above the canvas, variant count badges passed to the canvas.
- `apps/web/src/features/mascot/components/MascotMotionControls.tsx`: "Editing: Slot N / Base Pose" target badge in header; ready count moved into the subtitle.
- `apps/web/src/features/mascot/components/MascotAnimationCanvas.tsx`: optional `variantCounts` prop; count badge on thinking/celebrate quick pose buttons.
- `apps/web/src/features/mascot/MascotGeneratorTab.tsx`: wires the full motion-studio variant state into step 3; removed unused destructured generator fields (pre-existing lint errors).
- `apps/web/src/features/mascot/constants.ts`: removed unused `BRAND_IDENTITY_ACTIONS`/`AUXILIARY_ACTIONS` (`CORE_GAMEPLAY_ACTIONS` kept; still used by `useMascotBatchGenerator`).
- `apps/web/src/components/MascotStudio.tsx`: removed dead re-exports of the removed constants.
- `apps/web/src/styles/features/mascot/calibration.css`: added `.motion-left-pane`, `.motion-right-pane`, `.motion-style-indicator`, `.motion-style-select`, `.motion-variant-*`, `.pose-variant-count` styles.
- `apps/web/src/i18n/locales/en/mascots.ts`: added variant panel keys (`variantPanelTitle`, `variantPanelSub`, `variantsAvailableCount`, `variantStyleLabel`, `variantDefaultStyleSuffix`, `variantEmptyHint`, `editingSlotBadge`, `editingBaseBadge`, `motionReadyCount`).
- Deleted dead code: `apps/web/src/features/mascot/components/ActionCard.tsx`, `ActionsSidebar.tsx`, `ActionPromptModal.tsx` (verified no importers).

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: only files already dirty from the in-progress mascot styles work (`MascotAnimationStep.tsx`, `useMascotMotionStudio.ts` + test, `MascotGeneratorTab.tsx`, `constants.ts`, `calibration.css`) plus `MascotStudio.tsx` (clean at baseline) — all covered by the claim after one `agent-expand`.

## Scope

- Claimed phase: claim-zcode-mtolu6bj, zones `web-api-state` + `web-layout-style`
- Allowed scope used: mascot motion studio UI/state, shared preview util, styles/i18n, dead code removal
- Scope deviations: none (server/shared contracts untouched; `updateMascotSlot` API already supported per-variant motion)

## Decisions

- Decision: style switcher in step 3 is a local preview-only state (`previewStyleId`), it does not call `setActiveMascotStyle`.
- Reason: avoids server writes and profile mutation from a preview surface; the persisted active style remains controlled by step 2.
- Impact on later phases: if a "set as active style" action is wanted in step 3, add an explicit button calling the existing endpoint.

- Decision: motion preset/speed/intensity buffers stay action-level; selecting a variant loads that variant's saved motion into the buffer, and Save persists to the selected filled slot first (`updateMascotSlot`) then keeps the action-level record in sync (`calibrateMascotAction`).
- Reason: matches the existing calibration contract while honoring per-variant motion fields; minimal churn to the presets hook.
- Impact on later phases: variant-level editing is the source of truth for thinking/celebrate in this step.

- Decision: kept `CORE_GAMEPLAY_ACTIONS`.
- Reason: still used by `useMascotBatchGenerator` for thinking/celebrate batch generation.

## Verification

- Command: `pnpm --filter @studio/web test`
- Result: 290 tests passed (62 files), including 16 new/updated mascot motion tests
- Command: `pnpm typecheck` / `pnpm --filter @studio/web build`
- Result: server + web typecheck clean; web build succeeded
- Command: eslint + prettier on all claimed files
- Result: 0 errors, formatting clean (verified via `agent-verify-claim` evidence, then released)

## Open Risks

- Risk: variant thumbnails load 48px previews of full 1024px PNGs (`loading="lazy"` mitigates initial cost).
- Suggested next action: if generation volume grows, serve pre-sized thumbnails from the render pipeline.

## Next Phase Input

- Files the next agent must read: `apps/web/src/features/mascot/hooks/useMascotMotionStudio.ts`, `apps/web/src/features/mascot/utils/motionVariantPreview.ts`, `apps/web/src/features/mascot/components/MascotVariantPanel.tsx`
- Commands the next agent should run first: `pnpm --filter @studio/web test -- src/features/mascot`
- Important constraints: thinking/celebrate variants are the only slot states in the contract (`packages/shared/src/schemas/mascot.ts`); do not add new states without extending `MascotStyleSchema` first.
