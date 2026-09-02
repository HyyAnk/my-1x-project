# Agent Coordination Integration Report

## Summary

- Result: hardened and ready for final transactional release
- Date: 2026-09-02
- Integrators: Antigravity (Phases 0–5), Codex (hardening review and repair)
- Working mode: direct on `main`; no branch or worktree
- Design commit: `ea9b526`

## Phase History

Completed Phase 0–4 handoffs are archived at:

- `docs/agent-coordination/archive/phase-0-foundation.md`
- `docs/agent-coordination/archive/phase-1-zone-map.md`
- `docs/agent-coordination/archive/phase-2-claim-release.md`
- `docs/agent-coordination/archive/phase-3-diff-guard.md`
- `docs/agent-coordination/archive/phase-4-advanced-orchestrator.md`

The current final handoff is `docs/agent-coordination/handoffs/phase-5-final-integration-cleanup.md`.

## Hardening Outcome

- Claim and expansion conflict checks plus writes are atomic through SQLite `BEGIN IMMEDIATE`, with a 5000 ms busy timeout and domain-level contention errors.
- `shared-disjoint` accepts only normalized concrete repository paths. Wildcards are rejected, Windows comparison is case-insensitive, and an empty planned-file list owns the whole zone.
- Claim creation returns a 32-byte base64url lease token once. Only the SHA-256 hash is stored, and mutation uses constant-time authentication.
- Claim JSON compacts the baseline to revision, repository fingerprint, and dirty-file count so large dirty workspaces cannot truncate the one-time token response.
- Expand, heartbeat, verify, and release require the token. Legacy tokenless claims cannot mutate.
- Expand and release responses strip the internal token hash before returning data to callers or JSON output.
- Git baselines use zero-delimited porcelain output and SHA-256 content fingerprints, including individual untracked files and pre-existing dirty files.
- Verification requires non-empty evidence and stores the repository fingerprint. Changed content or `HEAD` invalidates it.
- Release rechecks authentication, scope, evidence, and fingerprint inside an immediate transaction.
- Queue scope inspection is read-only. A clean scope is not labeled releasable until stored verification is fresh.
- The zone map contains 19 cohesive zones and maps every tracked or non-ignored product file beneath `apps/`, `packages/`, and `services/` exactly once.
- Coordination CLIs use structured timestamped logs with level, worker, and step labels; color is TTY-only and JSON stays ANSI-free.

## Durable Files

- Operating rules: `AGENTS.md`, `GEMINI.md`
- Zone source: `.agent-orchestrator/zones.yml`, `.agent-orchestrator/README.md`
- Protocol docs: `docs/agent-coordination/`
- Commands and Windows wrappers: `scripts/agent-*.mjs`, `scripts/agent-*.cmd`
- Core implementation: `scripts/coordination/`
- Compatibility entry point: `scripts/test-agent-coordination.mjs`

## Verification Evidence

- `node --test scripts/test-agent-coordination.mjs scripts/coordination/test/*.test.mjs`: 47 passed, 0 failed.
- `node scripts/agent-validate-zones.mjs --json`: 926 files, 19 zones, 0 definition errors, 0 unmapped files, 0 overlaps.
- `node --check` across all coordination `.mjs` files: passed.
- Targeted Prettier check across all coordination scripts, docs, metadata, `AGENTS.md`, and `GEMINI.md`: passed.
- Repository-wide `node scripts/check-format.mjs`: blocked by 66 pre-existing dirty product files outside the repair claim; none were modified by this repair.
- Concurrent exclusive-claim race: exactly one accepted owner; repeated race regression remains in the suite.
- JSON status, queue, zone-audit, verification, and release paths are parseable and do not expose token hashes.

The active repair claim is `claim-codex-coordination-final`. Its successful verification and release are the final commands for this phase; evidence explicitly records the repository-wide formatter limitation. Live claim state in `agent-status --integrator --json` is authoritative.

## Recovery Record

`claim-codex-coordination-fingerprinted` lost its one-time raw token when a large CLI response was truncated. After its 15-minute heartbeat timeout, the standard stale cleanup marked it `expired`. No files were deleted. Work resumed under `claim-codex-coordination-final`, whose token remained only in session memory. A final review issue was repaired under `claim-codex-coordination-redaction` after the first final claim had already been released.

## Limits

- The protocol does not install OS filesystem ACLs or intercept arbitrary editor writes. An unrestricted process can bypass it.
- Main-direct mode cannot prove which process physically wrote a file; it enforces ownership through claim transactions, fingerprints, review, and integration gates.
- Integrators must refuse active, unverified, stale, unmapped, or overlapping work even when Git reports no textual merge conflict.
