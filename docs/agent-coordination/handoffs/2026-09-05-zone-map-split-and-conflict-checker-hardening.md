# Zone Map Split And Conflict Checker Hardening Handoff Summary

## Status

- Result: completed
- Date: 2026-09-05
- Agent: zcode
- Working mode: main-direct
- Baseline before edits: 79 dirty files recorded by `agent-claim` (mascot/stage-studio work from concurrent agents); none touched by this task. Claim released and re-created once because a concurrent released claim modified two web files after the first baseline (see Decisions).

## Source Files Read

- AGENTS.md
- docs/agent-coordination/README.md
- docs/agent-coordination/master-spec.md
- docs/agent-coordination/integration-report.md
- .agent-orchestrator/zones.yml
- .agent-orchestrator/README.md
- scripts/coordination/conflict-checker.mjs, claim-service.mjs, heartbeat-service.mjs, diff-guard-service.mjs, zone-validator.mjs
- scripts/coordination/test/*, scripts/test-agent-coordination.mjs
- scripts/coordination/monitor/web/topology-layout.js

## Files Changed

- .agent-orchestrator/zones.yml
- scripts/coordination/conflict-checker.mjs
- scripts/coordination/test/conflict-checker.test.mjs (new)
- scripts/test-agent-coordination.mjs
- scripts/coordination/test/monitor-server.test.mjs
- scripts/coordination/monitor/web/topology-layout.js
- docs/agent-coordination/handoffs/2026-09-05-zone-map-split-and-conflict-checker-hardening.md

## Main-Direct Safety

- Confirmed no branch/worktree was created: yes
- Baseline was recorded before edits: yes
- Pre-existing dirty files touched: none

## Scope

- Claimed phase: zone system high-priority upgrades (zone map + conflict checker only; no product code)
- Allowed scope used: `agent-coordination`, `coordination-handoffs`
- Scope deviations: `scripts/coordination/claim-service.mjs` was temporarily modified and reverted to HEAD during implementation; final tree contains no change to it.

## Key Changes

1. **`coordination-handoffs` zone (zones.yml 2.1.0).** Handoff summaries (`docs/agent-coordination/handoffs/**`) moved out of the exclusive `agent-coordination` zone into a new `shared-disjoint` zone with the same id. Agents no longer need the exclusive protocol zone just to write their own handoff (handoffs accounted for the large majority of the 83 historical `agent-coordination` claims). `agent-coordination` excludes `!docs/agent-coordination/handoffs/**`.
2. **Root manifests covered.** `project-configuration` now also covers root `package.json` (moved out of `agent-coordination`), `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `tsconfig.json`, and `.npmrc`, so dependency-update tasks have a legitimate zone and verify-time `no_matching_zone` violations disappear for those files.
3. **Heartbeat-dead claims no longer block.** `validateAndCheckConflicts` previously skipped only `expiresAt < now`, so a claim with a dead heartbeat but unexpired TTL still blocked new claims until `agent-cleanup-stale` ran. It now uses `isClaimDead` (covers `ttl_expired` and `heartbeat_timeout`). New unit tests in `scripts/coordination/test/conflict-checker.test.mjs`; new integration scenario in `scripts/test-agent-coordination.mjs` (backdated heartbeat, takeover of an exclusive zone).
4. **Monitor updated.** `ZONE_POSITIONS` gained a 3D coordinate entry for `coordination-handoffs`; zone-count assertions updated 19 -> 20.

## Decisions

- Decision: keep `docs/agent-coordination/integration-report.md` (dated 2026-09-02) unchanged.
- Reason: it is a dated phase evidence record, not living documentation; editing its "19 zones" line would falsify history. The current count lives in `zones.yml` and this handoff.
- Decision: re-create the claim instead of patching verification.
- Reason: a concurrent agent released its verified claim at 16:51 leaving post-baseline modifications to two web files; scope inspection correctly flagged them. A fresh claim with a current baseline re-scoped verification to this task's own files. The replacement claim also validated the new heartbeat-dead skip in production (the dead predecessor claim no longer blocked the new claim).
- Impact on later phases: none; both dead intermediate claims were marked `expired` by `agent-cleanup-stale`.

## Verification

- Command: `node --test scripts/test-agent-coordination.mjs scripts/coordination/test/*.test.mjs`
- Result: 62 passed, 0 failed (was 58 tests before this task)
- Command: `node scripts/agent-validate-zones.mjs --json`
- Result: valid, 1138 files, 20 zones, 0 definition errors, 0 unmapped files, 0 overlapping files
- Command: `node scripts/check-format.mjs` (scoped)
- Result: all claim-owned coordination files Prettier-clean; remaining formatter failures are pre-existing dirty mascot/product files owned by other claims and were not modified
- Claim: `claim-zcode-mtonj5kv` verified and released with repository fingerprint evidence

## Open Risks

- Risk: verify/release cannot succeed while another agent mutates files covered by no active claim mid-flight (orphaned post-baseline changes from a released claim). The only recovery today is re-claiming with a fresh baseline; there is no re-baseline command.
- Suggested next action: add `agent-rebaseline` or have scope inspection attribute orphaned changes to their releasing claim. Also consider: co-claim constraints (implementation + test zones), eager stale-claim blocking checks in the integrator report, and flattening the `server-core`/`web-layout-style` exclusion lists into positive globs.

## Next Phase Input

- Files the next agent must read: `.agent-orchestrator/zones.yml` (2.1.0), `scripts/coordination/conflict-checker.mjs`
- Commands the next agent should run first: `node scripts/agent-validate-zones.mjs --json`, `node scripts/agent-status.mjs --integrator --json`
- Important constraints: `docs/agent-coordination/handoffs/**` is now `coordination-handoffs` (shared-disjoint) — claim it with your own handoff file as the planned file; the exclusive `agent-coordination` zone is only for protocol source (`zones.yml`, `scripts/coordination/**`, `.agent-orchestrator/**`, `AGENTS.md`).
