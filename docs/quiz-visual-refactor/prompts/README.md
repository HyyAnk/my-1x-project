# Codex Task Prompts

Prompts in this directory are short launch instructions for a fresh Codex task. They reference repository documentation instead of duplicating it. Run them sequentially using `../operator-runbook.md`.

Prompt design follows these rules:

- state the outcome and success criteria;
- identify required repository context;
- define scope and side-effect boundaries;
- require evidence and stopping conditions;
- let the coding agent choose local implementation details after inspecting current code.

[Official OpenAI prompting guidance](https://developers.openai.com/api/docs/guides/latest-model#prompting-best-practices)

## Prompt sequence

| Order | Prompt                     | Dependency       |
| ----- | -------------------------- | ---------------- |
| 1     | `phase-01-codex-prompt.md` | Dossier ready    |
| 2     | `phase-02-codex-prompt.md` | Phase 1 COMPLETE |
| 3     | `phase-03-codex-prompt.md` | Phase 2 COMPLETE |
| 4     | `phase-04-codex-prompt.md` | Phase 3 COMPLETE |
| 5     | `phase-05-codex-prompt.md` | Phase 4 COMPLETE |
| 6     | `phase-06-codex-prompt.md` | Phase 5 COMPLETE |
| 7     | `phase-07-codex-prompt.md` | Phase 6 COMPLETE |

If a phase is `PARTIAL`, reuse that same phase prompt with the newest handoff. If it is `BLOCKED`, first resolve the recorded blocker or provide the missing authority, then reuse the same prompt. Do not skip ahead.
