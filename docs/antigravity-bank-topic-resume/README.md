# Bank-Topic Repair Resume Package

Prepared 2026-09-09 after independent review and partial repairs. Overall upgrade is NOT accepted.

Start with [master prompt](prompts/00-master.md). This package supersedes the old handoff's completion/ownership statements. Execute in the existing repository, not a fresh checkout: `D:\1a Cursor Project\My 1x Project`.

| Order | Work file                                                      | Copy-ready prompt                          |
| ----- | -------------------------------------------------------------- | ------------------------------------------ |
| 0     | [Current status and claim recovery](01-status-and-recovery.md) | [Master](prompts/00-master.md)             |
| 1     | [Bank/storage repairs](02-bank-storage.md)                     | [Bank](prompts/01-bank.md)                 |
| 2     | [Episode confirmation](03-episode-confirmation.md)             | [Episode](prompts/02-episode.md)           |
| 3     | [Short-Reel localization](04-short-reel-localization.md)       | [Short-Reel](prompts/03-short-reel.md)     |
| 4     | [Topic availability/run UI](05-topic-availability.md)          | [Availability](prompts/04-availability.md) |
| 5     | [Integrated verification and return](06-final-verification.md) | [Acceptance](prompts/05-acceptance.md)     |

Use the model configured by the user in Antigravity and its available tools. No specific model, Codex subagent API or delegation capability is required.

Binding language architecture: English-only Bank, source, Topic, narrative/script, visual directions, model/image instructions and management UI. Localize only displayed quiz text (question, choices, reveal, explanation), video description, and thumbnail in-image text. Preserve IDs/correctness/source hashes. Base target codes only; reject Vietnamese/unknown targets before provider calls. Never write translations back to Bank.

Read the detailed [architecture](../antigravity-bank-topic-handoff/02-architecture-and-contracts.md) and [design](../bank-topic-upgrade/design.md). This folder is a repair delta: preserve accepted earlier code and all concurrent refactors.

No live migration rerun, source text rewrite, paid provider call, publication, Flow automation, branch/worktree/commit/push or unrelated cleanup. Use isolated storage/provider doubles for tests.
