# Copyright Barrier Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task when available. If the executor lacks that skill, follow this document's equivalent sequential red-green-review protocol. Steps use checkbox (`- [ ]`) syntax for tracking. Do not dispatch parallel editors into this dirty workspace without user approval.

**Goal:** Remove all application-owned copyright keyword gates and forced IP substitution while preserving unrelated validation and existing data.

**Architecture:** Delete policy-specific producers and their consumers in dependency order. Preserve existing public workflow entry points; isolate metadata migration from runtime code and retain strict provider error boundaries. Verify behavior through live consumers, not no-op validators.

**Tech Stack:** TypeScript, Node.js, pnpm workspaces, Fastify, React/Vite, Vitest, Playwright, filesystem JSON repositories; existing dependencies only.

**Spec:** [SPEC.md](SPEC.md)

## Global Constraints

- All new and modified repository content must be in English.
- Preserve all pre-existing working-tree changes.
- Do not add production dependencies for this removal project.
- Do not use OS-level mouse, keyboard, clipboard, or focus-stealing automation.
- Do not bypass unrelated validation or external provider restrictions.
- Do not mutate live content or run paid/bulk generation without exact-target approval.
- Run the updated artifact after implementation, not only its build.
- Report evidence and unverified boundaries honestly.

## Dependency order

| Phase                                  | Depends on | Independently reviewable deliverable                      |
| -------------------------------------- | ---------- | --------------------------------------------------------- |
| [P0](phases/00-baseline.md)            | None       | Protected worktree, safe test fixtures, baseline evidence |
| [P1](phases/01-generation-and-qa.md)   | P0         | Generation and QA accept valid named subjects             |
| [P2](phases/02-visual-identity.md)     | P1         | Image/thumbnail prompt identity and cache correctness     |
| [P3](phases/03-provider-errors.md)     | P2         | Accurate provider failures without identity rewrite       |
| [P4](phases/04-data-and-retirement.md) | P1-P3      | Reversible metadata migration and retired policy modules  |
| [P5](phases/05-contracts-and-ui.md)    | P4         | Synchronized API/web/CLI contracts and active docs        |
| [P6](phases/06-integration.md)         | P0-P5      | Integrated verification and acceptance evidence           |

Do not ship an intermediate phase as the final feature. P1 temporarily leaves types/tables used by later phases; they must be gone at final acceptance. Each phase still requires passing targeted tests and a reviewable checkpoint.

## Execution protocol

1. Read current status and the complete phase. Re-read affected current source via CodeGraph before grep/file discovery while `.codegraph/` exists.
2. Reconcile file hashes and dirty changes. Record any plan drift with its reason and updated paths before editing.
3. Add/modify the smallest behavior test. Run it and record the expected assertion failure, not merely an import/compiler error.
4. Apply the focused change. Run that test, relevant protected-behavior tests, and type checks. A missing unrelated prerequisite is not permission to weaken the test.
5. Review the diff for mixed responsibilities, dead exports, unintended policy removal, unsafe I/O, and stale state paths.
6. Record evidence and set the phase to VERIFIED only when its gate passes. Note the next exact action.
7. Make a checkpoint using only task-owned hunks. Do not run `git add .`. A commit is optional and needs user authorization; an unstaged reviewed diff plus evidence is an acceptable checkpoint.

## Baseline and regression policy

Never run the unmodified full suite first: an observed test writes real external storage. P0 must isolate that test and inspect comparable test paths before broad execution. Preserve the original symptom in the evidence ledger; do not describe the resulting safe baseline as an unmodified baseline.

A failing baseline is recorded by command, failing test, expected/actual behavior, and pre-existing ownership. New regression failures must be resolved. Pre-existing failures do not become passes; at handoff explicitly state their effect on acceptance.

## Status and resume contract

Allowed phase states: NOT_STARTED, IN_PROGRESS, VERIFIED, BLOCKED. On interruption, persist exact files changed, last command/result, next command, outstanding decisions, and whether any process or migration transaction remains active in `execution/STATUS.md`.

“Blocked” means a concrete dependency, authority, or conflicting edit prevents safe progress. Continue other safe checks within the phase; do not change scope to make a checkbox green. For live rollout not approved, finish isolated verification and label rollout pending rather than touching production.

## No shortcut acceptance

- No always-false violation functions, empty policy arrays, catch-all success, test skips, `as any`, or hidden fallback flags.
- No broad deletion of every string containing “copyright”, “safe”, “license”, “brand”, or “policy”.
- No migration that approves previously failed content automatically.
- No deletion of user assets or old successful output to force cache freshness.
- No fabricated provider success or new content-filter bypass/failover mechanism.
- No unrelated dependency upgrade, UI redesign, or architecture rewrite.
