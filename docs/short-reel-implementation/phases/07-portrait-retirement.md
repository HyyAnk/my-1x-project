# Phase 07: Controlled Portrait Retirement

> Execution: use the host's plan-execution workflow when available; otherwise follow these explicit steps. No sub-agent dispatch is required or authorized by this file.

**Goal:** Controlled Portrait Retirement for the manual-Flow Short-Reel product.

**Architecture:** Follow [architecture](../architecture.md) and [contracts](../contracts.md); keep changes in the owning boundary.

**Tech Stack:** Existing TypeScript/Zod/Fastify/React, repository adapters and project test tooling.

**Spec:** [specification](../specification.md). Requirement coverage: SR-01, SR-11, SR-12, SR-13.

**Prerequisite:** Phase 06 reviewed and released; Short-Reel workflow usable; fresh source/data inventory reviewed before deletion.

## Global Constraints

Read [agent runbook](../agent-runbook.md). Main-direct, concrete claims, English artifacts, no unsolicited commits, no Flow automation, no folder deletion. Required predecessor review and current-code verification are mandatory.

## Purpose And Scope

Remove legacy portrait quiz support completely while protecting generic portrait media and the working Short-Reel pipeline.

**Exact file scope:** the current reviewed source manifest, not an unrestricted search-and-replace. Seed files include shared quiz layouts/config, Episode settings, mascot stage contracts/defaults, topic planning, production/Sandbox adapters, portrait renderer/styles, web layout/ratio controls, fixtures and snapshot registrations.

**Data scope:** only reviewed exact record/artifact targets from generated-data-cleanup.md. Never delete this execution folder.

## Work Slices

- [ ] Review Phase 06 and rerun CodeGraph/search against current HEAD/dirty state. Refresh manifests for any newer extracted modules or consumers.
- [ ] Independently review proposed removals and protected generic uses. Record reviewer and freshness evidence before deleting code/data. If self-review only, disclose and obtain user/integrator review for destructive scope.
- [ ] Acquire concrete claims for all affected contract/render/UI/test/data paths. No broad root claim or recursive delete inferred from phase title.
- [ ] Add failing RT-01 through RT-05 tests asserting Episode portrait rejection, absence of portrait quiz/stage/Sandbox controls and continued Short-Reel cover support.
- [ ] Remove portrait quiz schemas/catalog entries/dispatchers/layouts/styles and portrait-specific stage calibration. Narrow Episode contracts to landscape and reject portrait input instead of silently normalizing it.
- [ ] Preserve generic image ratio enums and bank visual hints where reusable; remove stale branching in consumers rather than globally deleting every 9:16 literal.
- [ ] Remove portrait-only fixtures/snapshots and test registrations deliberately. Keep landscape baselines; inspect visual diffs and never mass-update snapshots to hide a regression.
- [ ] Dry-run exact obsolete product cleanup, check root containment and shared references, stop active writers through supported task cancellation. Do not kill unrelated processes.
- [ ] Execute only the approved literal paths/record IDs. Record removed/retained items, errors and recoverability; reconcile indexes/task references via repository boundaries.
- [ ] Compare protected bank/channel/reference identities or checksums before/after. No source question, reusable mascot/style reference or new reel may disappear.
- [ ] Rerun portrait searches and classify every retained match in the allowlist. Validate no reachable legacy route/preset silently recreates portrait quiz state.
- [ ] Restart/build the updated app. Create/render a fresh landscape Episode and create/export a Short-Reel fixture; verify Stage Studio and Sandbox landscape behavior.
- [ ] Run targeted and full relevant checks, review actual screenshots, update evidence and handoff, then verify/release.

## Verification

Run explicit shared tests, `pnpm --filter @studio/server test`, `pnpm --filter @studio/web test`, `pnpm typecheck`, `pnpm test:visual`, `pnpm --filter @studio/web build` and zone validation. Record whether rendering used real configured media or fixtures; do not report mocked render as a real production video.

## Acceptance And Stop Conditions

All legacy portrait quiz paths are gone or explicitly rejected; landscape works; portrait references/cover still work; protected data unchanged; no dangling indexes. No compatibility reader is introduced.

Stop on any newly discovered shared asset, unclaimed path, active writer, unsafe junction or unreviewed destructive scope. User permission to discard test products does not authorize deleting a channels/assets root. Folder retention remains absolute.

## Evidence And Handoff

Use [phase evidence template](../templates/phase-evidence.md). Write `verification/evidence/phase-07-implementation.md` and `docs/agent-coordination/handoffs/short-reel-phase-07.md` (the latter relative to repository root). Link commands/findings in progress.md before verification; then verify/release without further edits. A reviewer records acceptance in a subsequent documentation claim.
