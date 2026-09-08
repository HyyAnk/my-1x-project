# Antigravity Bank-Topic Upgrade Handoff

Prepared on 2026-09-08. This is an implementation transfer, not a completion certificate.

## Start here

Paste [the master prompt](prompts/00-master-prompt.md) into Antigravity. Work in the existing repository at `D:\1a Cursor Project\My 1x Project`; this folder is not a standalone source checkout.

Read [current status](01-current-status.md), [architecture](02-architecture-and-contracts.md), then execute the numbered work files in order. Each work file has a matching copy-ready prompt.

| Work                                                                             | Prompt                       | Gate                                    |
| -------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------- |
| [Stage 2B repair and migration](03-stage-2b-repair-and-migration.md)             | [01](prompts/01-stage-2b.md) | Review clean, safe migration evidence   |
| [Stage 3 source-backed Topics](04-stage-3-source-backed-topics.md)               | [02](prompts/02-stage-3.md)  | Exact persisted English source bindings |
| [Stage 4 confirmation/localization](05-stage-4-confirmation-and-localization.md) | [03](prompts/03-stage-4.md)  | Safe replay, product-only translations  |
| [Stage 5 live availability/UI](06-stage-5-live-availability-ui.md)               | [04](prompts/04-stage-5.md)  | No-refresh consistency                  |
| [Stage 6 acceptance](07-stage-6-acceptance.md)                                   | [05](prompts/05-stage-6.md)  | Integrated evidence and released claims |

Stage 1 and Stage 2A are already completed; do not rebuild them from scratch. Stage 2B is implemented but rejected by review. Stages 3-6 remain unfinished.

Detailed prior references: [design](../bank-topic-upgrade/design.md), [original detailed plan](../bank-topic-upgrade/implementation-plan.md), [audit](../bank-topic-upgrade/stage-01-audit.md), [Stage 2A handoff](../agent-coordination/handoffs/bank-topic-upgrade-stage-02.md), [Stage 2B handoff](../agent-coordination/handoffs/bank-topic-upgrade-stage-02b.md).

This transfer supersedes earlier execution-owner instructions: Antigravity now executes and coordinates the remaining work. The user will return the result to Codex for independent inspection and fixes. Historical claims, test counts and timestamps are evidence snapshots, not current authority. Recheck them.

Use [the return checklist](08-return-to-codex.md) for the final delivery.

## Execution environment

Use the user's configured Antigravity model and available native tools. This package requires no specific model, Codex subagent API, or Codex session. Model assignments in historical linked plans are not requirements for Antigravity. If delegation is unavailable, execute the stages sequentially with the same verification gates.
