# Short-Reel Implementation Workspace

This is the portable execution kit for Codex, Antigravity, or another repository-capable coding agent. No chat history, vendor-specific delegation feature, external concept file, or remembered lease token is required to understand the work.

**Current state:** Documentation prepared. Product phases 01-08 have not been executed by this kit. Start with [progress](progress.md), not an assumption that an earlier conversation implemented anything.

## User Workflow

1. Open the prompt for the next eligible phase below and paste its entire contents into an agent with access to this repository.
2. The agent verifies the predecessor, executes only that phase, records evidence and hands off. It must not automatically start the next phase.
3. Use a fresh agent for the next phase when possible. Its first responsibility is reviewing the previous phase against evidence and current code.
4. Use [reviewer](prompts/reviewer.md) for a dedicated review or [resume](prompts/resume.md) after interruption. Neither requires manually filling in an agent name or phase number.
5. You personally accept the finished product after Phase 08 and manual Flow checks. Only you delete this folder when satisfied. Agents must never delete or auto-archive it.

| Phase | Paste This Prompt                                        | Detailed Work                                |
| ----- | -------------------------------------------------------- | -------------------------------------------- |
| 01    | [Portrait inventory](prompts/01-portrait-inventory.md)   | [Phase 01](phases/01-portrait-inventory.md)  |
| 02    | [Contracts and storage](prompts/02-contracts-storage.md) | [Phase 02](phases/02-contracts-storage.md)   |
| 03    | [Topics and selection](prompts/03-topics-selection.md)   | [Phase 03](phases/03-topics-selection.md)    |
| 04    | [Script generation](prompts/04-script-generation.md)     | [Phase 04](phases/04-script-generation.md)   |
| 05    | [Assets and export](prompts/05-assets-export.md)         | [Phase 05](phases/05-assets-export.md)       |
| 06    | [Studio integration](prompts/06-studio-integration.md)   | [Phase 06](phases/06-studio-integration.md)  |
| 07    | [Portrait retirement](prompts/07-portrait-retirement.md) | [Phase 07](phases/07-portrait-retirement.md) |
| 08    | [Final acceptance](prompts/08-final-acceptance.md)       | [Phase 08](phases/08-final-acceptance.md)    |

## Required Reading Order

Read repository `AGENTS.md`, applicable nested instructions and the existing coordination source documents first. Then read this README, [agent runbook](agent-runbook.md), [specification](specification.md), [architecture](architecture.md), [contracts](contracts.md), [roadmap](roadmap.md), [progress](progress.md), [decisions](decisions.md), the assigned phase and its named verification sections. Read the latest relevant Short-Reel handoff and the newest repository handoff for concurrent changes.

## Sources Of Truth

- Repository safety and coordination: `AGENTS.md` and `docs/agent-coordination/`. This folder is not a replacement claim registry.
- Product requirements: [specification](specification.md); public boundaries: [contracts](contracts.md).
- Implementation order: [roadmap](roadmap.md); execution facts: [progress](progress.md) with linked evidence and registry release records.
- Actual code wins for locating existing functions. Proposed file paths in [file map](file-map.md) are not claims that those modules already exist.
- This kit refines and supersedes conflicting execution details in `docs/superpowers/plans/2026-09-07-short-reel-workbench.md`. The external initial concept is historical context only: its no-text, single-prompt and immediate-upload assumptions do not apply.
- Agent reports alone are not completion evidence. Do not rewrite requirements to make failing code appear compliant.

## Folder Map

```text
short-reel-implementation/
  specification.md, architecture.md, contracts.md
  roadmap.md, progress.md, decisions.md
  agent-runbook.md, file-map.md, cleanup-policy.md
  phases/                 phase-specific tasks and stop conditions
  prompts/                eight phase prompts, review and resume
  inventory/              removal scope and generated-data safety
  verification/           acceptance IDs, tests, manual checks, evidence
  templates/              evidence and review record formats
```

No source-code/runtime dependency may point into this temporary folder. Tests, fixtures and durable product contracts belong in their normal repository locations.
