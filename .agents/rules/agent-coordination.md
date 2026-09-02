---
trigger: always_on
---

# Mandatory Agent Coordination Protocol

This repository uses a mandatory cooperative zone-ownership and authenticated lease protocol. Before performing any operation that creates, edits, deletes, renames, formats, generates, or commits files, read and obey:
@../../AGENTS.md
@../../docs/agent-coordination/README.md
@../../docs/agent-coordination/master-spec.md
@../../docs/agent-coordination/phase-roadmap.md

Repository artifacts are the source of truth. Chat history is not the source of truth.

## Mandatory startup

1. Work from the repository root and directly on the current main checkout.
2. Do not create a branch or worktree unless the user explicitly requests it.
3. Read the latest handoff summary in `docs/agent-coordination/handoffs/`.
4. Capture the pre-existing dirty workspace baseline with: `git status --porcelain`
5. Check active ownership before editing: `node scripts/agent-status.mjs --json`
6. Determine the exact zones and concrete files affected by the task.
7. Acquire a claim before editing by running `node scripts/agent-claim.mjs` with:
   - a unique agent identifier
   - the required zone
   - concrete planned files
   - JSON output
8. Keep the one-time lease token only in session memory. Never write it to a file, log, handoff, commit, or chat response.

## Ownership rules

- Do not modify any file before the required claim succeeds.
- Do not modify files outside the active claim.
- Wildcards are forbidden in planned files.
- If another active claim overlaps the required zone or files, stop without making changes and report the conflict.
- Never touch, revert, stage, format, or commit pre-existing dirty files outside the assigned scope.
- High-risk shared zones require exclusive ownership.
- If additional files or zones become necessary, run the authenticated claim expansion command and wait for success before touching them.
- If expansion is denied, stop and report the blocker.
- Keep the claim alive with an authenticated heartbeat during long-running work.

## Completion rules

1. Run all relevant tests, formatting, type checks, builds, zone validation, and the updated primary workflow.
2. Create the required phase/task handoff summary using the repository template.
3. Verify the claim with: `node scripts/agent-verify-claim.mjs`
   Include non-empty evidence describing the commands and results.
4. Do not edit any file after successful claim verification.
5. Release the verified claim with: `node scripts/agent-release.mjs`
6. Do not commit while an implementation claim is active.
7. Before committing, confirm integrator status with: `node scripts/agent-status.mjs --integrator --json`
8. Stage and commit only files owned by the completed task.

If the coordination commands fail, the ownership scope is uncertain, or required expansion cannot be acquired, do not proceed with repository mutations. Report the blocker instead.
