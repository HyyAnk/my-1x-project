# Agent Coordination Change Request: Short-Reel Application Zone

## Request

Approve a focused zone for future files under apps/server/src/shortReel/. This document is a proposal only; no zone definition or product file has been changed.

```yaml
- id: short-reel-application
  name: Short-Reel Application
  risk: high
  lockPolicy: exclusive
  description: Short-Reel selection, script compilation, revision policy and package workflows
  globs:
    - apps/server/src/shortReel/**
  readStableDependencies:
    - shared-contracts
    - artifact-contracts
    - api-contracts
  coClaimWith:
    - server-tests
  verification:
    commands:
      - pnpm --filter @studio/server test
      - pnpm typecheck
```

## Reason

The current zone map covers server quiz subdomains and explicit core files, not an arbitrary new top-level feature folder. Current zone validation passes because Short-Reel files do not yet exist. Phase 03 cannot create questionSelection.ts/topicConfirmation.ts there until coverage is approved/applied. Routes, repository, shared contracts and web files remain in their existing zones.

## Affected Files

- .agent-orchestrator/zones.yml (future integrator edit only)
- Future apps/server/src/shortReel/questionSelection.ts and topicConfirmation.ts; later scriptService.ts, scriptPrompt.ts, flowPromptCompiler.ts, revisionPolicy.ts, packageService.ts, referenceResolver.ts, thumbnailAdapter.ts, publishingService.ts, exportService.ts

## Affected Zones

New short-reel-application; existing shared-contracts/artifact-contracts/api-contracts are dependencies, not reassigned ownership. server-tests remains a companion claim. External configured storage requires explicit runtime ownership/containment planning; this source zone does not authorize broad data deletion.

## Risk

High policy boundary, small metadata change. Exclusive ownership is conservative while contracts and revision semantics stabilize. Do not relax to shared-disjoint solely to increase agent count.

## Compatibility

No existing paths are moved and no existing claims are broadened. Phase 02 shared/repository work can proceed after Phase 01 review; application-file creation stays gated. Existing authenticated lifecycle remains unchanged.

## Proposed Verification

- node scripts/agent-validate-zones.mjs --json
- node --test scripts/test-agent-coordination.mjs scripts/coordination/test/*.test.mjs
- Inspect an example future path match and verify no overlaps with existing zones
- Verify actual product tests/typecheck after each future implementation claim

## Integrator Decision

Approved and applied by integrator on 2026-09-07 under claim `claim-antigravityintegrator-mtqw42pu`. The `short-reel-application` zone is active in `.agent-orchestrator/zones.yml`.

