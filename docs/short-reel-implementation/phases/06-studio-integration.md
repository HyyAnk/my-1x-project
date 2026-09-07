# Phase 06: Studio And Asynchronous Integration

> Execution: use the host's plan-execution workflow when available; otherwise follow these explicit steps. No sub-agent dispatch is required or authorized by this file.

**Goal:** Studio And Asynchronous Integration for the manual-Flow Short-Reel product.

**Architecture:** Follow [architecture](../architecture.md) and [contracts](../contracts.md); keep changes in the owning boundary.

**Tech Stack:** Existing TypeScript/Zod/Fastify/React, repository adapters and project test tooling.

**Spec:** [specification](../specification.md). Requirement coverage: SR-06, SR-07, SR-09, SR-10, SR-14, SR-15.

**Prerequisite:** Phase 05 reviewed and released; draft routes/view from Phase 03 remain functional.

## Global Constraints

Read [agent runbook](../agent-runbook.md). Main-direct, concrete claims, English artifacts, no unsolicited commits, no Flow automation, no folder deletion. Required predecessor review and current-code verification are mandatory.

## Purpose And Scope

Complete the usable Short-Reel Studio by extending the existing draft surface, not adding a second competing route.

**Modify:** `apps/server/src/routes/shortReels.ts`, `apps/web/src/api/shortReels.ts`, `apps/web/src/features/shortReel/ShortReelStudio.tsx`, exact task registration/contracts and app wiring discovered in Phase 01.

**Create:** feature `components/SegmentEditor.tsx`, `ReelAssets.tsx`, `PublishingPanel.tsx`, `hooks/useShortReel.ts`, hook/component tests, `apps/server/test/shortReelRoutes.test.ts` and Playwright Short-Reel test under the configured testDir.

## Interaction Plan

Primary flow: select topic -> inspect source -> generate package -> inspect/edit three segments -> save -> review stale dependents -> copy prompt/download assets. Script, Assets and Publishing tabs group secondary choices. Segment tabs are 1/2/3, not three cramped editable columns on mobile.

Show immediate pending acknowledgement; preserve draft input and previous usable outputs. Skeletons belong to initial content load; button spinners to short saves; named task stages to background package work. No fabricated percentage. Do not freeze unrelated controls.

## Work Slices

- [ ] Review Phase 05 and add failing HTTP-01 through HTTP-05 and UI-01 through UI-07 tests.
- [ ] Implement thin typed routes from contracts.md, safe error translation, expected revision and idempotency. Reject cross-channel access and client-supplied paths.
- [ ] Register package task types using current task composition. Distinguish reel IDs from episode IDs explicitly; do not populate episode_id with a reel ID as a shortcut.
- [ ] Persist current operation ID/dependencies and reconcile orphan pending work after server restart to interrupted/failed with safe retry. Never leave a spinner indefinitely because a process died.
- [ ] Reuse existing event subscription with record-scoped invalidation/refetch. On reconnect fetch authoritative record/task; discard older events/responses. If events are unsuitable, bounded visibility-aware polling with cancellation is acceptable and must be documented.
- [ ] Implement local unsaved draft ownership; remote updates must not overwrite typed input. Show conflict with reload/keep-draft path; do not auto-retry stale writes as unconditional overwrites.
- [ ] Implement actual save/regenerate/cancel/copy/export actions. Copy requires a deliberate user click; show success only after clipboard promise resolves and a selectable-text fallback on denial. No OS-level input control.
- [ ] Handle stale downstream segments with concise status and explicit review/regenerate action. Do not spend LLM/image credits just because the user changes a tab.
- [ ] Use the installed Phosphor icon library. Audit title punctuation, redundant controls, English copy, focus, touch targets and text fitting. Reuse existing footer; resolve conflicting instructions before introducing new footer copy.
- [ ] Verify 1440x900 and 390x844 plus narrow 320px layout; screenshot actual ready, pending, empty, partial and error views. Confirm no horizontal overflow or concealed essential controls.
- [ ] Test refresh/reopen, slow provider, retry, cancellation, reconnect and two-tab edit race. All affected topic/detail/list views reconcile without F5.
- [ ] Restart/rebuild affected server/web process and execute the full workflow with stubbed provider plus real HTTP/storage. Record any live-provider limitation separately.
- [ ] Run route/web/E2E tests, build/typecheck and zone validation, then review/handoff/release.

## Verification

`pnpm --filter @studio/server test -- test/shortReelRoutes.test.ts`

`pnpm --filter @studio/web test`, `pnpm --filter @studio/web build`, `pnpm typecheck`, and targeted Playwright Short-Reel test using the repository's configured command/testDir. Inspect Playwright config before choosing URLs/ports or starting servers.

## Acceptance And Stop Conditions

Every primary action works, acknowledges immediately and recovers without losing input. Async results cannot regress state; no persistent fake loading; no claim about progress inside Flow. Stop if the existing task contract cannot model reel ownership without coordinated changes; expand the claim first rather than bypassing types.

## Evidence And Handoff

Use [phase evidence template](../templates/phase-evidence.md). Write `verification/evidence/phase-06-implementation.md` and `docs/agent-coordination/handoffs/short-reel-phase-06.md` (the latter relative to repository root). Link commands/findings in progress.md before verification; then verify/release without further edits. A reviewer records acceptance in a subsequent documentation claim.
