# Mascot Animation Upgrade Plan

Status: implementation plan only

The current authoritative plan is [REVISED_VIDEO_PIPELINE_PLAN.md](REVISED_VIDEO_PIPELINE_PLAN.md). The earlier sprite-gen stage briefs in this folder are historical reference only and must not be executed as the implementation plan.

This folder is the execution contract for upgrading mascot animation generation from one still image plus CSS motion to curated sprite-row animations.

## Confirmed decisions

- Keep the existing mascot concept and style-anchor workflows.
- Keep exactly two semantic states: thinking and celebrate.
- Create ten animation variants per state for every existing style.
- Every variant has exactly twelve frames at eight frames per second.
- Use the sprite-gen Codex image-row pipeline only. Do not use Grok video-to-loop.
- Generate rows from the style anchor and a stable state/slot recipe.
- Do not silently fall back to CSS motion or a still when an animation is missing or fails QA.
- Select variants deterministically per video and question.
- Preview and production consume the same persisted animation contract.
- Do not publish a style until all twenty required slots are valid.

## Feasibility gate

The upstream sprite-gen documentation describes twelve-frame rows as an explicit experiment, with higher risk of duplicate, sparse, merged, or extraction-failed frames. Twelve frames remains the product requirement, but a pilot gate happens before processing every style. A failed pilot blocks rollout; it must not be hidden by reducing frame count or restoring the old motion path.

## Reading order

Read 01 through 09, then 10 through 18 in order. Antigravity must complete one numbered stage, run that stage checks, and record evidence before the next stage.

The individually dispatchable stage briefs are in [stages](stages/README.md). The parent stage map is [09-stages.md](09-stages.md).

## Source boundaries

Current implementation seams include packages/shared/src/schemas/mascot.ts, packages/shared/src/mascot/renderTypes.ts, renderSchema.ts, renderResolver.ts, renderMotion.ts, apps/server/src/quiz/mascot/artGenerator.ts, apps/server/src/quiz/render/mascotHtmlRenderer.ts, productionMascotRenderer.ts, productionMascotTimeline.ts, and apps/web/src/features/mascot.
