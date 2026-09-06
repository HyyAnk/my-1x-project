# Step 4: Server Slot Pose Generation & Outfit Continuity Lock Handoff Summary

## Status

- Result: completed
- Date: 2026-09-06
- Agent: subagent-step4-pose-lock
- Working mode: main-direct
- Baseline before edits: 112 pre-existing dirty files captured at revision `7ca4cba6ff0549a626ea41add7e7d30166d2353a`

## Source Files Read

- AGENTS.md
- GEMINI.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-06-step1-mascot-style-concept-contracts.md
- docs/agent-coordination/handoffs/2026-09-06-step2-mascot-style-concept-generator.md
- docs/agent-coordination/handoffs/2026-09-06-step3-mascot-style-concept-endpoint.md
- apps/server/src/quiz/mascotPromptContract.ts
- apps/server/src/quiz/mascot/artGenerator.ts
- apps/server/test/mascotPromptContract.test.ts
- apps/server/test/mascotSlotGeneration.test.ts

## Files Changed

- apps/server/src/quiz/mascotPromptContract.ts
- apps/server/src/quiz/mascot/artGenerator.ts
- apps/server/test/mascotPromptContract.test.ts
- apps/server/test/mascotSlotGeneration.test.ts
- docs/agent-coordination/handoffs/2026-09-06-step4-slot-pose-outfit-continuity.md

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none

## Scope

- Claimed phase: Step 4 - Server Slot Pose Generation & Outfit Continuity Lock
- Allowed scope used: apps/server/src/quiz/mascot/artGenerator.ts, apps/server/src/quiz/mascotPromptContract.ts, apps/server/test/mascotPromptContract.test.ts, apps/server/test/mascotSlotGeneration.test.ts, docs/agent-coordination/handoffs/2026-09-06-step4-slot-pose-outfit-continuity.md
- Scope deviations: none

## Decisions

- Decision: In `apps/server/src/quiz/mascotPromptContract.ts`:
  - Extended `buildMascotActionPrompt` options to support `hasStyleAnchor?: boolean;`.
  - When `options.hasReferenceImage` is true and `options.hasStyleAnchor` is true:
    - Injected continuity directive: `Strictly preserve character identity, outfit, costume details, colors, and accessories from @1 for "${mascot.name}". The character must wear the exact same costume shown in @1; only modify the pose, action, and facial expression.`
    - Omitted `costumeDirective` to avoid redundant prompt instructions because the costume is already locked into the visual anchor ground truth.
  - When `options.hasStyleAnchor` is false or omitted, preserved the existing identity continuity directive matching the master reference image and costume directive.
  - Verified `validateMascotPromptContract(prompt, true)` returns `true` for both style-anchored and legacy prompts as both satisfy the studio isolation and reference image contracts.
- Decision: In `apps/server/src/quiz/mascot/artGenerator.ts`:
  - Implemented and exported `loadMascotAssetBase64ByUrl(repository, mascotId, assetUrl, logger)` to read any asset (such as `style.anchor_image_url`) and return `data:image/png;base64,...`.
  - Refactored `loadMasterReferenceImageBase64` to delegate to `loadMascotAssetBase64ByUrl(repository, mascot.id, mascot.master_image_url, logger)`.
  - In `generateMascotStyleSlot(...)`:
    - Checks if `style.anchor_image_url` is present.
    - If present, attempts to load the style's anchor image as `referenceImageBase64` using `loadMascotAssetBase64ByUrl`.
    - If loading fails or `style.anchor_image_url` is absent, falls back to `loadMasterReferenceImageBase64`.
    - Accurately tracks `hasStyleAnchor` when the reference image originates from `style.anchor_image_url`.
    - Passes `hasStyleAnchor` into `buildMascotActionPrompt` and retains `assertMascotPromptContract`.
- Decision: In `apps/server/test/mascotPromptContract.test.ts`:
  - Added unit test verifying that `buildMascotActionPrompt` with `hasStyleAnchor: true` includes the strict outfit/costume continuity lock and does not duplicate costume directives.
  - Verified `validateMascotPromptContract` passes.
- Decision: In `apps/server/test/mascotSlotGeneration.test.ts`:
  - Added test verifying `generateMascotStyleSlot` prioritizes loading `style.anchor_image_url` when present and locks outfit continuity.
  - Added test verifying fallback to `mascot.master_image_url` when `style.anchor_image_url` is null or absent.

## Verification

- Command: `pnpm --filter @studio/server test -- test/mascotPromptContract.test.ts test/mascotSlotGeneration.test.ts`
  - Result: 34 passing tests across 2 test suites (exit code 0)
- Command: `pnpm typecheck`
  - Result: TypeScript typecheck succeeded across shared, server, and web (exit code 0)
- Command: `node scripts/agent-validate-zones.mjs --json`
  - Result: 0 unmapped files, 0 overlapping files (valid: true)

## Open Risks

- Risk: None identified in server-side slot generation.
- Suggested next action: Proceed to Step 5 / Step 6 for mascot styling and client-side UI integration.

## Next Phase Input

- Files the next agent must read:
  - `apps/server/src/quiz/mascotPromptContract.ts`
  - `apps/server/src/quiz/mascot/artGenerator.ts`
  - `apps/server/src/routes/mascots.ts`
  - `packages/shared/src/api/mascot.ts`
- Commands the next agent should run first:
  - `git status --porcelain`
  - `node scripts/agent-status.mjs --json`
- Important constraints: Strict English-only codebase and adhere to the Agent Coordination Protocol.
