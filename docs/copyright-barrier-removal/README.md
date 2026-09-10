# Copyright Barrier Removal Handoff

Status: planning package only. No application changes or data migrations have been executed.

Prepared: 2026-09-10. Target: the current working tree of AI Quiz Studio, not a clean copy of HEAD.

## Objective

Remove application-owned copyright/trademark keyword rejection, forced subject substitution, and associated enforcement structures throughout the system. The owner states that the relevant content is authorized. Preserve unrelated validation, security, factual quality, provenance, and accurate provider errors.

This is a removal project, not a disabled-policy feature. Do not add an allowlist, bypass flag, rights-confirmation gate, or always-success validator.

## Required reading order

1. Repository `AGENTS.md`, `GEMINI.md`, and the user's current instructions.
2. [SPEC.md](SPEC.md): scope, decisions, invariants, and acceptance requirements.
3. [INVENTORY.md](INVENTORY.md): observed ownership and exact target files.
4. [EXECUTION_PLAN.md](EXECUTION_PLAN.md): ordered phases and review gates.
5. [TEST_MATRIX.md](TEST_MATRIX.md): positive, negative, migration, and asynchronous cases.
6. [DATA_RUNBOOK.md](DATA_RUNBOOK.md): migration, cache, historical results, and rollback.
7. [ACCEPTANCE.md](ACCEPTANCE.md): evidence required before completion.
8. [execution/STATUS.md](execution/STATUS.md) and [execution/EVIDENCE.md](execution/EVIDENCE.md): resumable progress and evidence.

Read a phase file completely before executing that phase. Do not treat the README or startup prompt as a substitute for the full plan.

## Package map

| Location                           | Responsibility                                              |
| ---------------------------------- | ----------------------------------------------------------- |
| `SPEC.md`                          | Authoritative intended behavior and protected behavior      |
| `INVENTORY.md`                     | Removal, modification, inspection, and preservation targets |
| `EXECUTION_PLAN.md`                | Phase dependencies and execution protocol                   |
| `phases/00-baseline.md`            | Protect dirty work and isolate unsafe tests                 |
| `phases/01-generation-and-qa.md`   | Prompt rules and content gates                              |
| `phases/02-visual-identity.md`     | Image/thumbnail identity preservation and cache versions    |
| `phases/03-provider-errors.md`     | Stop automatic identity-changing rejection recovery         |
| `phases/04-data-and-retirement.md` | Metadata migration and dead module retirement               |
| `phases/05-contracts-and-ui.md`    | API consumers, web copy, and CLI output                     |
| `phases/06-integration.md`         | End-to-end verification and residual audit                  |
| `TEST_MATRIX.md`                   | Requirement-to-test mapping                                 |
| `DATA_RUNBOOK.md`                  | Safe persistent-data execution and rollback                 |
| `ACCEPTANCE.md`                    | Final sign-off checklist                                    |
| `execution/planning-baseline.json` | Planning-time Git status, file hashes, and search inventory |
| `execution/STATUS.md`              | Phase state and next exact action                           |
| `execution/EVIDENCE.md`            | Commands, outcomes, artifacts, and deviations               |
| `START_ANTIGRAVITY.md`             | Copyable execution prompt                                   |

## Important limits

- Source locations and hashes are a planning snapshot, not permission to overwrite newer edits. Reconcile drift before editing.
- The existing worktree has substantial uncommitted work, including changes in affected files. Never reset, clean, stash, or replace it wholesale.
- Unit/integration verification must not write to real channel storage or call paid providers.
- Migration rehearsal on copied fixtures is mandatory. Applying to live storage, restarting another user's process, paid generation, and bulk regeneration need separate approval of exact targets and impact.
- External provider restrictions are not controlled by this application. This project must not promise their removal or implement provider-filter evasion.
- Keep all new repository artifacts in English. Chat updates may be in Vietnamese.

The user has requested an Antigravity handoff. Do not start implementing merely because this package exists; implementation starts when the user supplies its startup prompt to the executor.
