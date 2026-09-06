# Step 2: Server Style Concept Generator & Prompt Contract Handoff Summary

## Status

- Result: completed
- Date: 2026-09-06
- Agent: subagent-step2-generator
- Working mode: main-direct
- Baseline before edits: 103 pre-existing dirty files captured at revision `7ca4cba6ff0549a626ea41add7e7d30166d2353a`

## Source Files Read

- AGENTS.md
- GEMINI.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/phase-roadmap.md
- docs/agent-coordination/handoffs/2026-09-06-step1-mascot-style-concept-contracts.md
- apps/server/src/quiz/mascotPromptContract.ts
- apps/server/src/quiz/mascot/artGenerator.ts
- apps/server/src/repository/mascots.ts
- apps/server/test/mascotPromptContract.test.ts
- apps/server/test/mascotSlotGeneration.test.ts

## Files Changed

- apps/server/src/quiz/mascotPromptContract.ts
- apps/server/src/quiz/mascot/artGenerator.ts
- apps/server/test/mascotPromptContract.test.ts
- apps/server/test/mascotStyleConcept.test.ts
- docs/agent-coordination/handoffs/2026-09-06-step2-mascot-style-concept-generator.md

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none

## Scope

- Claimed phase: Step 2 - Server Style Concept Generator & Prompt Contract
- Allowed scope used: apps/server/src/quiz/mascotPromptContract.ts, apps/server/src/quiz/mascot/artGenerator.ts, apps/server/test/**, docs/agent-coordination/handoffs/**
- Scope deviations: none

## Decisions

- Decision: Implemented and exported `buildMascotStyleConceptPrompt(mascot, style, overridePrompt)` in `apps/server/src/quiz/mascotPromptContract.ts`.
  - Incorporates `@1` reference in character identity continuity directive: `Strictly preserve character identity from @1 for "${mascot.name}": face, fur/skin tone, eye shape, and chibi 1:2 head-to-body proportions matching the master reference image.`
  - Incorporates costume directive: `Theme & Costume: Styled in authentic ${style.keyword || style.name} attire, costume, and accessories.`
  - Incorporates full-body standing concept pose: `Full-body single character concept illustration of "${mascot.name}" dressed in ${style.name} style. Single centered subject standing proudly facing camera, cute chibi proportions (1:2 head-to-body), large expressive sparkling eyes, friendly and joyful expression.` with optional `overridePrompt` injected into pose details.
  - Appends `MASCOT_STUDIO_ISOLATION_TAGS` and strict no-turnaround / no-spritesheet constraints, satisfying `validateMascotPromptContract(prompt, true)`.
- Decision: Implemented and exported `generateMascotStyleConcept(repository, mascot, styleId, imageConfig, options, logger)` in `apps/server/src/quiz/mascot/artGenerator.ts`.
  - Validates style existence in `mascot.styles` (throwing error if not found).
  - Loads master reference image via `loadMasterReferenceImageBase64(repository, mascot, logger)`.
  - Asserts prompt contract with `assertMascotPromptContract(fullPrompt, Boolean(referenceImageBase64))`.
  - Supports live AI generation with `retryWithBackoff`, transparent background removal via `removeImageBackground`, and procedural SVG fallback when AI is disabled or fails.
  - Saves matted image as `style_${styleId}_anchor_${Date.now()}.png` and raw AI image as `style_${styleId}_anchor_raw_${Date.now()}.png` via `repository.saveMascotAsset`.
  - Updates mascot profile in repository under `withMascotWriteLock` so `style.anchor_image_url` is stored, and cleans up prior anchor image files to prevent storage bloat.
  - Returns `{ anchor_image_url, raw_image_url, prompt_used, placeholder }`.

## Verification

- Command: `pnpm --filter @studio/server test -- test/mascotPromptContract.test.ts test/mascotStyleConcept.test.ts`
  - Result: 23 passing tests (exit code 0)
- Command: `pnpm --filter @studio/server test -- test/mascotSlotGeneration.test.ts`
  - Result: 11 passing tests (exit code 0)
- Command: `pnpm typecheck`
  - Result: Monorepo typecheck passed across shared, server, and web (exit code 0)
- Command: `node scripts/agent-validate-zones.mjs --json`
  - Result: 0 unmapped files, 0 overlapping files (valid: true)

## Open Risks

- Risk: The web client and server routes for style concept generation endpoints are not yet wired to this generator function.
- Suggested next action: Step 3 subagent should implement the HTTP route handler in `apps/server/src/routes/mascots.ts` calling `generateMascotStyleConcept` and handling client requests.

## Next Phase Input

- Files the next agent must read:
  - `packages/shared/src/api/mascot.ts`
  - `apps/server/src/quiz/mascotPromptContract.ts`
  - `apps/server/src/quiz/mascot/artGenerator.ts`
  - `apps/server/src/routes/mascots.ts`
- Commands the next agent should run first:
  - `git status --porcelain`
  - `node scripts/agent-status.mjs --json`
- Important constraints: Maintain 100% English codebase and use authenticated coordination claim protocol.
