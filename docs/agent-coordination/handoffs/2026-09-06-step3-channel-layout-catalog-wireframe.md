# Step 3: Web Channel Layout Catalog & 9:16 Wireframe Popover Handoff Summary

## Status

- Result: completed
- Date: 2026-09-06
- Agent: subagent-3-channel-wireframe
- Working mode: main-direct
- Baseline before edits: 71 pre-existing dirty files preserved untouched

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-06-step2-stagestudio-layout-sync.md
- apps/web/src/features/channel/constants/layoutPreviewCatalog.ts
- apps/web/src/features/channel/components/LayoutWireframeModal.tsx
- apps/web/src/features/channel/components/TopicLayoutPreviewButton.tsx
- apps/web/src/styles/features/topics.css
- apps/web/src/features/channel/components/TopicLayoutPreviewButton.test.tsx

## Files Changed

- `apps/web/src/features/channel/constants/layoutPreviewCatalog.ts` (modified)
- `apps/web/src/features/channel/components/LayoutWireframeModal.tsx` (modified)
- `apps/web/src/features/channel/components/TopicLayoutPreviewButton.tsx` (modified)
- `apps/web/src/styles/features/topics.css` (modified)
- `apps/web/src/features/channel/components/TopicLayoutPreviewButton.test.tsx` (modified)
- `docs/agent-coordination/handoffs/2026-09-06-step3-channel-layout-catalog-wireframe.md` (new)

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none outside verified scope

## Scope

- Claimed phase: Step 3 - Web Channel Layout Catalog & 9:16 Wireframe Popover in `apps/web/src/features/channel`
- Allowed scope used: web-api-state, web-layout-style, coordination-handoffs
- Scope deviations: none

## Decisions

- Decision: Registered all 4 portrait layouts in `LAYOUT_CATALOG`:
  - `portrait_hero_choices`: "Portrait Hero Choices (860×500 Hero + Indented Choices)" with tag `tag-portrait`, button `is-portrait-hero`, icon 📱, format "Multiple Choice / Knowledge (9:16)".
  - `portrait_split_versus`: "Portrait Split Versus (Stacked 1v1 Face-off)" with tag `tag-versus`, button `is-portrait-versus`, icon ⚔️, format "Versus Face-off (9:16)".
  - `portrait_verdict_tf`: "Portrait True or False (Hero + High-Contrast Verdict)" with tag `tag-tf`, button `is-portrait-verdict`, icon ⚖️, format "True / False (9:16)".
  - `portrait_stack_list`: "Portrait Stack List (Full-Width High-Legibility Choices)" with tag `tag-stack`, button `is-portrait-stack`, icon ⚡, format "Fast Trivia / Text Quiz (9:16)".
  - Reason: Provides official metadata, badges, and layout descriptions for vertical 9:16 mobile display.
- Decision: Updated `resolveLayoutMeta(quizFormat: string, archetype?: string, layoutId?: string, aspectRatio?: "16:9" | "9:16")`:
  - Directly respects `layoutId` if found in `LAYOUT_CATALOG` unless it is a 3-image layout in 9:16 mode.
  - When `aspectRatio === "9:16"`:
    - Resolves `quizFormat === "true_false"` / `verdict_true_false` / `verdict_fact_myth` to `portrait_verdict_tf`.
    - Resolves `versus_faceoff` to `portrait_split_versus`.
    - Resolves `speed_blitz` to `portrait_stack_list`.
    - Otherwise defaults to `portrait_hero_choices`.
    - Strictly disallows 3-image layouts (`visual_choices_three` and `visual_choices_three_pure`), safely falling back to `portrait_hero_choices`.
  - When `aspectRatio !== "9:16"`, preserves existing 16:9 landscape resolution logic.
- Decision: Updated `TopicLayoutPreviewButton` to accept optional `aspectRatio?: "16:9" | "9:16"` and forward it to `resolveLayoutMeta`.
- Decision: Updated `LayoutWireframeModal`:
  - Wraps the wireframe container in `.wireframe-screen.is-portrait` when `layoutId.startsWith("portrait_")`.
  - Renders a dedicated right action rail (`wf-portrait-rail`) simulating TikTok/Reels overlay clearance with icons (❤️, 💬, ↗, 🎵).
  - Renders a dedicated bottom safe buffer bar (`wf-portrait-safe-zone`) showing "🛡️ 440px Bottom Caption Safe Zone".
  - Implemented 4 portrait layout wireframe bodies:
    - `portrait_hero_choices`: Top question box, prominent hero image box (860×500), indented choice pills, right rail clearance indicator, countdown timer, and bottom 440px safe buffer.
    - `portrait_split_versus`: Top question box, Contender A (top), central VS badge, Contender B (bottom), right rail clearance indicator, countdown timer, and bottom safe buffer.
    - `portrait_verdict_tf`: Top question prompt, central hero visual (860×540), high-contrast TRUE (Emerald) / FALSE (Rose) verdict buttons, countdown timer, and bottom safe buffer.
    - `portrait_stack_list`: Top question prompt, full-width choice pills, mascot safe anchor indicator positioned above bottom safe zone, countdown timer, and bottom safe buffer.
- Decision: Added CSS styles in `apps/web/src/styles/features/topics.css`:
  - Added `.popover-tag.tag-portrait` and `.topic-layout-badge-btn` classes for `.is-portrait-hero`, `.is-portrait-versus`, `.is-portrait-verdict`, `.is-portrait-stack`.
  - Added `.wireframe-screen.is-portrait`, `.wf-portrait-rail`, `.wf-portrait-safe-zone`, `.wf-rail-clearance-indicator`, `.wf-portrait-hero`, `.wf-mascot-safe-anchor`, `.wf-portrait-choices`, `.wf-portrait-versus-body`, and `.wf-portrait-versus-card`.
- Decision: Added comprehensive unit tests in `apps/web/src/features/channel/components/TopicLayoutPreviewButton.test.tsx`:
  - Verified resolution and wireframe popover rendering for each of the 4 portrait layouts.
  - Verified 3-image layout disallowance in 9:16 aspect ratio.

## Verification

- Command: `pnpm --filter @studio/web test -- src/features/channel/`
  - Result: 8 passed test files, 49 passed tests (100% pass)
- Command: `pnpm typecheck`
  - Result: Clean exit code 0 across `@studio/shared`, `@studio/server`, and `@studio/web`
- Command: `pnpm --filter @studio/web build`
  - Result: Vite production build succeeded with exit code 0 in 3.15s
- Command: `node scripts/agent-validate-zones.mjs --json`
  - Result: `valid: true`, 0 definition errors, 0 unmapped files, 0 overlapping files

## Open Risks

- Risk: None. Backward compatibility for landscape 16:9 is completely preserved, and all 9:16 layout resolution rules match the system-wide architecture.

## Next Phase Input

- Files the next agent must read:
  - `apps/web/src/features/channel/constants/layoutPreviewCatalog.ts`
  - `apps/web/src/features/channel/components/LayoutWireframeModal.tsx`
  - `apps/web/src/features/channel/components/TopicLayoutPreviewButton.tsx`
  - `apps/web/src/styles/features/topics.css`
- Commands the next agent should run first:
  - `node scripts/agent-status.mjs --json`
  - `pnpm --filter @studio/web test -- src/features/channel/`
- Important constraints:
  - Strict 100% English requirement across all code, tests, identifiers, and UI strings.
  - Ensure 9:16 portrait wireframe previews maintain accurate safe zone delineations (440px bottom caption buffer and right rail clearance).
