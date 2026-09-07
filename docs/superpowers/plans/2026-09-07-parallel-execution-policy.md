# Parallel Execution Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make safe, beneficial parallel delegation the default for all agents working on this project.

**Architecture:** Keep one provider-neutral policy under coordination documentation and short mandatory references in existing instruction entrypoints. Preserve the current ownership and authenticated lifecycle; do not add tooling or change product behavior.

**Tech Stack:** Markdown, existing Node.js coordination checks, Prettier.

**Spec:** User-approved parallel-first policy recorded in `docs/agent-coordination/parallel-execution-change-request.md`.

## Global Constraints

- Work directly on the current `main` checkout; do not create branches or worktrees.
- Preserve all pre-existing dirty files and unrelated concurrent work.
- Use English-only repository content, concrete planned files, authenticated claims, verified release, and the existing handoff template.
- Use real available delegation capabilities; never promise universal automatic instruction loading.
- Delegate an independent read-only compatibility review while the main agent owns all documentation writes.

## Task 1: Publish And Verify The Policy

**Files:**

- Modify: `AGENTS.md`, `GEMINI.md`, `docs/agent-coordination/README.md`.
- Create: `docs/agent-coordination/parallel-execution-policy.md`.
- Record: this plan, `docs/agent-coordination/parallel-execution-change-request.md`, and `docs/agent-coordination/handoffs/2026-09-07-parallel-execution-policy.md`.
- Expand the claim before linking any additional existing instruction entrypoint identified by review.

**Interfaces:** Existing entrypoints link to one policy; the policy uses current claim/zone commands without changing their contracts.

- [x] Record the approved change request and acquire the documentation claim before writing policy content.
- [x] Define mandatory assessment, default delegation, bounded work packets, exclusive write ownership, dependency ordering, fallback, recovery, and final verification responsibilities.
- [x] Link the policy from existing entrypoints and the coordination README; do not duplicate its full text or invent vendor configuration files.
- [x] Incorporate the independent read-only review and manually walk through independent edits, shared-contract dependencies, same-file edits, tiny tasks, unavailable delegation, and failed workers.
- [x] Run Prettier checks on task files, `git diff --check`, `node --test scripts/test-agent-coordination.mjs scripts/coordination/test/*.test.mjs`, and `node scripts/agent-validate-zones.mjs --json`.
- [x] Write the handoff with actual evidence. Final authenticated verification and release are recorded in the claim registry after the last file edit; do not stage or commit unrelated work.
