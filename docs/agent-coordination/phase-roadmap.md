# Agent Coordination Phase Roadmap

## Phase 0: Foundation

**Goal:** Establish the operating rules and source-of-truth documents.

**Allowed work:**

- Add or update coordination documentation.
- Add agent-facing instructions.
- Define the integrator role.
- Define handoff and cleanup requirements.

**Do not implement:**

- Claim CLI.
- Diff guard.
- Runtime orchestrator.

**Exit criteria:**

- Future agents know where to start.
- The repository contains prompts for each phase.
- The handoff template is ready.

## Phase 1: Zone Map

**Goal:** Define named zones, file globs, risk levels, lock policies, dependencies, and verification expectations.

**Expected output:**

- `.agent-orchestrator/zones.yml`
- Optional docs explaining zone decisions.
- Phase 1 handoff summary.

**Exit criteria:**

- Each high-risk area has an explicit zone.
- Agents can map planned files to zones.
- The map is strict enough to protect shared contracts but not so broad that every task blocks every other task.

## Phase 2: Lightweight Claim And Release

**Goal:** Create a simple local mechanism for agents to claim zones, expand claims, check status, and release claims.

**Expected output:**

- Local claim registry using SQLite or JSON.
- Commands for status, claim, expand, release, and stale-claim cleanup.
- Baseline snapshot captured when a claim starts so main-direct work can distinguish pre-existing dirty files from new edits.
- Smoke tests or focused automated tests.
- Phase 2 handoff summary.

**Exit criteria:**

- Agents can see active claims.
- Conflicting high-risk write claims are blocked.
- Claim expansion is explicit.
- Claims have TTL or stale cleanup.
- Claims record the dirty workspace baseline before the agent edits files.

## Phase 3: Diff Guard

**Goal:** Prevent agents from completing work when their diff exceeds the zones they claimed.

**Expected output:**

- Diff verification command.
- Optional pre-commit hook wiring.
- Optional CI command documentation.
- Phase 3 handoff summary.

**Exit criteria:**

- The guard detects changed files outside active claim scope.
- The guard accounts for the claim baseline because all agents edit directly on main.
- The guard explains which zone must be claimed or expanded.
- Low-risk disjoint work remains fast.

## Phase 4: Advanced Orchestrator

**Goal:** Add stronger coordination only after the lightweight system proves useful.

**Expected output:**

- Heartbeat support.
- Dead claim detection.
- Read-stable dependency conflict checks.
- Integration queue or merge queue metadata.
- Optional local dashboard or status report.
- Phase 4 handoff summary.

**Exit criteria:**

- Multiple active agents can coordinate without relying on chat memory.
- Stale claims do not block the system indefinitely.
- The integrator can see what is safe to merge next.

## Phase 5: Final Integration And Cleanup

**Goal:** Verify the protocol, archive temporary artifacts, and leave only durable documentation and tooling.

**Expected output:**

- Integration report.
- Cleanup manifest.
- Archived stale claims and phase summaries.
- Final verification notes.

**Exit criteria:**

- All completed claims are released or archived.
- Temporary files are listed and cleaned.
- Durable protocol files remain discoverable for future agent work.
