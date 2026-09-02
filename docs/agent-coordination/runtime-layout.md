# Proposed Runtime Layout

This file describes the runtime artifacts later phases may create. Phase prompts decide when each artifact becomes real.

## Durable Coordination Files

```text
.agent-orchestrator/
  zones.yml
  README.md
```

These files should stay in the repository after the protocol is adopted.

## Local Runtime State

```text
.agent-orchestrator/state/
  claims.db
  locks/
  heartbeat/
```

Local runtime state should usually be ignored by Git unless the phase intentionally stores a portable sample.

## Logs And Handoff

```text
docs/agent-coordination/handoffs/
  phase-0-foundation.md
  phase-1-zone-map.md
  phase-2-claim-release.md
  phase-3-diff-guard.md
  phase-4-advanced-orchestrator.md
  phase-5-final-integration-cleanup.md
```

Phase handoff summaries are useful during implementation. After final integration, move stale or low-value handoffs into an archive or remove them according to `cleanup-and-archive.md`.

## Commands (Implemented)

The coordination CLI tools are implemented with Node.js ESM (`.mjs`) and native Windows command wrappers (`.cmd`):

```text
scripts/agent-status.mjs / scripts/agent-status.cmd
scripts/agent-claim.mjs / scripts/agent-claim.cmd
scripts/agent-expand.mjs / scripts/agent-expand.cmd
scripts/agent-release.mjs / scripts/agent-release.cmd
scripts/agent-verify-claim.mjs / scripts/agent-verify-claim.cmd
scripts/agent-cleanup-stale.mjs / scripts/agent-cleanup-stale.cmd
scripts/agent-heartbeat.mjs / scripts/agent-heartbeat.cmd
scripts/agent-queue.mjs / scripts/agent-queue.cmd
scripts/agent-validate-zones.mjs / scripts/agent-validate-zones.cmd
```

Underlying shared modules reside in `scripts/coordination/`:

- `db.mjs`: Node 24 native SQLite database management (`node:sqlite`).
- `zone-loader.mjs`: Parser for `.agent-orchestrator/zones.yml`.
- `git-baseline.mjs`: Zero-delimited Git status capture and SHA-256 repository fingerprints.
- `conflict-checker.mjs`: Lock policy conflict evaluator and dependency resolver.
- `glob-matcher.mjs`: Path normalization and positive/negative glob matcher.
- `path-ownership.mjs`: Concrete planned-file normalization, validation, and overlap detection.
- `lease-service.mjs`: Lease-token generation, hashing, and constant-time authentication.
- `diff-guard-service.mjs`: Read-only scope inspection and evidence-persisting verification.
- `heartbeat-service.mjs`: Liveness tracking, dead claim detection, and TTL extension.
- `queue-service.mjs`: Integrator queue prioritization and status reporting.
- `zone-validator.mjs`: Zone-definition validation and complete product-path coverage audit.
- `cli-logger.mjs`: Dependency-free structured and color-capable terminal logging.
- `workspace-root.mjs`: Shared repository root discovery without circular imports.

## Persistence And Release

`claims.db` stores claim metadata, hash-aware dirty baselines, the SHA-256 lease-token hash, and successful verification evidence. Raw lease tokens are returned only in the claim response. Release rechecks scope and requires the repository fingerprint to match the stored successful verification.

## Git Ignore Guidance

Track:

- `.agent-orchestrator/zones.yml`
- Stable command scripts.
- Tests.
- Docs and prompt files.

Ignore:

- Local claim databases.
- Heartbeat files.
- Temporary lock files.
- Generated status reports unless explicitly used as handoff artifacts.
