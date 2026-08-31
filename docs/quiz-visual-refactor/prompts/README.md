# Codex Task Prompts

Prompts in this directory are the completed launch instructions used for the Quiz Visual Refactor. They reference repository documentation instead of duplicating it. The sequence is closed by `../handoffs/phase-08d-2026-08-31.md`; do not rerun one unless a future roadmap or handoff explicitly reopens it.

Prompt design follows these rules:

- state the outcome and success criteria;
- identify required repository context;
- define scope and side-effect boundaries;
- require evidence and stopping conditions;
- let the coding agent choose local implementation details after inspecting current code.

[Official OpenAI prompting guidance](https://developers.openai.com/api/docs/guides/latest-model#prompting-best-practices)

## Prompt sequence

Status: COMPLETE through 8D. The table records historical dependency order, not currently available work.

| Order | Prompt                      | Dependency        |
| ----- | --------------------------- | ----------------- |
| 1     | `phase-01-codex-prompt.md`  | Dossier ready     |
| 2     | `phase-02-codex-prompt.md`  | Phase 1 COMPLETE  |
| 3     | `phase-03-codex-prompt.md`  | Phase 2 COMPLETE  |
| 4     | `phase-04-codex-prompt.md`  | Phase 3 COMPLETE  |
| 5     | `phase-05-codex-prompt.md`  | Phase 4 COMPLETE  |
| 6     | `phase-06-codex-prompt.md`  | Phase 5 COMPLETE  |
| 7     | `phase-07-codex-prompt.md`  | Phase 6 COMPLETE  |
| 8A    | Already implemented         | Phase 7 COMPLETE  |
| 8B    | `phase-08b-codex-prompt.md` | Phase 8A COMPLETE |
| 8C    | `phase-08c-codex-prompt.md` | Phase 8B COMPLETE |
| 8D    | `phase-08d-codex-prompt.md` | Phase 8C COMPLETE |

If a phase is `PARTIAL`, reuse that same phase prompt with the newest handoff. If it is `BLOCKED`, first resolve the recorded blocker or provide the missing authority, then reuse the same prompt. Do not skip ahead.
