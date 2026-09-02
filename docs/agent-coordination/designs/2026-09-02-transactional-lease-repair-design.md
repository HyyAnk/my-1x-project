# Transactional Lease Repair Design

## Status

- Date: 2026-09-02
- Approved direction: transactional lease
- Working mode: direct edits on `main`; no branches or worktrees
- Scope: repair and harden the Agent Coordination Protocol without changing product runtime behavior

## Problem

The existing coordination tools provide documentation, zone metadata, a SQLite claim registry, heartbeats, a diff guard, and an integration queue. They do not yet enforce the protocol reliably under concurrent processes:

- The conflict check and claim insert are not one atomic database operation.
- `shared-disjoint` compares planned paths as exact strings, so missing paths and overlapping globs can bypass collision detection.
- A claim can be released without passing the diff guard or recording fresh verification.
- Claim mutation commands do not authenticate the claim owner.
- Baselines record path names but not file content, and `baseRevision` is not enforced.
- Significant product paths are not covered by a zone.
- The final documentation and handoff paths are inconsistent.

## Goals

- Make claim acquisition and expansion atomic across concurrent Node processes.
- Ensure overlapping work is rejected conservatively before an agent edits.
- Require the claim owner to expand, heartbeat, verify, and release a claim.
- Prevent release when scope verification fails or verification evidence is stale.
- Detect changes to files that were already dirty when the claim began.
- Detect a changed Git `HEAD` during an active claim.
- Make zone coverage measurable and keep product files out of unmapped gaps.
- Preserve low overhead: no daemon, no background service, and no product dependency.
- Keep command-line usage portable across Codex, Claude, Antigravity, and other agents.

## Non-Goals

- The protocol will not use OS-level filesystem ACLs or intercept arbitrary editor writes.
- The protocol will not prove which process physically wrote a file in a shared checkout.
- The protocol will not create branches or worktrees.
- The protocol will not automatically commit product changes.
- The protocol will not run a permanent lock server or dashboard.

The enforcement boundary is claim mutation, verification, release, and any Git hook or CI integration that invokes these commands. An agent with unrestricted filesystem access can still ignore the protocol; repository instructions and integration gates remain necessary.

## Chosen Architecture

The coordination system remains a local Node.js ESM CLI backed by native `node:sqlite`. SQLite becomes the serialization point for leases. Each claim receives a public claim ID and a secret lease token. The database stores only a SHA-256 hash of that token.

The main flow is:

```text
claim → edit → heartbeat/expand as needed → verify → release
```

`verify` captures a repository fingerprint and records successful scope verification. `release` recalculates that fingerprint and refuses to release when the repository changed after verification.

## Components

### Database and transactions

`scripts/coordination/db.mjs` will:

- Configure `PRAGMA busy_timeout = 5000`.
- Provide a synchronous `withImmediateTransaction(db, operation)` helper.
- Add backward-compatible columns for `lease_token_hash` and `verification_data`.
- Roll back every failed transaction.

Claim acquisition and expansion will run active-claim reads, conflict evaluation, and writes inside `BEGIN IMMEDIATE`. A concurrent claimant waits for the first transaction and then evaluates the committed claim state. It must receive a domain conflict rather than a random `database is locked` error.

### Lease ownership

`claimZone` generates 32 random bytes and returns the token once. The database persists `sha256(token)`. Status and queue output never expose the token.

These operations require `claimId` and `leaseToken`:

- expand
- heartbeat
- verify
- release

The cleanup command remains integrator-owned and does not need an agent token because it may only expire objectively dead claims. A deliberate force-release is outside this repair scope.

For compatibility, old active claims without a token hash cannot be mutated. They must expire or be cleaned, preventing an unauthenticated compatibility bypass.

### Shared-disjoint ownership

Planned paths are normalized to repository-relative forward-slash paths.

For a `shared-disjoint` zone:

- Wildcards in planned paths are rejected.
- Every planned path must map to one of the claim's write zones.
- Two active claims in the same zone conflict when their concrete planned-file sets intersect.
- Omitting planned files creates a conservative whole-zone claim, which conflicts with every other writer in that zone.
- Expanding planned files repeats the same atomic validation.

Exclusive and runtime zones remain whole-zone locks regardless of planned files.

### Baseline and repository fingerprint

`scripts/coordination/git-baseline.mjs` will capture:

- `baseRevision`
- porcelain status entries using `--untracked-files=all`
- normalized changed paths
- a SHA-256 fingerprint for every dirty file that exists
- the complete repository-state fingerprint derived from `HEAD`, status codes, paths, and file hashes

The diff guard compares current status and hashes against the baseline. A baseline file is ignored only when its status and content hash are unchanged. Modifying a pre-existing dirty file is therefore observable without relying on `mtime`.

If current `HEAD` differs from the claim's `baseRevision`, verification fails with a `head_changed` violation. This is intentionally conservative because a shared checkout cannot attribute a commit to one agent. The operating rule becomes: agents do not commit while claims are active; the integrator commits after verified releases.

### Verification and release gate

`verifyClaimScope` requires the lease token and returns:

- authorized changed files
- scope violations
- baseline files proven unchanged
- repository fingerprint
- required verification commands

On success, it stores a verification record containing timestamp, repository fingerprint, base revision, authorized files, and a caller-supplied evidence summary. Verification commands remain explicit and visible; this repair does not silently execute arbitrary shell commands from YAML. The caller must provide a non-empty evidence summary describing the commands run and their results.

`releaseActiveClaim` will:

1. Authenticate the lease token.
2. Re-run diff scope verification without replacing the stored evidence.
3. Require a prior successful verification record.
4. Require the stored fingerprint to equal the current fingerprint.
5. Mark the claim released in an immediate transaction.

Release cannot accept a default statement such as “verification completed successfully.”

### Zone coverage

A new `zone-validator.mjs` will inspect tracked and untracked, non-ignored product paths under `apps/`, `packages/`, and `services/`. It reports:

- unmapped product paths
- paths mapped to more than one write zone
- invalid negative-only zones
- duplicate zone IDs
- invalid lock policies and dependency references

The zone map will be broadened using cohesive zones rather than one catch-all. Existing specific high-risk zones retain priority, and exclusions prevent accidental overlaps. Coordination documentation and tooling receive an explicit `agent-coordination` runtime zone so protocol maintenance can claim its own files.

### CLI output

A focused `cli-logger.mjs` will provide timestamped, labeled, color-capable output with `[INFO]`, `[STEP]`, `[OK]`, `[WARN]`, and `[ERROR]`. JSON mode remains machine-readable and contains no ANSI sequences. Normal CLI paths will not use raw `console.log` or `console.error`.

## Data Model

The claim record gains:

```text
leaseTokenHash: SHA-256 hex string
baseline.fileFingerprints: map<path, { status, hash, kind }>
baseline.repositoryFingerprint: SHA-256 hex string
verification: {
  verifiedAt,
  repositoryFingerprint,
  baseRevision,
  authorizedFiles,
  evidenceSummary
} | null
```

The raw lease token is returned only by the successful claim command. It is never returned by status, history, queue, or database deserialization.

## Failure Handling

- SQLite contention waits for at most five seconds and returns an actionable coordination error.
- Conflict rejection lists the blocking claim and affected zone or file.
- Invalid or missing lease tokens fail without revealing the stored hash.
- `HEAD` movement invalidates verification and instructs the integrator to reconcile before continuing.
- A changed fingerprint after verification requires another verification run.
- Stale cleanup expires dead claims transactionally and never releases a live claim.
- JSON commands return structured error objects on stderr and a non-zero exit code.

## Performance

- Claim, expand, heartbeat, and status remain short SQLite operations.
- Hashing is limited to dirty files, not the complete repository.
- No polling or resident process is introduced.
- Required project tests run once before verification evidence is recorded, not during heartbeat or status.
- For one agent, expected coordination overhead remains dominated by `git status` and hashing the dirty set.

## Compatibility and Migration

- The existing database is migrated in place with additive columns.
- Released and expired historical claims remain readable.
- Existing CLI names and Windows wrappers remain valid.
- Mutating commands gain a required `--token` option.
- `agent-verify-claim` gains required `--evidence` when recording successful verification.
- `agent-status` and `agent-queue` continue to work without tokens.
- Documentation will include a copy-paste lifecycle example and token-handling guidance.

## Test Strategy

The suite will use isolated temporary databases and controlled Git fixtures where repository state matters.

Required regression tests:

- Two real Node processes racing for one exclusive zone result in exactly one accepted claim.
- Contention returns a domain conflict rather than an unhandled SQLite lock.
- Same-zone claims without planned files conflict.
- A broad wildcard planned path is rejected.
- Normalized forms of the same file conflict.
- Overlapping concrete files conflict while disjoint concrete files coexist.
- Wrong or missing lease tokens cannot mutate a claim.
- A failed diff guard cannot be released.
- A successful verification becomes stale after a file change.
- A changed `HEAD` invalidates verification.
- Editing a pre-existing dirty file is detected by hash.
- Release records include changed baseline files inside the authorized scope.
- The test suite passes on a clean checkout.
- Zone validation reports zero unmapped product files and zero unexpected overlaps.
- JSON CLI output remains parseable and secret-free.

## Documentation and Handoff

The repair will update the durable command documentation, integration report, cleanup manifest if needed, and archive references. It will create `docs/agent-coordination/handoffs/phase-5-final-integration-cleanup.md` with the baseline, claimed scope, changed files, test evidence, remaining limitations, and token migration notes.

## Acceptance Criteria

- The concurrent exclusive-claim race passes repeatedly.
- Claim/expand conflict checks and writes are atomic.
- Every claim mutation requires a valid lease token.
- Shared-disjoint claims cannot overlap through omissions, globs, path separators, or case differences on Windows.
- Release is impossible without fresh successful scope verification.
- Dirty baseline modifications and Git `HEAD` changes are detected.
- Product paths have complete, non-ambiguous zone coverage.
- All coordination tests, syntax checks, CLI smoke checks, and zone validation pass.
- No pre-existing dirty product file is modified by this repair.
- Documentation points only to paths that exist after cleanup.
