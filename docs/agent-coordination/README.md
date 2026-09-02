# Agent Coordination Workspace

This folder is the source of truth for building and operating the Agent Coordination Protocol in this repository.

Use it when work must be split across multiple coding agents, chat windows, models, or tools without relying on one long conversation context.

## What This Solves

The project has several shared contracts and orchestration points. Render work, prompt work, image generation, layout changes, task progress, API DTOs, and shared schemas can affect each other even when they are edited in different files.

This repository uses **main-direct mode** for this protocol: agents edit the current main checkout directly and must not create new branches or worktrees unless the user explicitly changes that rule.

This protocol reduces risk in main-direct mode by requiring each agent to:

- Declare the zone it intends to modify.
- Check whether another active agent already owns that zone.
- Record the dirty workspace baseline before editing.
- Stop before editing outside its claimed scope.
- Produce a handoff summary before the next phase starts.
- Leave enough metadata for cleanup when the work is complete.

## Folder Map

```text
docs/agent-coordination/
  README.md
  master-spec.md
  phase-roadmap.md
  runtime-layout.md
  cleanup-and-archive.md
  handoffs/
    README.md
    phase-5-final-integration-cleanup.md
  archive/
    phase-0-foundation.md ... phase-4-advanced-orchestrator.md
  prompts/
    00-integrator.md
    01-phase-0-foundation.md
    02-phase-1-zone-map.md
    03-phase-2-claim-release.md
    04-phase-3-diff-guard.md
    05-phase-4-advanced-orchestrator.md
    06-phase-5-final-integration-cleanup.md
  templates/
    phase-handoff-summary.md
    claim-record.md
    change-request.md
    integration-report.md
    cleanup-manifest.md
```

## How To Use This Folder

1. Start with `AGENTS.md` and `master-spec.md` to understand the protocol rules and architecture.
2. Use `phase-roadmap.md` to choose the next phase.
3. Check `handoffs/` for the current handoff and `archive/` for completed Phase 0–4 history.
4. Open the matching file in `prompts/`.
5. Paste the whole prompt into a new coding-agent chat.
6. Require that agent to create a handoff summary using `templates/phase-handoff-summary.md`.
7. Give the next agent the phase prompt plus the latest handoff summary.

## Command Lifecycle

Use JSON mode so an agent can capture the one-time lease token without scraping human logs:

```powershell
node scripts/agent-status.mjs --json
node scripts/agent-claim.mjs --agent codex --task "Describe the task" --write web-layout-style --planned-files apps/web/src/components/Example.tsx --json
node scripts/agent-heartbeat.mjs --claim <claim-id> --token <lease-token> --json
node scripts/agent-expand.mjs --claim <claim-id> --token <lease-token> --add-write web-api-state --add-planned-files apps/web/src/api/exampleApi.ts --json
node scripts/agent-verify-claim.mjs --claim <claim-id> --token <lease-token> --evidence "pnpm test: passed; pnpm typecheck: passed" --json
node scripts/agent-release.mjs --claim <claim-id> --token <lease-token> --json
node scripts/agent-status.mjs --integrator --json
```

- `planned-files` accepts concrete repository-relative paths only. Wildcards are rejected; omitting paths claims the whole zone.
- Keep the raw lease token only in the current process or agent session. SQLite stores only its SHA-256 hash, and status/history/queue output never returns it.
- Every mutation requires the token. Verification requires non-empty evidence, and any later repository change makes that evidence stale.
- Do not edit after verification and do not commit while the claim is active. Release first, then stage only the task-owned files.
- Run `node scripts/agent-validate-zones.mjs --json` when product paths or zone definitions change.

## Canonical Rule

Chat history is not the source of truth. The repo artifacts are.

If an agent needs to change the protocol, it must write a change request using `templates/change-request.md` and wait for integrator approval before changing the phase scope.

The CLI cannot impose operating-system ACLs on an unrestricted agent. Safe operation depends on agents following these instructions and on integrators refusing active, unverified, stale, unmapped, or overlapping work.

## Recommended Start

For this repository, start with:

- Phase 0: Foundation and operating rules.
- Phase 1: Zone map.
- Phase 2: Lightweight claim and release.

Only add Phase 3 and Phase 4 after the lightweight version proves useful.

## Main-Direct Mode Caution

Because agents work on the same main checkout, zone claims and baseline snapshots are mandatory. An agent must not edit a pre-existing dirty file unless that file is inside its claimed scope and the handoff explains why the edit was necessary.
