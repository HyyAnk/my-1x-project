# Agent Coordination Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the main-direct Agent Coordination Protocol safe under concurrent claims, authenticated claim mutation, baseline-aware verification, and gated release.

**Architecture:** Keep the existing Node.js ESM and native SQLite design, but make SQLite the atomic lease serialization point. Split lease authentication, path ownership, repository fingerprinting, zone validation, and CLI logging into focused modules; keep status and queue read-only while every mutation requires a lease token.

**Tech Stack:** Node.js 24 ESM, `node:sqlite`, `node:test`, Git porcelain v1 `-z`, PowerShell/Windows `.cmd` wrappers.

**Spec:** `docs/agent-coordination/designs/2026-09-02-transactional-lease-repair-design.md`

## Global Constraints

- Work directly on the current `main` checkout; do not create a branch or worktree.
- Preserve every pre-existing dirty product file and edit only coordination documentation, metadata, scripts, and tests.
- Use `apply_patch` for file edits.
- Follow RED → GREEN → refactor for every behavior change.
- Do not commit while an active claim exists; commit only after final verification and claim release.
- Do not add production dependencies or a background daemon.
- Never expose a raw lease token through status, history, queue, logs, or persisted JSON.
- Keep JSON output parseable and free of ANSI escape codes.
- Because the protocol is being bootstrapped, perform the lease migration in stages so the implementation claim is never orphaned.

---

### Task 1: Atomic SQLite transactions and contention handling

**Files:**

- Modify: `scripts/coordination/db.mjs`
- Modify: `scripts/coordination/claim-service.mjs`
- Create: `scripts/coordination/test/test-fixture.mjs`
- Create: `scripts/coordination/test/transaction.test.mjs`
- Modify: `scripts/test-agent-coordination.mjs` as a compatibility test entry point

**Interfaces:**

- Produces: `withImmediateTransaction(db, operation)` returning the operation result and rolling back on failure.
- Consumes: existing `openClaimsDb`, `getActiveClaims`, `insertClaimRecord`, and `validateAndCheckConflicts`.

- [ ] **Step 1: Add a failing real-process race test**

Add a `node:test` case that spawns two Node processes against the same temporary database. Both request `shared-contracts`; assert exactly one prints `accepted` and the other prints a domain conflict containing `already claimed`, never `database is locked`.

Move shared temporary database, temporary Git repository, cleanup, and child-process helpers into `test-fixture.mjs`. Split new behavior tests by responsibility rather than growing the existing 500-line test file.

- [ ] **Step 2: Run the race test and verify RED**

Run:

```powershell
node --test --test-name-pattern "concurrent exclusive claims" scripts/test-agent-coordination.mjs
```

Expected: fail intermittently or consistently because both claims can be inserted or SQLite returns `database is locked`.

- [ ] **Step 3: Implement the transaction helper**

Add the equivalent of:

```js
export function withImmediateTransaction(db, operation) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {}
    throw error;
  }
}
```

Configure `PRAGMA busy_timeout = 5000` when opening a database. Put active-claim read, conflict evaluation, and insert/update inside the immediate transaction for claim and expansion.

- [ ] **Step 4: Verify GREEN repeatedly**

Run the targeted test five times, then run the complete coordination suite.

- [ ] **Step 5: Refactor transaction error mapping**

Map exhausted SQLite contention to a concise `Coordination database remained busy for 5000ms` error while preserving domain conflicts.

### Task 2: Conservative shared-disjoint path ownership

**Files:**

- Create: `scripts/coordination/path-ownership.mjs`
- Modify: `scripts/coordination/conflict-checker.mjs`
- Modify: `scripts/coordination/claim-service.mjs`
- Modify: `scripts/agent-coordination-registry.mjs`
- Create: `scripts/coordination/test/path-ownership.test.mjs`

**Interfaces:**

- Produces: `normalizePlannedFiles(files, workspaceRoot)`, `validatePlannedFiles(zoneList, writeZones, plannedFiles)`, and `findPlannedFileOverlap(first, second)`.
- Consumes: `findZonesForFile` and repository root.

- [ ] **Step 1: Add failing ownership tests**

Add distinct tests proving:

```text
same shared-disjoint zone + no planned files => conflict
wildcard planned path => validation error
same path with slash/case differences on Windows => conflict
same zone + disjoint concrete paths => accepted
planned path outside claimed zones => validation error
```

- [ ] **Step 2: Run targeted tests and verify RED**

Run:

```powershell
node --test --test-name-pattern "shared-disjoint|planned path" scripts/test-agent-coordination.mjs
```

- [ ] **Step 3: Implement normalized concrete ownership**

Reject `*`, `?`, `[`, or `]` in planned paths. Normalize separators, remove `./`, reject absolute/outside-root paths, and use lowercase comparison on Windows. Treat an empty planned-file list as whole-zone ownership.

- [ ] **Step 4: Integrate validation atomically**

Validate the candidate before entering the transaction, then repeat conflict-sensitive overlap checks inside the transaction. Apply the same rules during expansion.

- [ ] **Step 5: Verify GREEN and full regression suite**

Run the targeted pattern followed by the complete coordination suite.

### Task 3: Lease token generation and authenticated mutations

**Files:**

- Create: `scripts/coordination/lease-service.mjs`
- Modify: `scripts/coordination/db.mjs`
- Modify: `scripts/coordination/claim-service.mjs`
- Modify: `scripts/coordination/heartbeat-service.mjs`
- Modify: `scripts/coordination/diff-guard-service.mjs`
- Modify: `scripts/agent-coordination-registry.mjs`
- Modify: `scripts/agent-claim.mjs`
- Modify: `scripts/agent-expand.mjs`
- Modify: `scripts/agent-heartbeat.mjs`
- Modify: `scripts/agent-verify-claim.mjs`
- Modify: `scripts/agent-release.mjs`
- Create: `scripts/coordination/test/lease.test.mjs`

**Interfaces:**

- Produces: `createLeaseToken() -> { token, hash }`, `hashLeaseToken(token)`, and `assertLeaseToken(claim, token)`.
- Changes: `expandActiveClaim`, `pulseHeartbeat`, `verifyClaimScope`, and `releaseActiveClaim` require `leaseToken`.
- Changes: `claimZone` returns `leaseToken` once while public claim queries omit `leaseTokenHash`.

- [ ] **Step 1: Add failing token tests**

Test token presence on claim creation; absence from status/history/queue JSON; rejection of missing/wrong tokens for expand, heartbeat, verify, and release; acceptance of the correct token; and rejection of legacy active claims without a token hash.

- [ ] **Step 2: Run token tests and verify RED**

```powershell
node --test --test-name-pattern "lease token" scripts/test-agent-coordination.mjs
```

- [ ] **Step 3: Add additive schema migration**

Add `lease_token_hash TEXT` and `verification_data TEXT`. Keep `deserializeRow` public and secret-free; add an internal mutation deserializer or an `includeSecrets` option used only by authenticated services.

- [ ] **Step 4: Implement constant-time authentication**

Generate 32 random bytes with `crypto.randomBytes(32).toString("base64url")`, hash with SHA-256, and compare hashes using `crypto.timingSafeEqual` after validating equal buffer lengths.

- [ ] **Step 5: Stage the active-claim migration safely**

Before enabling mandatory token checks for the remaining implementation, release the bootstrap claim using the old compatible path, then create a new claim with the token-producing claim command. Store the returned token only in process/session context; never write it into a tracked file.

- [ ] **Step 6: Require `--token` in mutation CLIs**

Update help, parsing, JSON errors, and service calls for expand, heartbeat, verify, and release.

- [ ] **Step 7: Verify GREEN and secret redaction**

Run token tests and inspect JSON output for the raw token and token hash; only the one-time claim response may contain the raw token.

### Task 4: Content fingerprints, verified evidence, and release gate

**Files:**

- Modify: `scripts/coordination/git-baseline.mjs`
- Modify: `scripts/coordination/db.mjs`
- Modify: `scripts/coordination/diff-guard-service.mjs`
- Modify: `scripts/coordination/claim-service.mjs`
- Modify: `scripts/coordination/queue-service.mjs`
- Modify: `scripts/agent-verify-claim.mjs`
- Modify: `scripts/agent-release.mjs`
- Create: `scripts/coordination/test/git-baseline.test.mjs`
- Create: `scripts/coordination/test/release-gate.test.mjs`

**Interfaces:**

- Produces: `captureGitState(workspaceRoot)` and `compareGitStates(baseline, current)`.
- Produces: `inspectClaimScope(options)` for read-only queue inspection.
- Changes: `verifyClaimScope({ claimId, leaseToken, evidenceSummary, ... })` persists successful evidence.
- Changes: `releaseActiveClaim({ claimId, leaseToken, ... })` requires matching stored/current fingerprints.

- [ ] **Step 1: Add failing Git fixture tests**

Use temporary initialized Git repositories to prove a clean baseline is valid, a pre-existing dirty file is ignored while unchanged, editing that file changes its hash, and changing `HEAD` produces `head_changed`.

- [ ] **Step 2: Add failing release-gate tests**

Prove release rejects: no verification record, a scope violation, empty evidence, wrong token, and a repository change after verification. Prove a fresh verified claim releases and records all changed files, including files dirty before the claim but modified within scope.

- [ ] **Step 3: Run targeted tests and verify RED**

```powershell
node --test --test-name-pattern "fingerprint|HEAD|release gate|verification evidence" scripts/test-agent-coordination.mjs
```

- [ ] **Step 4: Implement zero-delimited Git state capture**

Use `git status --porcelain=v1 -z --untracked-files=all`, hash existing files with SHA-256, represent deleted paths explicitly, sort normalized entries, and hash the complete state with `baseRevision`.

- [ ] **Step 5: Replace the mtime heuristic**

Compare `{status, kind, hash}` for every path. Treat current paths absent from the baseline and baseline paths whose fingerprints changed as work performed since claim creation.

- [ ] **Step 6: Persist successful verification**

Store `verifiedAt`, `repositoryFingerprint`, `baseRevision`, `authorizedFiles`, and trimmed `evidenceSummary`. Queue inspection may calculate scope cleanliness but must label it `scopeClean`, not `releasable`, until stored verification is fresh.

- [ ] **Step 7: Gate release transactionally**

Authenticate, inspect scope, compare the stored/current fingerprint, then update status inside `BEGIN IMMEDIATE`. Do not accept a default verification statement.

- [ ] **Step 8: Verify GREEN and full regression suite**

Run targeted tests, all coordination tests, and CLI JSON smoke checks.

### Task 5: Zone validation and complete product coverage

**Files:**

- Create: `scripts/coordination/zone-validator.mjs`
- Create: `scripts/agent-validate-zones.mjs`
- Create: `scripts/agent-validate-zones.cmd`
- Modify: `scripts/agent-coordination-registry.mjs`
- Modify: `.agent-orchestrator/zones.yml`
- Modify: `.agent-orchestrator/README.md`
- Create: `scripts/coordination/test/zone-validator.test.mjs`

**Interfaces:**

- Produces: `validateZoneDefinitions(zoneList)` and `auditZoneCoverage({ workspaceRoot, zoneList })`.
- Product scope: tracked/untracked non-ignored paths beneath `apps/`, `packages/`, and `services/`.

- [ ] **Step 1: Add failing zone-definition and coverage tests**

Test duplicate IDs, invalid policies, missing dependency references, negative-only globs, unmapped paths, and unexpected multi-zone paths. Assert the real repository audit reports zero unmapped and zero unexpected overlaps.

- [ ] **Step 2: Run zone tests and verify RED**

```powershell
node --test --test-name-pattern "zone validation|zone coverage" scripts/test-agent-coordination.mjs
```

- [ ] **Step 3: Implement the validator and CLI**

Return `{ valid, definitionErrors, unmappedFiles, overlappingFiles, counts }`. The CLI exits non-zero when any collection is non-empty and supports `--json`.

- [ ] **Step 4: Expand cohesive zones**

Broaden render implementation, add server core/providers/quality-timeline and project configuration zones as needed, and use negative globs to preserve exclusive high-risk boundaries. Add `agent-coordination` covering `.agent-orchestrator/**`, `scripts/agent-*`, `scripts/coordination/**`, `scripts/test-agent-coordination.mjs`, and `docs/agent-coordination/**`.

- [ ] **Step 5: Verify GREEN against the real repository**

```powershell
node scripts/agent-validate-zones.mjs --json
node --test --test-name-pattern "zone validation|zone coverage" scripts/test-agent-coordination.mjs
```

### Task 6: Structured, color-capable CLI logging

**Files:**

- Create: `scripts/coordination/cli-logger.mjs`
- Modify: `scripts/agent-claim.mjs`
- Modify: `scripts/agent-expand.mjs`
- Modify: `scripts/agent-heartbeat.mjs`
- Modify: `scripts/agent-verify-claim.mjs`
- Modify: `scripts/agent-release.mjs`
- Modify: `scripts/agent-status.mjs`
- Modify: `scripts/agent-queue.mjs`
- Modify: `scripts/agent-cleanup-stale.mjs`
- Modify: `scripts/agent-validate-zones.mjs`
- Create: `scripts/coordination/test/cli-logger.test.mjs`

**Interfaces:**

- Produces: `createCliLogger({ json, workerId, stream })` with `info`, `step`, `ok`, `warn`, `error`, and `writeJson` methods.

- [ ] **Step 1: Add failing logger tests**

Assert normal lines include ISO timestamp, level, worker, and step labels; colors appear only on a supported TTY; JSON output has no ANSI escapes; and errors include a suggested next action.

- [ ] **Step 2: Run logger tests and verify RED**

- [ ] **Step 3: Implement the dependency-free logger**

Use ANSI sequences with `NO_COLOR` and TTY detection. Serialize each line through one stream write. Keep claim tokens out of human logs.

- [ ] **Step 4: Refactor every coordination CLI**

Replace normal `console.log` and `console.error` calls. Each command prints a startup line and one final summary with success, failure, skipped, retry, and elapsed fields. Preserve exact JSON contracts where documented.

- [ ] **Step 5: Verify GREEN and scan for raw logging**

```powershell
rg -n "console\.(log|error)" scripts -g "agent-*.mjs" -g "coordination/*.mjs"
```

Expected: no normal CLI logging remains; narrowly justified internal diagnostics may use the logger only.

### Task 7: Durable documentation, handoff, and final acceptance

**Files:**

- Modify: `AGENTS.md`
- Modify: `GEMINI.md`
- Modify: `.agent-orchestrator/README.md`
- Modify: `docs/agent-coordination/README.md`
- Modify: `docs/agent-coordination/master-spec.md`
- Modify: `docs/agent-coordination/runtime-layout.md`
- Modify: `docs/agent-coordination/integration-report.md`
- Modify: `docs/agent-coordination/cleanup-manifest.md`
- Create: `docs/agent-coordination/handoffs/phase-5-final-integration-cleanup.md`

**Interfaces:**

- Documents: claim/token lifecycle, no-commit-during-claim rule, concrete planned files, verification evidence, release gate, zone validation, archive paths, and enforcement limits.

- [ ] **Step 1: Update operating instructions**

Add the exact command lifecycle with token placeholders. State that unrestricted agents can bypass filesystem-level enforcement and that integration must refuse unverified claims.

- [ ] **Step 2: Correct Phase 5 records**

Point archived Phase 0–4 references to `docs/agent-coordination/archive/`. Create the missing Phase 5 handoff using the repository template and include the original dirty baseline and repair claim IDs.

- [ ] **Step 3: Run documentation consistency checks**

Check referenced durable paths exist, scan for placeholders and trailing whitespace, and verify the command examples match current `--help` output.

- [ ] **Step 4: Run full technical verification**

```powershell
node --test scripts/test-agent-coordination.mjs scripts/coordination/test/*.test.mjs
node scripts/agent-validate-zones.mjs --json
node scripts/agent-status.mjs --integrator --json
node --check scripts/agent-coordination-registry.mjs
```

Run `node --check` for every coordination `.mjs` file and execute all Windows wrappers with `--help` or read-only status commands.

- [ ] **Step 5: Verify the active claim and release it**

Run required repository checks, record non-empty evidence with the token, confirm the fingerprint is unchanged, then release with the same token. Confirm no unexpected active claims remain.

- [ ] **Step 6: Review the final diff and commit only repair files**

Confirm no pre-existing dirty product file changed. Stage only the explicit coordination repair paths and commit on `main` with:

```text
fix: harden agent coordination leases
```

Do not stage unrelated changes.
