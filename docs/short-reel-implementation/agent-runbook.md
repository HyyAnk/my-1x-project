# Agent Execution Runbook

## Portable Operating Rules

These instructions work through repository files and terminal commands. No Codex-only task API or Antigravity-only memory is required. Use available skills when your host requires them, but missing optional skills must not become an excuse to skip the explicit checks here. Do not install tools, change agent settings or spawn agents merely to reproduce another host's workflow.

Work directly on the current main checkout. Do not create branches/worktrees, commit, push, publish, automate Flow or delete this folder unless the user separately requests those actions. A pasted phase prompt authorizes that phase's bounded work only. It does not authorize unrelated cleanup or moving to the next phase.

## Start Every Phase

1. Confirm the repository root contains `AGENTS.md`, `package.json` and `scripts/agent-status.mjs`. Read all applicable instructions and coordination source documents, not only a pasted summary.
2. Read the kit's required documents and assigned phase. Inspect [progress](progress.md), the predecessor evidence and current registry. If predecessor review is outstanding, perform the predecessor gate below before implementation.
3. Inspect current worktree with `git status --porcelain` and `git rev-parse HEAD`. Query `node scripts/agent-status.mjs --json`. Record the baseline; do not assume a clean tree.
4. If `.codegraph/` exists, use `codegraph explore` before text search to understand current symbols; then use `rg` for remaining references. Never re-index without user authorization. If CodeGraph is unavailable, report it and use read-only fallback discovery.
5. Enumerate exact planned file paths, zones, tests and runtime/data resources for this phase. Directory lists in phase docs are orientation, not permission to edit every child.
6. Acquire an authenticated claim before any edit, including evidence/progress/handoff files. Capture the returned lease token only in session memory. Verify returned `writeZones` and `plannedFiles` exactly match intent.

## Claim CLI Details

The current CLI takes comma-separated lists in one argument. Space-separated values silently omit intended paths; do not use them. For example, a documentation-only claim can be made with the following command after status inspection:

```powershell
node scripts/agent-claim.mjs --agent codex --task "Short-Reel phase documentation" --write "repository-docs,coordination-handoffs" --planned-files "docs/short-reel-implementation/progress.md,docs/agent-coordination/handoffs/short-reel-phase-01.md" --json
```

For real phase work replace that entire planned list with the concrete files discovered for the phase. Use your actual agent identity. Do not store tokens in markdown, generated reports, scripts, commits or terminal transcripts intentionally retained as evidence. Do not echo raw claim JSON into a public handoff.

Mutating commands are `agent-expand`, `agent-heartbeat`, `agent-rebaseline`, `agent-verify-claim` and `agent-release`; each requires `--claim` and the session-only `--token`. Read their `--help` before use if syntax differs. Heartbeat during long phases. Add zones/files with `agent-expand` and wait for success before editing outside the original list.

If protocol approval is required to add zone coverage, use the existing change-request template and ask the integrator. Do not weaken zone validation or create unmapped product files. Evidence artifacts also need path coverage.

## Predecessor Gate

Before phase N > 01:

1. Inspect actual predecessor diff/files and acceptance IDs, not only the previous final answer.
2. Check that its implementation claim is released and evidence corresponds to the current implementation. Run its focused checks again when overlapping code changed.
3. Perform [reviewer checklist](prompts/reviewer.md). Record whether review is independent or same-session self-review.
4. If blocking findings exist, mark review rejected under a documentation claim, report exact repairs and stop before phase N product edits.
5. If passed, record acceptance and review evidence under a documentation claim, verify/release that claim, then acquire the phase N implementation claim. Do not append review updates after verification of an already released implementation claim.

For phase 01 no predecessor is required; inventory still needs a review before phase 02. Product correctness, data safety, missing required tests, contract drift and unsafe state transitions block advancement. Cosmetic findings may be recorded with explicit owner/disposition but cannot hide broken mobile or accessibility requirements.

## Implementation Cycle

For each slice: write a behavior test, run it and confirm the intended red failure, implement the smallest integrated change, run the test again, inspect diff. A missing dependency or syntax error is not evidence that the behavior test detected the intended bug. Do not modify unrelated dirty files, bulk-format the repository, suppress new lint errors or update snapshots without visual inspection.

Existing large files may receive small integration changes; put new responsibilities in focused modules. Validate untrusted inputs. Pass AbortSignal and dependency clients explicitly. Use the existing logger; new scripts require timestamp/level/step context, color fallback, startup/final summaries and bounded retries.

After any product/tool/config update, rebuild/restart the affected artifact and run its actual primary workflow. Unit/build success alone is insufficient. Do not terminate unrelated user processes; choose an available port for your own process and report it. Stop disposable test processes before handoff; a requested preview service may remain with its URL and ownership recorded.

## Evidence And Release Sequence

1. Run phase-specific tests, required zone checks and primary workflow on the current version. Record command, cwd, time, exit code, counts and actual result.
2. Review the diff for architecture, security, state and requirement coverage. Write phase evidence under `verification/evidence/` using the template. Write a handoff in `docs/agent-coordination/handoffs/` using the repository template.
3. Set phase to `ready_for_review`, include implementation claim ID and handoff path. This means prepared, not a prediction of successful release.
4. Format/check changed files, validate zones, then call `agent-verify-claim` with truthful evidence. Do not edit any repository file after successful verification.
5. Call `agent-release` with the token and verify its success. Report claim release in the final response; the next review claim records accepted/released status in the register.
6. If unrelated concurrent released work invalidates baseline, inspect drift, run `agent-rebaseline`, rerun relevant checks and verify again. Never rebaseline to hide your out-of-scope edits.

## Failure And Resume

Do not claim passing tests when commands could not run. Record environmental/pre-existing failures separately and keep the phase blocked or awaiting review until the required gate is satisfied or the user explicitly changes it.

After a crash or new agent session, no token may be available. Do not guess/recover secrets from storage or create an overlapping claim. Inspect status, follow documented stale-claim recovery or ask the integrator. Resume work from evidence and actual files after ownership is safely established. Never reset the worktree to make resumption easier.

If a defect belongs to an earlier phase, stop and request/perform a scoped repair under the appropriate resumed-phase prompt; do not silently redesign the contract from a downstream phase. Keep completed slices and precise failed tests in the handoff.

## Final Response Per Phase

Report phase/result, owned files, checks actually run, primary workflow result, remaining findings, evidence/handoff links, claim release result and next eligible prompt. Do not say the entire project is complete before user acceptance. Never delete or archive this folder.
